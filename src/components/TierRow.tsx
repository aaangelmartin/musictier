import { useDroppable } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { FiDroplet, FiTrash2 } from 'react-icons/fi'
import { SortableSongCard } from './SortableSongCard'
import type { Tier } from '../lib/tierStorage'
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

  return (
    <div className="flex items-start gap-2">
      {/* square 1:1 header, matching the album cards */}
      <div
        className="relative flex aspect-square w-24 shrink-0 flex-col items-center justify-center overflow-hidden rounded-lg"
        style={{ backgroundColor: tier.color }}
      >
        {editable ? (
          <input
            value={tier.label}
            onChange={(e) => onLabel(tier.id, e.target.value)}
            className="w-full bg-transparent text-center text-3xl font-bold text-black/80 outline-none"
            style={{ textTransform: 'none' }}
            aria-label="nombre del tier"
            maxLength={6}
          />
        ) : (
          <span className="text-3xl font-bold text-black/80">{tier.label}</span>
        )}

        {editable && (
          <div className="absolute bottom-2 flex items-center gap-3">
            {/* droplet opens the native colour picker (reliable, never clipped) */}
            <label
              className="cursor-pointer text-black/60 transition-colors hover:text-black"
              title="cambiar color"
            >
              <FiDroplet size={15} />
              <input
                type="color"
                value={tier.color}
                onChange={(e) => onColor(tier.id, e.target.value)}
                className="sr-only"
                aria-label="cambiar color del tier"
              />
            </label>
            <button
              onClick={() => onRemove(tier.id)}
              aria-label="eliminar tier"
              title="eliminar tier"
              className="text-black/60 transition-colors hover:text-black"
            >
              <FiTrash2 size={15} />
            </button>
          </div>
        )}
      </div>

      {/* drop area */}
      <div
        ref={setNodeRef}
        className={`min-h-24 flex-1 rounded-lg border p-2 transition-colors ${
          isOver ? 'border-accent/60 bg-accent/15' : 'border-white/10 bg-white/[0.03]'
        }`}
      >
        <SortableContext items={trackIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2">
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
