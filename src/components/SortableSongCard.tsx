import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SongCard } from './SongCard'
import { togglePreview, usePlayingId } from '../lib/audioStore'
import type { Track } from '../lib/types'

interface Props {
  track: Track
  containerId: string
  onInfo: (track: Track) => void
  editable: boolean
}

export function SortableSongCard({ track, containerId, onInfo, editable }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: track.id, data: { containerId }, disabled: !editable })
  const playingId = usePlayingId()

  return (
    <SongCard
      ref={setNodeRef}
      track={track}
      dragging={isDragging}
      canDrag={editable}
      isPlaying={playingId === track.id}
      onPlay={() => togglePreview(track.id, track.previewUrl)}
      onInfo={() => onInfo(track)}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
    />
  )
}
