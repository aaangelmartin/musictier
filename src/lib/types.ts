// Unified domain types. iTunes Search API responses are normalized onto these
// in lib/api.ts so the rest of the app never deals with the raw payloads.

export type Source = 'itunes'

export interface AlbumSummary {
  /** source-tagged id, e.g. "itunes:1440913508", used in /a/:id share links */
  id: string
  source: Source
  name: string
  artistName: string
  artworkUrl: string
  year?: string
}

export interface Track {
  id: string
  name: string
  trackNumber?: number
  discNumber?: number
  durationMs?: number
  previewUrl?: string
  artworkUrl: string
  genre?: string
}

export interface AlbumDetail extends AlbumSummary {
  tracks: Track[]
  genre?: string
  trackCount?: number
  releaseDate?: string
  copyright?: string
  recordLabel?: string
  artistName: string
  externalUrl?: string
}
