// Framework-agnostic API handlers shared by the Cloudflare Pages Functions
// (production) and the Vite dev plugin (local). Everything is plain Web Fetch
// API (URL / Request / Response) so it runs unchanged in both environments.
//
// Two endpoints:
//   /api/catalog?op=search&term=...        -> album search
//   /api/catalog?op=album&id=<source>:<id> -> album + tracks + artist
//   /api/artwork?url=<mzstatic url>         -> image proxy (avoids canvas taint on export)
//
// Album ids are tagged with their source ("itunes:123" / "apple:123") so a shared
// /a/:id link resolves to the right backend regardless of server config.

import { type AppleEnv, hasAppleCreds, getDeveloperToken } from './jwt'

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'public, max-age=300',
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS })
}

function defaultSource(env: AppleEnv): 'apple' | 'itunes' {
  return hasAppleCreds(env) ? 'apple' : 'itunes'
}

// --- iTunes Search API (no auth) -------------------------------------------

interface ItunesRow {
  wrapperType?: string
  collectionId?: number
  collectionName?: string
  artistName?: string
  artistId?: number
  [k: string]: unknown
}

async function itunesGet(path: string): Promise<ItunesRow[]> {
  const res = await fetch(`https://itunes.apple.com/${path}`)
  if (!res.ok) throw new Error(`itunes ${res.status}`)
  const json = (await res.json()) as { results?: ItunesRow[] }
  return json.results ?? []
}

const DIACRITICS = /[̀-ͯ]/g
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(/\s*-\s*(single|ep)\s*$/i, '')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// rank so an album whose title matches the query beats an artist's other albums
function relevance(row: ItunesRow, q: string): number {
  const name = norm(row.collectionName ?? '')
  const artist = norm(row.artistName ?? '')
  let s = 0
  if (name === q) s += 100
  else if (name.startsWith(q)) s += 55
  else if (name.includes(q)) s += 40
  // exact artist match (artist query) must beat an incidental title mention
  if (artist === q) s += 70
  else if (artist.includes(q)) s += 25
  return s
}

// Album-by-term search alone misses an artist's albums (it surfaces singles and
// is relevance-weak). So we resolve the artist and pull their full discography
// (the only way albums reliably appear), then append term-matched albums. The
// client filters singles afterwards.
async function itunesSearch(term: string, country: string): Promise<unknown> {
  const enc = encodeURIComponent(term)
  const c = `country=${country}`

  const [artists, byTerm] = await Promise.all([
    itunesGet(`search?term=${enc}&entity=musicArtist&limit=3&${c}`),
    itunesGet(`search?term=${enc}&entity=album&media=music&limit=50&${c}`),
  ])

  const artistIds = artists.map((a) => a.artistId).filter(Boolean) as number[]
  const discographies = await Promise.all(
    artistIds.map((id) =>
      itunesGet(`lookup?id=${id}&entity=album&limit=100&${c}`).catch(() => []),
    ),
  )

  // discography collections first (the real albums), then term matches
  const merged: ItunesRow[] = [
    ...discographies.flat().filter((r) => r.wrapperType === 'collection'),
    ...byTerm.filter((r) => r.collectionId),
  ]

  const seen = new Set<number>()
  const results = merged.filter((r) => {
    if (!r.collectionId || seen.has(r.collectionId)) return false
    seen.add(r.collectionId)
    return true
  })

  // stable sort by relevance to the query (album-title matches rise to the top)
  const q = norm(term)
  results
    .map((r, i) => ({ r, i, s: relevance(r, q) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .forEach((x, i) => (results[i] = x.r))

  return { resultCount: results.length, results }
}

async function itunesAlbum(id: string, country: string): Promise<unknown> {
  const res = await fetch(
    `https://itunes.apple.com/lookup?id=${encodeURIComponent(
      id,
    )}&entity=song&limit=200&country=${country}`,
  )
  if (!res.ok) throw new Error(`itunes lookup ${res.status}`)
  return res.json()
}

// --- Apple Music API (developer token) -------------------------------------

function storefront(url: URL): string {
  return (url.searchParams.get('sf') || 'es').toLowerCase()
}

async function appleSearch(term: string, sf: string, token: string): Promise<unknown> {
  const url = `https://api.music.apple.com/v1/catalog/${sf}/search?term=${encodeURIComponent(
    term,
  )}&types=albums&limit=25`
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`apple search ${res.status}`)
  return res.json()
}

async function appleAlbum(id: string, sf: string, token: string): Promise<unknown> {
  const url = `https://api.music.apple.com/v1/catalog/${sf}/albums/${encodeURIComponent(
    id,
  )}?include=tracks,artists`
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`apple album ${res.status}`)
  return res.json()
}

// --- catalog dispatcher -----------------------------------------------------

async function handleCatalog(url: URL, env: AppleEnv, now: number): Promise<Response> {
  const op = url.searchParams.get('op')

  if (op === 'search') {
    const term = url.searchParams.get('term')?.trim()
    if (!term) return json({ error: 'missing term' }, 400)
    const source = defaultSource(env)
    if (source === 'apple') {
      const token = await getDeveloperToken(env, now)
      const data = await appleSearch(term, storefront(url), token)
      return json({ source, data })
    }
    return json({ source, data: await itunesSearch(term, storefront(url)) })
  }

  if (op === 'album') {
    const tagged = url.searchParams.get('id')
    if (!tagged) return json({ error: 'missing id' }, 400)
    const [source, rawId] = tagged.includes(':')
      ? (tagged.split(/:(.+)/) as [string, string])
      : ([defaultSource(env), tagged] as ['apple' | 'itunes', string])

    if (source === 'apple') {
      if (!hasAppleCreds(env)) return json({ error: 'apple not configured' }, 400)
      const token = await getDeveloperToken(env, now)
      const data = await appleAlbum(rawId, storefront(url), token)
      return json({ source, data })
    }
    return json({ source: 'itunes', data: await itunesAlbum(rawId, storefront(url)) })
  }

  return json({ error: 'unknown op' }, 400)
}

// --- artwork proxy ----------------------------------------------------------

const ARTWORK_HOSTS = /(^|\.)mzstatic\.com$/

async function handleArtwork(url: URL): Promise<Response> {
  const target = url.searchParams.get('url')
  if (!target) return new Response('missing url', { status: 400 })
  let parsed: URL
  try {
    parsed = new URL(target)
  } catch {
    return new Response('bad url', { status: 400 })
  }
  if (parsed.protocol !== 'https:' || !ARTWORK_HOSTS.test(parsed.hostname)) {
    return new Response('host not allowed', { status: 403 })
  }
  const upstream = await fetch(parsed.toString())
  if (!upstream.ok) return new Response('upstream error', { status: 502 })
  return new Response(upstream.body, {
    status: 200,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'image/jpeg',
      'cache-control': 'public, max-age=86400',
      'access-control-allow-origin': '*',
    },
  })
}

// --- entry point ------------------------------------------------------------

export async function handleApi(url: URL, env: AppleEnv, now: number): Promise<Response> {
  try {
    if (url.pathname === '/api/catalog') return await handleCatalog(url, env, now)
    if (url.pathname === '/api/artwork') return await handleArtwork(url)
    return json({ error: 'not found' }, 404)
  } catch (err) {
    return json({ error: String(err instanceof Error ? err.message : err) }, 502)
  }
}
