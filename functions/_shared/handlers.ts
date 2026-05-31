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

async function itunesSearch(term: string): Promise<unknown> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
    term,
  )}&entity=album&media=music&limit=25`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`itunes search ${res.status}`)
  return res.json()
}

async function itunesAlbum(id: string): Promise<unknown> {
  const url = `https://itunes.apple.com/lookup?id=${encodeURIComponent(
    id,
  )}&entity=song&limit=200`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`itunes lookup ${res.status}`)
  return res.json()
}

// --- Apple Music API (developer token) -------------------------------------

function storefront(url: URL): string {
  return (url.searchParams.get('sf') || 'us').toLowerCase()
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
    return json({ source, data: await itunesSearch(term) })
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
    return json({ source: 'itunes', data: await itunesAlbum(rawId) })
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
