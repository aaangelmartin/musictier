import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { FiPlus } from 'react-icons/fi'
import { TierRow } from './TierRow'
import { UnrankedTray } from './UnrankedTray'
import { SongCard } from './SongCard'
import { EXTRA_COLORS, UNRANKED, type BoardState, type Tier } from '../lib/tierStorage'
import type { Track } from '../lib/types'

interface Props {
  board: BoardState
  setBoard: React.Dispatch<React.SetStateAction<BoardState>>
  trackMap: Record<string, Track>
  onInfo: (t: Track) => void
  editable: boolean
  exportRef: React.Ref<HTMLDivElement>
  exportTitle: string
  exportSubtitle?: string
}

function findContainer(items: Record<string, string[]>, id: string): string | undefined {
  if (id in items) return id
  return Object.keys(items).find((c) => items[c].includes(id))
}

// Drop where the pointer actually is. pointerWithin makes every tier (and the
// unranked tray) a valid target under the cursor/finger; rectIntersection is a
// fallback for when the pointer is between elements.
const collision: CollisionDetection = (args) => {
  const within = pointerWithin(args)
  return within.length ? within : rectIntersection(args)
}

export function TierBoard({
  board,
  setBoard,
  trackMap,
  onInfo,
  editable,
  exportRef,
  exportTitle,
  exportSubtitle,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(null)
  // Mouse: small drag threshold so taps still click buttons. Touch: press-and-
  // hold so a finger drag does not fight page scroll (cards also set
  // touch-action: none). Keyboard for accessibility.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    setBoard((prev) => {
      const activeC = findContainer(prev.items, activeId)
      const overC = findContainer(prev.items, overId)
      if (!activeC || !overC || activeC === overC) return prev
      const activeItems = prev.items[activeC]
      const overItems = prev.items[overC]
      const overIndex = overItems.indexOf(overId)
      const newIndex = overId in prev.items ? overItems.length : Math.max(overIndex, 0)
      return {
        ...prev,
        items: {
          ...prev.items,
          [activeC]: activeItems.filter((id) => id !== activeId),
          [overC]: [
            ...overItems.slice(0, newIndex),
            activeId,
            ...overItems.slice(newIndex),
          ],
        },
      }
    })
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    setBoard((prev) => {
      const activeC = findContainer(prev.items, activeId)
      const overC = findContainer(prev.items, overId)
      if (!activeC || !overC || activeC !== overC) return prev
      const items = prev.items[activeC]
      const oldIndex = items.indexOf(activeId)
      const newIndex = items.indexOf(overId)
      if (oldIndex === newIndex || newIndex < 0) return prev
      return {
        ...prev,
        items: { ...prev.items, [activeC]: arrayMove(items, oldIndex, newIndex) },
      }
    })
  }

  // --- tier editing ---------------------------------------------------------

  function setLabel(id: string, label: string) {
    setBoard((p) => ({
      ...p,
      tiers: p.tiers.map((t) => (t.id === id ? { ...t, label } : t)),
    }))
  }
  function setColor(id: string, color: string) {
    setBoard((p) => ({
      ...p,
      tiers: p.tiers.map((t) => (t.id === id ? { ...t, color } : t)),
    }))
  }
  function removeTier(id: string) {
    setBoard((p) => {
      const moved = p.items[id] ?? []
      const items: Record<string, string[]> = {
        ...p.items,
        [UNRANKED]: [...p.items[UNRANKED], ...moved],
      }
      delete items[id]
      return { tiers: p.tiers.filter((t) => t.id !== id), items }
    })
  }
  function addTier() {
    setBoard((p) => {
      const id = `t${p.tiers.length}-${p.tiers.reduce((n, t) => n + t.label.length, 0)}`
      const color = EXTRA_COLORS[p.tiers.length % EXTRA_COLORS.length]
      const tier: Tier = { id, label: 'nuevo', color }
      return { tiers: [...p.tiers, tier], items: { ...p.items, [id]: [] } }
    })
  }

  const activeTrack = activeId ? trackMap[activeId] : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      // re-measure droppable rects continuously: tiers resize as cards move
      // between them, otherwise only the row whose rect stayed put accepts drops
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div ref={exportRef} className="space-y-2 rounded-xl bg-bg p-1">
        {/* export-only header */}
        <div data-export-only="flex" className="flex-col gap-0.5 px-1 pb-2 pt-1">
          <span className="normal-case text-xl font-bold tracking-tight text-white">
            {exportTitle}
          </span>
          {exportSubtitle && (
            <span className="normal-case text-sm text-white/60">{exportSubtitle}</span>
          )}
        </div>

        {board.tiers.map((tier) => (
          <TierRow
            key={tier.id}
            tier={tier}
            trackIds={board.items[tier.id] ?? []}
            trackMap={trackMap}
            onInfo={onInfo}
            onLabel={setLabel}
            onColor={setColor}
            onRemove={removeTier}
            editable={editable}
          />
        ))}

        {/* export-only watermark */}
        <div data-export-only="flex" className="items-center justify-between px-1 pt-2">
          <span className="text-sm font-bold text-accent">tier maker.</span>
          <span className="text-xs text-white/40">aaangelmartin.com</span>
        </div>
      </div>

      {editable && (
        <button
          onClick={addTier}
          className="mt-2 flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-1.5 text-xs font-medium text-white/70 transition-colors hover:border-white/40 hover:text-white"
        >
          <FiPlus size={14} /> añadir tier
        </button>
      )}

      <div className="mt-6">
        <UnrankedTray
          trackIds={board.items[UNRANKED] ?? []}
          trackMap={trackMap}
          onInfo={onInfo}
        />
      </div>

      <DragOverlay>
        {activeTrack ? (
          <div className="w-[96px] rotate-3 opacity-90">
            <SongCard
              track={activeTrack}
              isPlaying={false}
              onPlay={() => {}}
              onInfo={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
