import { forwardRef } from 'react'
import { FiInfo, FiPause, FiPlay } from 'react-icons/fi'
import type { CSSProperties, HTMLAttributes } from 'react'
import type { Track } from '../lib/types'

interface Props extends HTMLAttributes<HTMLDivElement> {
  track: Track
  isPlaying: boolean
  onPlay: () => void
  onInfo: () => void
  dragging?: boolean
  style?: CSSProperties
}

// Presentational song card. Drag wiring (useSortable) lives in the sortable
// wrapper; this component just renders and forwards a ref + drag listeners.
export const SongCard = forwardRef<HTMLDivElement, Props>(function SongCard(
  { track, isPlaying, onPlay, onInfo, dragging, style, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      style={style}
      className={`group flex select-none items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-1.5 pr-2 backdrop-blur-sm transition-colors hover:border-white/30 ${
        dragging ? 'opacity-40' : ''
      }`}
      {...rest}
    >
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded">
        {track.artworkUrl && (
          <img
            src={track.artworkUrl}
            alt=""
            draggable={false}
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <span className="normal-case min-w-0 flex-1 truncate text-xs font-medium text-white">
        {track.name}
      </span>
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onPlay}
        aria-label={isPlaying ? 'pausar' : 'reproducir'}
        disabled={!track.previewUrl}
        className="shrink-0 text-white/60 transition-opacity hover:text-white disabled:opacity-20"
      >
        {isPlaying ? <FiPause size={15} /> : <FiPlay size={15} />}
      </button>
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onInfo}
        aria-label="info"
        className="shrink-0 text-white/40 transition-opacity hover:text-white"
      >
        <FiInfo size={15} />
      </button>
    </div>
  )
})
