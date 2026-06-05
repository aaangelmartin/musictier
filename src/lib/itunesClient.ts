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

// In-memory cache + retry. iTunes rate-limits bursts and then returns errors
// without CORS headers, which the browser surfaces as a "Load failed" fetch
// rejection. Caching dedupes repeats; a couple of spaced retries ride out a
// transient throttle so opening an album does not fail.
const cache = new Map<string, Promise<unknown>>()

function fetchJson(path: string): Promise<unknown> {
  const url = `https://itunes.apple.com/${path}`
  const hit = cache.get(url)
  if (hit) return hit
  const run = (async () => {
    let lastErr: unknown
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(url)
        if (res.ok) return await res.json()
        lastErr = new Error(`itunes ${res.status}`)
      } catch (e) {
        lastErr = e
      }
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
    }
    throw lastErr
  })()
  cache.set(url, run)
  run.catch(() => cache.delete(url)) // never cache a failure
  return run
}

async function get(path: string): Promise<ItunesRow[]> {
  const data = (await fetchJson(path)) as { results?: ItunesRow[] }
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

// Does the row's "name + artist" contain every query word? A fully-covered top
// hit means the plain search already nailed it; a miss is the signal to escalate.
function coversAllTokens(row: ItunesRow | undefined, tokens: string[]): boolean {
  if (!row) return false
  const hay = `${norm(row.collectionName ?? '')} ${norm(row.artistName ?? '')}`
  return tokens.every((t) => hay.includes(t))
}

// Pool discographies + album-term + song rows, dedupe by collectionId (collection
// rows first, so the rich album row wins over a thinner song row for the same id),
// and stable-sort by relevance to the query.
function poolAndRank(
  discographies: ItunesRow[][],
  byTerm: ItunesRow[],
  songs: ItunesRow[],
  tokens: string[],
  full: string,
): ItunesRow[] {
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
  results
    .map((r, i) => ({ r, i, s: relevance(r, tokens, full) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .forEach((x, i) => (results[i] = x.r))
  return results
}

// Prefixes and suffixes of the query (up to 2 words) — the artist name in a mixed
// "album artist" / "artist album" query sits at one end of the phrase.
function subPhrases(tokens: string[]): string[] {
  const n = tokens.length
  const max = Math.min(2, n - 1)
  const out: string[] = []
  for (let len = 1; len <= max; len++) {
    out.push(tokens.slice(0, len).join(' ')) // prefix
    out.push(tokens.slice(n - len).join(' ')) // suffix
  }
  return [...new Set(out)]
}

// Distinct artist ids from sub-phrase searches, with artists whose name exactly
// matches the phrase that found them first, so the right discography is fetched
// before the cap fills up with fuzzy near-misses.
function rankedArtistIds(
  sets: { phrase: string; rows: ItunesRow[] }[],
  cap: number,
): number[] {
  const exact: number[] = []
  const fuzzy: number[] = []
  for (const { phrase, rows } of sets) {
    for (const r of rows) {
      if (!r.artistId) continue
      ;(norm(r.artistName ?? '') === phrase ? exact : fuzzy).push(r.artistId)
    }
  }
  const out: number[] = []
  for (const id of [...exact, ...fuzzy]) {
    if (!out.includes(id)) out.push(id)
    if (out.length >= cap) break
  }
  return out
}

export async function clientSearch(term: string, country = 'es') {
  const enc = encodeURIComponent(term)
  const c = `country=${country}`
  const full = norm(term)
  const tokens = full.split(' ').filter((t) => t.length >= 2)

  // album-by-term often misses an album (e.g. "el odio siempre gana lhaine" ->
  // 0). A song search resolves the album via its tracks, and an artist search
  // pulls full discographies. We pool all three and rank by relevance.
  const [artists, byTerm, songs] = await Promise.all([
    get(`search?term=${enc}&entity=musicArtist&limit=5&${c}`),
    get(`search?term=${enc}&entity=album&media=music&limit=25&${c}`),
    get(`search?term=${enc}&entity=song&limit=15&${c}`),
  ])
  // every artist row we see across the term + escalation searches, for the
  // "artists named X" listing; deduped by id at the end.
  const artistRows: ItunesRow[] = [...artists]

  const fetchedIds = new Set<number>()
  const discographies: ItunesRow[][] = []
  async function addDiscographies(ids: number[]) {
    const fresh = ids.filter((id) => !fetchedIds.has(id))
    fresh.forEach((id) => fetchedIds.add(id))
    const discs = await Promise.all(
      fresh.map((id) =>
        get(`lookup?id=${id}&entity=album&limit=100&${c}`).catch(() => []),
      ),
    )
    discographies.push(...discs)
  }

  // the top artist's discography, to keep the common-case request count low
  const topId = artists.map((a) => a.artistId).filter(Boolean)[0] as number | undefined
  if (topId) await addDiscographies([topId])

  let results = poolAndRank(discographies, byTerm, songs, tokens, full)

  // Escalation: a multi-word query whose best hit still misses some words is
  // likely a mixed "album artist" query (e.g. "BELLA VISTA UGLY" — album "BELLA
  // VISTA" by artist "UGLY"), which iTunes can't match as a single term. Search
  // the artist by sub-phrases of the query, pull those discographies, and re-rank.
  // This extra fan-out only fires when the plain search fell short.
  if (tokens.length >= 2 && !coversAllTokens(results[0], tokens)) {
    const sets = await Promise.all(
      subPhrases(tokens).map(async (phrase) => ({
        phrase,
        rows: await get(
          `search?term=${encodeURIComponent(phrase)}&entity=musicArtist&limit=3&${c}`,
        ),
      })),
    )
    sets.forEach((s) => artistRows.push(...s.rows))
    await addDiscographies(rankedArtistIds(sets, 3))
    results = poolAndRank(discographies, byTerm, songs, tokens, full)
  }

  const seenArtist = new Set<number>()
  const artistList = artistRows.filter((a) => {
    if (!a.artistId || seenArtist.has(a.artistId)) return false
    seenArtist.add(a.artistId)
    return true
  })

  return { resultCount: results.length, results, artists: artistList }
}

export async function clientAlbum(taggedId: string, country = 'es') {
  const raw = taggedId.includes(':') ? taggedId.split(/:(.+)/)[1] : taggedId
  return fetchJson(
    `lookup?id=${encodeURIComponent(raw)}&entity=song&limit=200&country=${country}`,
  )
}

// Stable per-session token used to dodge a poisoned iTunes CDN edge entry (a
// throttled `resultCount:1` body, or a cached CORS header for another origin).
// Stable so the in-memory cache still dedupes within the session; unique enough
// to miss the globally-cached canonical URL.
const BUST = Math.random().toString(36).slice(2, 10)

// An artist's full set of releases (the discography page filters this to
// albums + EPs). The first row is the artist node (name, link); the rest are
// collections. `fresh` appends a cache-buster to retry past a poisoned edge.
export async function clientArtist(taggedId: string, fresh = false, country = 'es') {
  const raw = taggedId.includes(':') ? taggedId.split(/:(.+)/)[1] : taggedId
  const bust = fresh ? `&_=${BUST}` : ''
  return fetchJson(
    `lookup?id=${encodeURIComponent(raw)}&entity=album&limit=200&country=${country}${bust}`,
  )
}
