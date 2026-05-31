// Client API: talks to our own /api proxy and normalizes the raw upstream
// payloads (Apple Music or iTunes) into the unified types in ./types.

import type { AlbumDetail, AlbumSummary, Source, Track } from './types'

interface CatalogResponse {
  source: Source
  data: unknown
}

async function getCatalog(params: Record<string, string>): Promise<CatalogResponse> {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`/api/catalog?${qs}`)
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error || `request failed (${res.status})`)
  }
  return (await res.json()) as CatalogResponse
}

// --- artwork helpers --------------------------------------------------------

/** Upscale an iTunes artwork url (".../100x100bb.jpg" -> requested size). */
function itunesArt(url: string | undefined, size = 600): string {
  if (!url) return ''
  return url.replace(/\/\d+x\d+bb\./, `/${size}x${size}bb.`)
}

/** Fill an Apple Music artwork template ("{w}x{h}") with a concrete size. */
function appleArt(url: string | undefined, size = 600): string {
  if (!url) return ''
  return url.replace('{w}', String(size)).replace('{h}', String(size))
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
    .sort((a, b) => (a.discNumber ?? 1) - (b.discNumber ?? 1) || (a.trackNumber ?? 0) - (b.trackNumber ?? 0))

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

// --- Apple Music normalization ----------------------------------------------

interface AppleResource {
  id: string
  type: string
  attributes?: Record<string, unknown>
  relationships?: {
    tracks?: { data?: AppleResource[] }
    artists?: { data?: AppleResource[] }
  }
}

function attr<T>(r: AppleResource | undefined, key: string): T | undefined {
  return r?.attributes?.[key] as T | undefined
}

function normalizeAppleSummary(r: AppleResource): AlbumSummary {
  const art = attr<{ url?: string }>(r, 'artwork')
  return {
    id: `apple:${r.id}`,
    source: 'apple',
    name: attr<string>(r, 'name') ?? 'unknown album',
    artistName: attr<string>(r, 'artistName') ?? 'unknown artist',
    artworkUrl: appleArt(art?.url),
    year: (attr<string>(r, 'releaseDate') ?? '').slice(0, 4) || undefined,
  }
}

function normalizeAppleAlbum(r: AppleResource): AlbumDetail {
  const art = attr<{ url?: string }>(r, 'artwork')
  const albumArt = appleArt(art?.url)
  const tracks: Track[] = (r.relationships?.tracks?.data ?? []).map((t) => {
    const tArt = attr<{ url?: string }>(t, 'artwork')
    return {
      id: `apple:${t.id}`,
      name: attr<string>(t, 'name') ?? 'unknown track',
      trackNumber: attr<number>(t, 'trackNumber'),
      discNumber: attr<number>(t, 'discNumber'),
      durationMs: attr<number>(t, 'durationInMillis'),
      previewUrl: attr<{ url?: string }[]>(t, 'previews')?.[0]?.url,
      artworkUrl: appleArt(tArt?.url) || albumArt,
      genre: attr<string[]>(t, 'genreNames')?.[0],
    }
  })

  return {
    id: `apple:${r.id}`,
    source: 'apple',
    name: attr<string>(r, 'name') ?? 'unknown album',
    artistName: attr<string>(r, 'artistName') ?? 'unknown artist',
    artworkUrl: albumArt,
    year: (attr<string>(r, 'releaseDate') ?? '').slice(0, 4) || undefined,
    genre: attr<string[]>(r, 'genreNames')?.[0],
    trackCount: attr<number>(r, 'trackCount') ?? tracks.length,
    releaseDate: attr<string>(r, 'releaseDate'),
    copyright: attr<string>(r, 'copyright'),
    recordLabel: attr<string>(r, 'recordLabel'),
    externalUrl: attr<string>(r, 'url'),
    tracks,
  }
}

// --- public API -------------------------------------------------------------

export async function searchAlbums(term: string): Promise<AlbumSummary[]> {
  if (!term.trim()) return []
  const { source, data } = await getCatalog({ op: 'search', term })
  if (source === 'itunes') {
    const r = (data as { results?: ItunesEntity[] }).results ?? []
    return r.filter((e) => e.collectionId).map(normalizeItunesSummary)
  }
  const r = (data as { results?: { albums?: { data?: AppleResource[] } } }).results
  return (r?.albums?.data ?? []).map(normalizeAppleSummary)
}

export async function getAlbum(id: string): Promise<AlbumDetail> {
  const { source, data } = await getCatalog({ op: 'album', id })
  if (source === 'itunes') {
    const results = (data as { results?: ItunesEntity[] }).results ?? []
    if (!results.length) throw new Error('album not found')
    return normalizeItunesAlbum(results)
  }
  const resource = (data as { data?: AppleResource[] }).data?.[0]
  if (!resource) throw new Error('album not found')
  return normalizeAppleAlbum(resource)
}

/** Route artwork through our proxy so html-to-image export does not taint the canvas. */
export function proxiedArtwork(url: string): string {
  if (!url) return ''
  return `/api/artwork?url=${encodeURIComponent(url)}`
}

export function formatDuration(ms?: number): string {
  if (!ms || ms < 0) return '--:--'
  const total = Math.round(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
