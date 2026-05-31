import { useDroppable } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { SortableSongCard } from './SortableSongCard'
import { UNRANKED } from '../lib/tierStorage'
import { useI18n } from '../lib/i18n'
import type { Track } from '../lib/types'

interface Props {
  trackIds: string[]
  trackMap: Record<string, Track>
  onInfo: (t: Track) => void
  editable: boolean
}

export function UnrankedTray({ trackIds, trackMap, onInfo, editable }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: UNRANKED })
  const { t } = useI18n()

  return (
    <div className="rounded-lg border border-white/10">
      <p className="border-b border-white/10 px-3 py-2 text-xs font-semibold tracking-widest text-accent">
        {t('tier.unranked')} - {trackIds.length}
      </p>
      <div
        ref={setNodeRef}
        className={`min-h-[104px] p-2 transition-colors ${isOver ? 'bg-accent/15' : ''}`}
      >
        <SortableContext items={trackIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-[repeat(auto-fill,104px)] justify-start gap-2">
            {trackIds.map((id) =>
              trackMap[id] ? (
                <SortableSongCard
                  key={id}
                  track={trackMap[id]}
                  containerId={UNRANKED}
                  onInfo={onInfo}
                  editable={editable}
                />
              ) : null,
            )}
          </div>
        </SortableContext>
        {trackIds.length === 0 && (
          <p className="py-3 text-center text-xs text-white/30">{t('tier.allRanked')}</p>
        )}
      </div>
    </div>
  )
}
