import { useState } from 'react'
import {
  FiCheck,
  FiDownload,
  FiImage,
  FiInfo,
  FiList,
  FiRotateCcw,
  FiShare2,
  FiUsers,
} from 'react-icons/fi'
import { useI18n } from '../lib/i18n'
import type { AlbumDetail } from '../lib/types'

interface Props {
  album: AlbumDetail
  copied: boolean
  exporting: boolean
  editable: boolean
  canShareImage: boolean
  onShareRanking: () => void
  onShareAlbum: () => void
  onShareImage: () => void
  onExport: () => void
  onReset: () => void
  onInfo: () => void
}

export function AlbumHeader({
  album,
  copied,
  exporting,
  editable,
  canShareImage,
  onShareRanking,
  onShareAlbum,
  onShareImage,
  onExport,
  onReset,
  onInfo,
}: Props) {
  const [shareOpen, setShareOpen] = useState(false)
  const { t } = useI18n()
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end">
      <img
        src={album.artworkUrl}
        alt={album.name}
        className="h-32 w-32 shrink-0 rounded-xl border border-white/10 object-cover shadow-2xl"
      />
      <div className="flex-1">
        <h1 className="normal-case text-2xl font-bold tracking-tight sm:text-3xl">
          {album.name}
        </h1>
        <p className="normal-case mt-1 text-white/60">
          {album.artistName}
          {album.year ? ` - ${album.year}` : ''} - {album.tracks.length}{' '}
          {t('album.songs')}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <div className="relative">
            <button
              onClick={() => setShareOpen((o) => !o)}
              className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
            >
              {copied ? <FiCheck /> : <FiShare2 />}
              {copied ? t('album.copied') : t('album.share')}
            </button>
            {shareOpen && (
              <>
                <button
                  aria-label="x"
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setShareOpen(false)}
                />
                <div className="absolute left-0 top-full z-20 mt-2 w-60 overflow-hidden rounded-xl border border-white/15 bg-bg shadow-xl">
                  <button
                    onClick={() => {
                      onShareRanking()
                      setShareOpen(false)
                    }}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5"
                  >
                    <FiList className="mt-0.5 shrink-0 text-accent" />
                    <span>
                      <span className="block text-sm font-semibold text-white">
                        {t('album.myList')}
                      </span>
                      <span className="block text-xs text-white/50">
                        {t('album.myListDesc')}
                      </span>
                    </span>
                  </button>
                  <div className="h-px bg-white/10" />
                  <button
                    onClick={() => {
                      onShareAlbum()
                      setShareOpen(false)
                    }}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5"
                  >
                    <FiUsers className="mt-0.5 shrink-0 text-accent" />
                    <span>
                      <span className="block text-sm font-semibold text-white">
                        {t('album.emptyAlbum')}
                      </span>
                      <span className="block text-xs text-white/50">
                        {t('album.emptyAlbumDesc')}
                      </span>
                    </span>
                  </button>
                  {canShareImage && (
                    <>
                      <div className="h-px bg-white/10" />
                      <button
                        onClick={() => {
                          onShareImage()
                          setShareOpen(false)
                        }}
                        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5"
                      >
                        <FiImage className="mt-0.5 shrink-0 text-accent" />
                        <span>
                          <span className="block text-sm font-semibold text-white">
                            {t('album.asImage')}
                          </span>
                          <span className="block text-xs text-white/50">
                            {t('album.asImageDesc')}
                          </span>
                        </span>
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
          <button
            onClick={onExport}
            disabled={exporting}
            className="flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-medium text-white/90 transition-colors hover:border-white/60 disabled:opacity-50"
          >
            <FiDownload />
            {exporting ? t('album.exporting') : t('album.export')}
          </button>
          <button
            onClick={onInfo}
            aria-label={t('album.decipher')}
            className="flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-medium text-white/90 transition-colors hover:border-white/60"
          >
            <FiInfo />
            {t('album.decipher')}
          </button>
          {editable && (
            <button
              onClick={onReset}
              aria-label={t('album.reset')}
              className="flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-medium text-white/60 transition-colors hover:border-white/60 hover:text-white"
            >
              <FiRotateCcw />
              {t('album.reset')}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
