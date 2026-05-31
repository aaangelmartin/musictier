// iTunes Search access straight from the browser (no backend, no login). The API
// supports CORS (it reflects the request Origin), so a plain fetch works
// everywhere, including mobile Safari. We pool an artist search (for full
// discographies), an album-by-term search, and a song search (to resolve albums
// that album-term misses), then rank the pool by relevance to the query.

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

// Token-coverage relevance: how many query words appear in "name + artist".
// Handles album-only, artist-only, and mixed "album artist" queries. Exact
// album/artist matches get a bonus so they outrank incidental mentions.
function relevance(row: ItunesRow, tokens: string[], full: string): number {
  const name = norm(row.collectionName ?? '')
  const artist = norm(row.artistName ?? '')
  const hay = `${name} ${artist}`
  const matched = tokens.filter((t) => hay.includes(t)).length
  let s = tokens.length ? (matched / tokens.length) * 100 : 0
  if (name === full) s += 60
  else if (name.length >= 3 && full.includes(name)) s += 30
  if (artist === full) s += 40
  else if (artist.length >= 3 && full.includes(artist)) s += 20
  return s
}

export async function clientSearch(term: string, country = 'es') {
  const enc = encodeURIComponent(term)
  const c = `country=${country}`
  // album-by-term often misses an album (e.g. "el odio siempre gana lhaine" ->
  // 0). A song search resolves the album via its tracks, and an artist search
  // pulls full discographies. We pool all three and rank by relevance.
  const [artists, byTerm, songs] = await Promise.all([
    get(`search?term=${enc}&entity=musicArtist&limit=3&${c}`),
    get(`search?term=${enc}&entity=album&media=music&limit=50&${c}`),
    get(`search?term=${enc}&entity=song&limit=25&${c}`),
  ])

  const artistIds = artists.map((a) => a.artistId).filter(Boolean) as number[]
  const discographies = await Promise.all(
    artistIds.map((id) =>
      get(`lookup?id=${id}&entity=album&limit=100&${c}`).catch(() => []),
    ),
  )

  // song rows carry their album's collection fields, so they normalize like albums
  const merged: ItunesRow[] = [
    ...discographies.flat().filter((r) => r.wrapperType === 'collection'),
    ...byTerm.filter((r) => r.collectionId),
    ...songs.filter((r) => r.collectionId),
  ]
  const seen = new Set<number>()
  const results = merged.filter((r) => {
    if (!r.collectionId || seen.has(r.collectionId)) return false
    seen.add(r.collectionId)
    return true
  })

  // stable sort by relevance to the query
  const full = norm(term)
  const tokens = full.split(' ').filter((t) => t.length >= 2)
  results
    .map((r, i) => ({ r, i, s: relevance(r, tokens, full) }))
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
