// Client API: talks to the iTunes Search API directly (no backend, no login)
// and normalizes the responses into the unified types in ./types.

import type { AlbumDetail, AlbumSummary, ArtistSummary, Track } from './types'
import { clientAlbum, clientArtist, clientSearch } from './itunesClient'

// --- artwork helpers --------------------------------------------------------

/** Upscale an iTunes artwork url (".../100x100bb.jpg" -> requested size). */
function itunesArt(url: string | undefined, size = 600): string {
  if (!url) return ''
  return url.replace(/\/\d+x\d+bb\./, `/${size}x${size}bb.`)
}

// --- iTunes normalization ---------------------------------------------------

interface ItunesEntity {
  wrapperType?: string
  collectionType?: string
  collectionId?: number
  collectionName?: string
  artistName?: string
  artistId?: number
  artistLinkUrl?: string
  trackId?: number
  trackName?: string
  trackNumber?: number
  discNumber?: number
  trackTimeMillis?: number
  previewUrl?: string
  artworkUrl100?: string
  artworkUrl60?: string
  primaryGenreName?: string
  releaseDate?: string
  trackCount?: number
  copyright?: string
  collectionViewUrl?: string
  country?: string
}

function itunesYear(date?: string): string | undefined {
  return date ? date.slice(0, 4) : undefined
}

function normalizeItunesSummary(e: ItunesEntity): AlbumSummary {
  return {
    id: `itunes:${e.collectionId}`,
    source: 'itunes',
    name: e.collectionName ?? 'unknown album',
    artistName: e.artistName ?? 'unknown artist',
    artworkUrl: itunesArt(e.artworkUrl100),
    year: itunesYear(e.releaseDate),
  }
}

function normalizeItunesAlbum(results: ItunesEntity[]): AlbumDetail {
  const collection = results.find((r) => r.wrapperType === 'collection') ?? results[0]
  const albumArt = itunesArt(collection?.artworkUrl100)
  const tracks: Track[] = results
    .filter((r) => r.wrapperType === 'track')
    .map((t) => ({
      id: `itunes:${t.trackId}`,
      name: t.trackName ?? 'unknown track',
      trackNumber: t.trackNumber,
      discNumber: t.discNumber,
      durationMs: t.trackTimeMillis,
      previewUrl: t.previewUrl,
      artworkUrl: itunesArt(t.artworkUrl100) || albumArt,
      genre: t.primaryGenreName,
    }))
    .sort(
      (a, b) =>
        (a.discNumber ?? 1) - (b.discNumber ?? 1) ||
        (a.trackNumber ?? 0) - (b.trackNumber ?? 0),
    )

  return {
    id: `itunes:${collection?.collectionId}`,
    source: 'itunes',
    name: collection?.collectionName ?? 'unknown album',
    artistName: collection?.artistName ?? 'unknown artist',
    artworkUrl: albumArt,
    year: itunesYear(collection?.releaseDate),
    genre: collection?.primaryGenreName,
    trackCount: collection?.trackCount ?? tracks.length,
    releaseDate: collection?.releaseDate,
    copyright: collection?.copyright,
    externalUrl: collection?.collectionViewUrl,
    tracks,
  }
}

// --- public API -------------------------------------------------------------

// keep albums and EPs, drop singles. iTunes suffixes single releases with
// "- Single"; a 1-track release is also a single.
function isAlbumOrEp(name: string, trackCount?: number): boolean {
  if (/-\s*single\s*$/i.test(name)) return false
  if (trackCount !== undefined && trackCount <= 1) return false
  return true
}

/** lowercase, strip accents, collapse whitespace — for name matching. */
function normName(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()
}

// Build the "artists named X" listing from the artist rows the search gathered.
// Keep only artists actually named like the query, dedupe by name (iTunes orders
// by relevance, so the first same-name row is the canonical one), borrow artwork
// from one of their albums in the pool, and put exact-name matches first.
function buildArtists(
  rows: ItunesEntity[],
  albumRows: ItunesEntity[],
  term: string,
): ArtistSummary[] {
  const query = normName(term)
  const qTokens = query.split(' ').filter((t) => t.length >= 2)
  const artByArtist = new Map<number, string>()
  for (const a of albumRows) {
    if (a.artistId && a.artworkUrl100 && !artByArtist.has(a.artistId))
      artByArtist.set(a.artistId, itunesArt(a.artworkUrl100))
  }
  const seenName = new Set<string>()
  const out: { artist: ArtistSummary; i: number; exact: boolean; shared: number }[] = []
  rows.forEach((r, i) => {
    const name = r.artistName ?? ''
    const n = normName(name)
    if (!n || !r.artistId || seenName.has(n)) return
    // named like the query: at least one whole query word matches a name word.
    // Word-level (not substring) so "Ye" is not matched by "kanye"; covers both
    // "beatles" -> "The Beatles" and "ugly" -> "UGLY".
    const shared = n.split(' ').filter((nt) => qTokens.includes(nt)).length
    if (shared === 0) return
    seenName.add(n)
    out.push({
      artist: {
        id: `itunes:${r.artistId}`,
        source: 'itunes',
        name,
        artworkUrl: artByArtist.get(r.artistId),
      },
      i,
      exact: n === query,
      shared,
    })
  })
  // exact name first, then most query words matched, then iTunes relevance order
  return out
    .sort((a, b) => Number(b.exact) - Number(a.exact) || b.shared - a.shared || a.i - b.i)
    .slice(0, 5)
    .map((x) => x.artist)
}

