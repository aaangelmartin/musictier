import { useDroppable } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { FiChevronDown, FiChevronUp, FiDroplet, FiTrash2 } from 'react-icons/fi'
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
  onMove: (id: string, dir: -1 | 1) => void
  isFirst: boolean
  isLast: boolean
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
  onMove,
  isFirst,
  isLast,
  editable,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: tier.id })

  return (
    <div className="flex items-start gap-1.5">
      {/* square 1:1 header, exactly the size of the song cards */}
      <div
        className="relative flex h-[104px] w-[104px] shrink-0 flex-col items-center justify-center overflow-hidden rounded-lg"
        style={{ backgroundColor: tier.color }}
      >
        {editable ? (
          <input
            value={tier.label}
            onChange={(e) => onLabel(tier.id, e.target.value)}
            className="w-full bg-transparent text-center text-[40px] font-bold leading-none text-black/80 outline-none"
            style={{ textTransform: 'none' }}
            aria-label="nombre del tier"
            maxLength={6}
          />
        ) : (
          <span className="text-[40px] font-bold leading-none text-black/80">
            {tier.label}
          </span>
        )}

        {editable && (
          <div className="absolute bottom-2 flex items-center gap-2.5">
            <button
              onClick={() => onMove(tier.id, -1)}
              disabled={isFirst}
              aria-label="subir tier"
              title="subir"
              className="text-black/60 transition-colors hover:text-black disabled:opacity-25"
            >
              <FiChevronUp size={15} />
            </button>
            <button
              onClick={() => onMove(tier.id, 1)}
              disabled={isLast}
              aria-label="bajar tier"
              title="bajar"
              className="text-black/60 transition-colors hover:text-black disabled:opacity-25"
            >
              <FiChevronDown size={15} />
            </button>
            {/* droplet opens the native colour picker (reliable, never clipped) */}
            <label
              className="cursor-pointer text-black/60 transition-colors hover:text-black"
              title="cambiar color"
            >
              <FiDroplet size={14} />
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
              <FiTrash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* drop area: no padding so the first card aligns flush with the label top */}
      <div
        ref={setNodeRef}
        className={`min-h-[104px] flex-1 rounded-lg transition-colors ${
          isOver ? 'bg-accent/15' : 'bg-white/[0.03]'
        }`}
      >
        <SortableContext items={trackIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-[repeat(auto-fill,104px)] justify-start gap-1.5">
            {trackIds.map((id) =>
              trackMap[id] ? (
                <SortableSongCard
                  key={id}
                  track={trackMap[id]}
                  containerId={tier.id}
                  onInfo={onInfo}
                  editable={editable}
                />
              ) : null,
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}
