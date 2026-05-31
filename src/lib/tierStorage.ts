// Tier board model + localStorage persistence, keyed by album id. A shared
// /a/:id link opens an empty board; each visitor's own ranking lives locally.

import type { Track } from './types'

export interface Tier {
  id: string
  label: string
  color: string
}

export const UNRANKED = 'unranked'

// classic S/A/B/C/D, recoloured to read on a #0a0a0a canvas
export const DEFAULT_TIERS: Tier[] = [
  { id: 's', label: 'S', color: '#ff5c5c' },
  { id: 'a', label: 'A', color: '#ff9f43' },
  { id: 'b', label: 'B', color: '#ffd93d' },
  { id: 'c', label: 'C', color: '#6bcb77' },
  { id: 'd', label: 'D', color: '#4d96ff' },
]

export const EXTRA_COLORS = [
  '#9b6bff',
  '#ff6bd6',
  '#00b5e2',
  '#7d8597',
  '#ff5c5c',
  '#6bcb77',
]

export interface BoardState {
  tiers: Tier[]
  /** containerId ("unranked" or a tier id) -> ordered track ids */
  items: Record<string, string[]>
}

const KEY = (albumId: string) => `tier:${albumId}`

// named tier templates the user can apply to a board
export const TIER_PRESETS: { name: string; tiers: Omit<Tier, 'id'>[] }[] = [
  { name: 'clásico', tiers: DEFAULT_TIERS.map(({ label, color }) => ({ label, color })) },
  {
    name: 'con f',
    tiers: [
      ...DEFAULT_TIERS.map(({ label, color }) => ({ label, color })),
      { label: 'F', color: '#9b6bff' },
    ],
  },
  {
    name: 'numérico',
    tiers: [
      { label: '5', color: '#ff5c5c' },
      { label: '4', color: '#ff9f43' },
      { label: '3', color: '#ffd93d' },
      { label: '2', color: '#6bcb77' },
      { label: '1', color: '#4d96ff' },
    ],
  },
  {
    name: 'simple',
    tiers: [
      { label: 'fav', color: '#ff5c5c' },
      { label: 'mid', color: '#ffd93d' },
      { label: 'skip', color: '#7d8597' },
    ],
  },
]

/** Build an empty board with the given tiers (all tracks start unranked). */
export function boardFromTiers(tiers: Omit<Tier, 'id'>[], tracks: Track[]): BoardState {
  const withIds: Tier[] = tiers.map((t, i) => ({ id: `t${i}`, ...t }))
  const items: Record<string, string[]> = { [UNRANKED]: tracks.map((t) => t.id) }
  for (const tier of withIds) items[tier.id] = []
  return { tiers: withIds, items }
}

export function freshBoard(tracks: Track[]): BoardState {
  return boardFromTiers(
    DEFAULT_TIERS.map(({ label, color }) => ({ label, color })),
    tracks,
  )
}

/** Load saved board, reconciling against the album's current track list. */
export function loadBoard(albumId: string, tracks: Track[]): BoardState {
  let saved: BoardState | null = null
  try {
    const raw = localStorage.getItem(KEY(albumId))
    if (raw) saved = JSON.parse(raw) as BoardState
  } catch {
    saved = null
  }
  if (!saved) return freshBoard(tracks)

  const valid = new Set(tracks.map((t) => t.id))
  const placed = new Set<string>()
  const items: Record<string, string[]> = {}
  const containers = [UNRANKED, ...saved.tiers.map((t) => t.id)]
  for (const c of containers) {
    items[c] = (saved.items[c] ?? []).filter((id) => valid.has(id) && !placed.has(id))
    items[c].forEach((id) => placed.add(id))
  }
  // any new/unplaced tracks go to the unranked tray
  for (const t of tracks) if (!placed.has(t.id)) items[UNRANKED].push(t.id)

  return {
    tiers: saved.tiers.length ? saved.tiers : DEFAULT_TIERS.map((t) => ({ ...t })),
    items,
  }
}

export function saveBoard(albumId: string, state: BoardState): void {
  try {
    localStorage.setItem(KEY(albumId), JSON.stringify(state))
  } catch {
    /* storage full or unavailable, ignore */
  }
}

export function resetBoard(albumId: string, tracks: Track[]): BoardState {
  const board = freshBoard(tracks)
  saveBoard(albumId, board)
  return board
}

// --- "my tier lists" index -------------------------------------------------
// A small index of the albums the visitor has ranked, for the home gallery.

export interface SavedListMeta {
  id: string
  name: string
  artist: string
  art: string
  updatedAt: number
  ranked: number
  total: number
}

const LISTS_KEY = 'musictier:lists'

export function getSavedLists(): SavedListMeta[] {
  try {
    const raw = localStorage.getItem(LISTS_KEY)
    const list = raw ? (JSON.parse(raw) as SavedListMeta[]) : []
    return list.sort((a, b) => b.updatedAt - a.updatedAt)
  } catch {
    return []
  }
}

export function upsertSavedList(meta: SavedListMeta): void {
  try {
    const list = getSavedLists().filter((l) => l.id !== meta.id)
    list.unshift(meta)
    localStorage.setItem(LISTS_KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

export function removeSavedList(id: string): void {
  try {
    localStorage.setItem(
      LISTS_KEY,
      JSON.stringify(getSavedLists().filter((l) => l.id !== id)),
    )
    localStorage.removeItem(KEY(id))
  } catch {
    /* ignore */
  }
}

// --- shareable encoding ----------------------------------------------------
// Encode the whole tier list into a compact, URL-safe string so a link can
// carry someone's exact ranking. Tracks are referenced by their index in the
// album (stable per source), keeping the payload small.

function toB64Url(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64Url(s: string): string {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

interface SharePayload {
  v: 1
  t: [string, string][] // tiers as [label, color]
  p: number[][] // p[i] = ordered track indices in tier i
}

export function encodeBoard(board: BoardState, tracks: Track[]): string {
  const idx = new Map(tracks.map((t, i) => [t.id, i]))
  const payload: SharePayload = {
    v: 1,
    t: board.tiers.map((tier) => [tier.label, tier.color]),
    p: board.tiers.map((tier) =>
      (board.items[tier.id] ?? [])
        .map((id) => idx.get(id))
        .filter((i): i is number => i !== undefined),
    ),
  }
  return toB64Url(JSON.stringify(payload))
}

export function decodeBoard(code: string, tracks: Track[]): BoardState | null {
  try {
    const payload = JSON.parse(fromB64Url(code)) as SharePayload
    if (payload.v !== 1 || !Array.isArray(payload.t) || !Array.isArray(payload.p)) {
      return null
    }
    const tiers: Tier[] = payload.t.map(([label, color], i) => ({
      id: `s${i}`,
      label: String(label).slice(0, 6),
      color: String(color),
    }))
    if (!tiers.length) return null

    const items: Record<string, string[]> = {}
    const placed = new Set<string>()
    tiers.forEach((tier, i) => {
      const ids = (payload.p[i] ?? [])
        .map((n) => tracks[n]?.id)
        .filter((id): id is string => Boolean(id) && !placed.has(id))
      ids.forEach((id) => placed.add(id))
      items[tier.id] = ids
    })
    items[UNRANKED] = tracks.filter((t) => !placed.has(t.id)).map((t) => t.id)
    return { tiers, items }
  } catch {
    return null
  }
}
