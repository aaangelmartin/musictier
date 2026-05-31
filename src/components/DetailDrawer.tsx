import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FiPause, FiPlay, FiX } from 'react-icons/fi'
import { formatDuration } from '../lib/api'
import { getLyrics } from '../lib/lyrics'
import { useI18n } from '../lib/i18n'
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
  const { t } = useI18n()
  const playingId = usePlayingId()
  const [lyrics, setLyrics] = useState<string | null>(null)
  const [lyricsState, setLyricsState] = useState<'idle' | 'loading' | 'done'>('idle')

  // fetch lyrics for the selected track (LRCLIB)
  useEffect(() => {
    if (!track) return
    let alive = true
    setLyrics(null)
    setLyricsState('loading')
    getLyrics(album.artistName, track.name, album.name, track.durationMs)
      .then((l) => alive && setLyrics(l))
      .finally(() => alive && setLyricsState('done'))
    return () => {
      alive = false
    }
  }, [track, album.artistName, album.name])

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
              aria-label="x"
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
                className="mt-4 flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
              >
                {playingId === track.id ? <FiPause /> : <FiPlay />}
                {playingId === track.id ? t('detail.pause') : t('detail.preview')}
              </button>
            )}

            <div className="mt-5">
              {track ? (
                <>
                  <Row label={t('detail.album')} value={album.name} />
                  <Row label={t('detail.track')} value={track.trackNumber} />
                  <Row label={t('detail.disc')} value={track.discNumber} />
                  <Row
                    label={t('detail.duration')}
                    value={formatDuration(track.durationMs)}
                  />
                  <Row label={t('detail.genre')} value={track.genre || album.genre} />
                  <Row label={t('detail.year')} value={album.year} />
                </>
              ) : null}
            </div>

            {track && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold tracking-widest text-white/40">
                  {t('detail.lyrics')}
                </p>
                {lyricsState === 'loading' && (
                  <p className="text-sm text-white/40">{t('detail.lyricsLoading')}</p>
                )}
                {lyricsState === 'done' && lyrics && (
                  <p className="normal-case whitespace-pre-wrap text-sm leading-relaxed text-white/80">
                    {lyrics}
                  </p>
                )}
                {lyricsState === 'done' && !lyrics && (
                  <p className="text-sm text-white/40">{t('detail.lyricsNone')}</p>
                )}
              </div>
            )}

            <p className="mt-5 mb-2 text-xs font-semibold tracking-widest text-white/40">
              {t('detail.album')}
            </p>
            <div>
              <Row label={t('detail.artist')} value={album.artistName} />
              <Row label={t('detail.year')} value={album.year} />
              <Row label={t('detail.genre')} value={album.genre} />
              <Row label={t('detail.songs')} value={album.trackCount} />
              <Row label={t('detail.label')} value={album.recordLabel} />
              <Row label={t('detail.release')} value={album.releaseDate} />
              <Row label="©" value={album.copyright} />
            </div>

            {album.externalUrl && (
              <a
                href={album.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 text-center text-sm text-accent underline-offset-4 hover:underline"
              >
                {t('detail.open')}
              </a>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
