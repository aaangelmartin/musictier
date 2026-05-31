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

export function freshBoard(tracks: Track[]): BoardState {
  const items: Record<string, string[]> = { [UNRANKED]: tracks.map((t) => t.id) }
  for (const tier of DEFAULT_TIERS) items[tier.id] = []
  return { tiers: DEFAULT_TIERS.map((t) => ({ ...t })), items }
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
    /* storage full or unavailable — ignore */
  }
}

export function resetBoard(albumId: string, tracks: Track[]): BoardState {
  const board = freshBoard(tracks)
  saveBoard(albumId, board)
  return board
}
