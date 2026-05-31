// Client API: talks to the iTunes Search API directly (no backend, no login)
// and normalizes the responses into the unified types in ./types.

import type { AlbumDetail, AlbumSummary, Track } from './types'
import { clientAlbum, clientSearch } from './itunesClient'

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

export async function searchAlbums(term: string): Promise<AlbumSummary[]> {
  if (!term.trim()) return []
  const data = (await clientSearch(term)) as { results?: ItunesEntity[] }
  const all = (data.results ?? []).filter((e) => e.collectionId)
  const albums = all.filter((e) => isAlbumOrEp(e.collectionName ?? '', e.trackCount))
  // if an artist only has singles, show them rather than nothing
  return (albums.length ? albums : all).map(normalizeItunesSummary)
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
