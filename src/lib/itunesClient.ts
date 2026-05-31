// Backend-free iTunes access for static hosting (e.g. GitHub Pages), where our
// /api proxy does not run. The iTunes Search API supports CORS (it reflects the
// request Origin), so a plain fetch works from the browser, including mobile
// Safari (JSONP failed there because of strict script MIME checking). Mirrors the
// artist-discography logic in functions/_shared/handlers.ts so results match.

interface ItunesRow {
  wrapperType?: string
  collectionId?: number
  collectionName?: string
  artistName?: string
  artistId?: number
  [k: string]: unknown
}

async function get(path: string): Promise<ItunesRow[]> {
  const res = await fetch(`https://itunes.apple.com/${path}`)
  if (!res.ok) throw new Error(`itunes ${res.status}`)
  const data = (await res.json()) as { results?: ItunesRow[] }
  return data.results ?? []
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

// rank so an album whose title matches the query beats an artist's other
// albums: fixes album-name searches being treated as artist searches
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

export async function clientSearch(term: string, country = 'es') {
  const enc = encodeURIComponent(term)
  const c = `country=${country}`
  const [artists, byTerm] = await Promise.all([
    get(`search?term=${enc}&entity=musicArtist&limit=3&${c}`),
    get(`search?term=${enc}&entity=album&media=music&limit=50&${c}`),
  ])

  const artistIds = artists.map((a) => a.artistId).filter(Boolean) as number[]
  const discographies = await Promise.all(
    artistIds.map((id) =>
      get(`lookup?id=${id}&entity=album&limit=100&${c}`).catch(() => []),
    ),
  )

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

export async function clientAlbum(taggedId: string, country = 'es') {
  const raw = taggedId.includes(':') ? taggedId.split(/:(.+)/)[1] : taggedId
  const res = await fetch(
    `https://itunes.apple.com/lookup?id=${encodeURIComponent(
      raw,
    )}&entity=song&limit=200&country=${country}`,
  )
  if (!res.ok) throw new Error(`itunes ${res.status}`)
  return res.json()
}
