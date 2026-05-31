import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { FiTrash2 } from 'react-icons/fi'
import { SortableSongCard } from './SortableSongCard'
import { EXTRA_COLORS, type Tier } from '../lib/tierStorage'
import type { Track } from '../lib/types'

interface Props {
  tier: Tier
  trackIds: string[]
  trackMap: Record<string, Track>
  onInfo: (t: Track) => void
  onLabel: (id: string, label: string) => void
  onColor: (id: string, color: string) => void
  onRemove: (id: string) => void
  editable: boolean
}

export function TierRow({
  tier,
  trackIds,
  trackMap,
  onInfo,
  onLabel,
  onColor,
  onRemove,
  editable,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: tier.id })
  const [palette, setPalette] = useState(false)

  return (
    <div className="flex items-stretch overflow-hidden rounded-lg border border-white/10">
      {/* label cell */}
      <div
        className="relative flex w-16 shrink-0 flex-col items-center justify-center gap-1 px-1 py-2"
        style={{ backgroundColor: tier.color }}
      >
        {editable ? (
          <input
            value={tier.label}
            onChange={(e) => onLabel(tier.id, e.target.value)}
            className="w-full bg-transparent text-center text-lg font-bold uppercase text-black/80 outline-none"
            style={{ textTransform: 'none' }}
            aria-label="nombre del tier"
          />
        ) : (
          <span className="text-lg font-bold text-black/80">{tier.label}</span>
        )}
        {editable && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPalette((p) => !p)}
              aria-label="color"
              className="h-3 w-3 rounded-full border border-black/30"
              style={{ backgroundColor: tier.color }}
            />
            <button
              onClick={() => onRemove(tier.id)}
              aria-label="eliminar tier"
              className="text-black/50 hover:text-black"
            >
              <FiTrash2 size={11} />
            </button>
          </div>
        )}
        {palette && editable && (
          <div className="absolute left-0 top-full z-20 mt-1 grid grid-cols-3 gap-1 rounded-md border border-white/20 bg-bg p-1.5">
            {EXTRA_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  onColor(tier.id, c)
                  setPalette(false)
                }}
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: c }}
                aria-label={`color ${c}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* drop area */}
      <div
        ref={setNodeRef}
        className={`min-h-[3.75rem] flex-1 bg-white/[0.03] p-2 transition-colors ${
          isOver ? 'bg-white/10' : ''
        }`}
      >
        <SortableContext items={trackIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {trackIds.map((id) =>
              trackMap[id] ? (
                <SortableSongCard
                  key={id}
                  track={trackMap[id]}
                  containerId={tier.id}
                  onInfo={onInfo}
                />
              ) : null,
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}
