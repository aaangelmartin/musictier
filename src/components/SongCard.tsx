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

// Square album-art card with the title overlaid. The play/info controls are
// marked data-export-hide so they are removed from the exported PNG.
export const SongCard = forwardRef<HTMLDivElement, Props>(function SongCard(
  { track, isPlaying, onPlay, onInfo, dragging, style, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      style={{ touchAction: 'none', ...style }}
      className={`group relative aspect-square w-full cursor-grab select-none overflow-hidden rounded-lg border border-white/10 bg-white/5 active:cursor-grabbing ${
        dragging ? 'opacity-40' : ''
      }`}
      {...rest}
    >
      {track.artworkUrl && (
        <img
          src={track.artworkUrl}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* scrim for title legibility */}
      <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black via-black/80 to-transparent" />

      {/* full title, never truncated: wraps and grows upward over the scrim */}
      <span className="normal-case absolute inset-x-0 bottom-0 max-h-full overflow-hidden p-2 text-left text-[13px] font-semibold leading-[1.2] text-white [overflow-wrap:anywhere]">
        {track.name}
      </span>

      <div
        data-export-hide
        className="absolute right-1.5 top-1.5 flex gap-1 opacity-80 transition-opacity group-hover:opacity-100"
      >
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onPlay}
          aria-label={isPlaying ? 'pausar' : 'reproducir'}
          disabled={!track.previewUrl}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-accent hover:text-bg disabled:opacity-30"
        >
          {isPlaying ? <FiPause size={14} /> : <FiPlay size={14} />}
        </button>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onInfo}
          aria-label="info"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-white hover:text-bg"
        >
          <FiInfo size={14} />
        </button>
      </div>

      {isPlaying && (
        <span
          data-export-hide
          className="absolute left-1.5 top-1.5 h-2 w-2 rounded-full bg-accent"
        />
      )}
    </div>
  )
})