export interface CatalogSearch {
  artists: ArtistSummary[]
  albums: AlbumSummary[]
}

/** One search: matching artists (named like the query) plus matching albums. */
export async function searchCatalog(term: string): Promise<CatalogSearch> {
  if (!term.trim()) return { artists: [], albums: [] }
  const data = (await clientSearch(term)) as {
    results?: ItunesEntity[]
    artists?: ItunesEntity[]
  }
  const all = (data.results ?? []).filter((e) => e.collectionId)
  const albums = all.filter((e) => isAlbumOrEp(e.collectionName ?? '', e.trackCount))
  return {
    artists: buildArtists(data.artists ?? [], all, term),
    // if an artist only has singles, show them rather than nothing
    albums: (albums.length ? albums : all).map(normalizeItunesSummary),
  }
}

export interface ArtistDiscography extends ArtistSummary {
  albums: AlbumSummary[]
  /** the artist's Apple Music page, used to resolve their real photo */
  appleUrl?: string
}

// Fetch the artist's release rows, retrying once past a poisoned iTunes CDN edge.
// The canonical lookup url sometimes serves a throttled `resultCount:1` body (no
// collections) or, cross-origin, a stale CORS header that rejects the fetch; a
// cache-buster forces a fresh, origin-correct response.
async function fetchArtistRows(id: string): Promise<ItunesEntity[]> {
  const first = await (clientArtist(id) as Promise<{ results?: ItunesEntity[] }>)
    .then((d) => d.results ?? [])
    .catch(() => [] as ItunesEntity[])
  if (first.some((r) => r.wrapperType === 'collection')) return first
  const retry = await (clientArtist(id, true) as Promise<{ results?: ItunesEntity[] }>)
    .then((d) => d.results ?? [])
    .catch(() => [] as ItunesEntity[])
  return retry.length ? retry : first
}

/** An artist's discography, filtered to albums + EPs, newest first. */
export async function getArtistDiscography(id: string): Promise<ArtistDiscography> {
  const rows = await fetchArtistRows(id)
  const node = rows.find((r) => r.wrapperType === 'artist')
  const seen = new Set<number>()
  const albums = rows
    .filter((r) => r.wrapperType === 'collection' && r.collectionId)
    .filter((e) => isAlbumOrEp(e.collectionName ?? '', e.trackCount))
    .filter((e) => {
      if (seen.has(e.collectionId!)) return false
      seen.add(e.collectionId!)
      return true
    })
    .sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''))
    .map(normalizeItunesSummary)
  return {
    id: `itunes:${node?.artistId ?? id.replace(/^.*:/, '')}`,
    source: 'itunes',
    name: node?.artistName ?? albums[0]?.artistName ?? 'unknown artist',
    artworkUrl: albums[0]?.artworkUrl,
    appleUrl: node?.artistLinkUrl,
    albums,
  }
}

// Resolve an artist's real Apple Music photo. iTunes carries no artist image, so
// we read the og:image off their Apple Music page (fetched through a CORS proxy
// since the page sends none) and request a square smart-crop. Best-effort and
// cached per artist; callers fall back to album art when it returns undefined.
const ARTIST_IMG_KEY = 'musictier:artistImg:'
export async function getArtistImage(
  artistId: string,
  appleUrl?: string,
): Promise<string | undefined> {
  if (!appleUrl) return undefined
  const key = ARTIST_IMG_KEY + artistId
  try {
    const cached = localStorage.getItem(key)
    if (cached) return cached
  } catch {
    /* ignore */
  }
  try {
    const res = await fetch(
      `https://api.allorigins.win/raw?url=${encodeURIComponent(appleUrl)}`,
    )
    if (!res.ok) return undefined
    const html = await res.text()
    const m = html.match(/<meta property="og:image" content="([^"]+)"/)
    if (!m) return undefined
    // swap Apple's social crop (".../1200x630cw.png") for a square portrait crop
    const url = m[1].replace(/\/\d+x\d+[a-z]*\.(jpg|png)$/i, '/600x600sr.jpg')
    try {
      localStorage.setItem(key, url)
    } catch {
      /* ignore */
    }
    return url
  } catch {
    return undefined
  }
}

export async function getAlbum(id: string): Promise<AlbumDetail> {
  const data = (await clientAlbum(id)) as { results?: ItunesEntity[] }
  const results = data.results ?? []
  if (!results.length) throw new Error('album not found')
  return normalizeItunesAlbum(results)
}

/**
 * CORS-enabled artwork url for PNG export (mzstatic sends no CORS headers and
 * would taint the canvas). Uses images.weserv.nl, which works on any host
 * including static GitHub Pages, so no backend is required for export.
 */
export function proxiedArtwork(url: string): string {
  if (!url) return ''
  return `https://images.weserv.nl/?url=ssl:${url.replace(/^https?:\/\//, '')}`
}

export function formatDuration(ms?: number): string {
  if (!ms || ms < 0) return '--:--'
  const total = Math.round(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
