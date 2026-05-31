import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { FiDroplet, FiTrash2 } from 'react-icons/fi'
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
        className="relative flex w-20 shrink-0 flex-col items-center justify-center gap-2 px-1 py-3"
        style={{ backgroundColor: tier.color }}
      >
        {editable ? (
          <input
            value={tier.label}
            onChange={(e) => onLabel(tier.id, e.target.value)}
            className="w-full bg-transparent text-center text-2xl font-bold text-black/80 outline-none"
            style={{ textTransform: 'none' }}
            aria-label="nombre del tier"
            maxLength={6}
          />
        ) : (
          <span className="text-2xl font-bold text-black/80">{tier.label}</span>
        )}

        {editable && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPalette((p) => !p)}
              aria-label="cambiar color"
              title="cambiar color"
              className="text-black/60 transition-colors hover:text-black"
            >
              <FiDroplet size={14} />
            </button>
            <button
              onClick={() => onRemove(tier.id)}
              aria-label="eliminar tier"
              title="eliminar tier"
              className="text-black/60 transition-colors hover:text-black"
            >
              <FiTrash2 size={14} />
            </button>
          </div>
        )}

        {palette && editable && (
          <div className="absolute left-1/2 top-full z-20 mt-1 flex -translate-x-1/2 gap-1.5 rounded-lg border border-white/20 bg-bg p-2 shadow-xl">
            {EXTRA_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  onColor(tier.id, c)
                  setPalette(false)
                }}
                className="h-5 w-5 rounded-full ring-1 ring-white/20"
                style={{ backgroundColor: c }}
                aria-label={`usar color ${c}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* drop area */}
      <div
        ref={setNodeRef}
        className={`min-h-[6rem] flex-1 bg-white/[0.03] p-2 transition-colors ${
          isOver ? 'bg-accent/15' : ''
        }`}
      >
        <SortableContext items={trackIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2">
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
