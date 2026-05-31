// Backend-free iTunes access for static hosting (e.g. GitHub Pages), where our
// /api proxy does not run. The iTunes Search API supports CORS (it reflects the
// request Origin), so a plain fetch works from the browser, including mobile
// Safari (JSONP failed there because of strict script MIME checking). Mirrors the
// artist-discography logic in functions/_shared/handlers.ts so results match.

interface ItunesRow {
  wrapperType?: string
  collectionId?: number
  artistId?: number
  [k: string]: unknown
}

async function get(path: string): Promise<ItunesRow[]> {
  const res = await fetch(`https://itunes.apple.com/${path}`)
  if (!res.ok) throw new Error(`itunes ${res.status}`)
  const data = (await res.json()) as { results?: ItunesRow[] }
  return data.results ?? []
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
