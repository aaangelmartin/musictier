import { AnimatePresence, motion } from 'framer-motion'
import { FiPause, FiPlay, FiX } from 'react-icons/fi'
import { formatDuration } from '../lib/api'
import { togglePreview, usePlayingId } from '../lib/audioStore'
import type { AlbumDetail, Track } from '../lib/types'

interface Props {
  album: AlbumDetail
  track: Track | null
  open: boolean
  onClose: () => void
}

function Row({ label, value }: { label: string; value?: string | number }) {
  if (value === undefined || value === '' || value === null) return null
  return (
    <div className="flex justify-between gap-4 border-b border-white/10 py-2 text-sm">
      <span className="shrink-0 text-white/50">{label}</span>
      <span className="normal-case text-right text-white/90">{value}</span>
    </div>
  )
}

// "descifrar": full metadata for the selected track (with album context) or the
// album itself when no track is selected.
export function DetailDrawer({ album, track, open, onClose }: Props) {
  const playingId = usePlayingId()

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="scrollbar-thin fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col overflow-y-auto border-l border-white/20 bg-bg p-6"
          >
            <button
              onClick={onClose}
              aria-label="cerrar"
              className="self-end text-white/50 transition-opacity hover:opacity-100"
            >
              <FiX size={20} />
            </button>

            <img
              src={track?.artworkUrl || album.artworkUrl}
              alt=""
              className="mt-2 aspect-square w-full rounded-xl border border-white/10 object-cover"
            />

            <h2 className="normal-case mt-4 text-xl font-bold text-white">
              {track ? track.name : album.name}
            </h2>
            <p className="normal-case text-white/60">{album.artistName}</p>

            {track?.previewUrl && (
              <button
                onClick={() => togglePreview(track.id, track.previewUrl)}
                className="mt-4 flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
              >
                {playingId === track.id ? <FiPause /> : <FiPlay />}
                {playingId === track.id ? 'pausar preview' : 'preview 30s'}
              </button>
            )}

            <div className="mt-5">
              {track ? (
                <>
                  <Row label="álbum" value={album.name} />
                  <Row label="pista" value={track.trackNumber} />
                  <Row label="disco" value={track.discNumber} />
                  <Row label="duración" value={formatDuration(track.durationMs)} />
                  <Row label="género" value={track.genre || album.genre} />
                  <Row label="año" value={album.year} />
                </>
              ) : null}
            </div>

            <p className="mt-5 mb-2 text-xs font-semibold tracking-widest text-white/40">
              álbum
            </p>
            <div>
              <Row label="artista" value={album.artistName} />
              <Row label="año" value={album.year} />
              <Row label="género" value={album.genre} />
              <Row label="canciones" value={album.trackCount} />
              <Row label="sello" value={album.recordLabel} />
              <Row label="lanzamiento" value={album.releaseDate} />
              <Row label="©" value={album.copyright} />
            </div>

            {album.externalUrl && (
              <a
                href={album.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 text-center text-sm text-accent underline-offset-4 hover:underline"
              >
                abrir en apple music
              </a>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
