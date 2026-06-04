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
        genre: r.primaryGenreName,
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
}

/** An artist's discography, filtered to albums + EPs, newest first. */
export async function getArtistDiscography(id: string): Promise<ArtistDiscography> {
  const data = (await clientArtist(id)) as { results?: ItunesEntity[] }
  const rows = data.results ?? []
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
    genre: node?.primaryGenreName,
    albums,
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
