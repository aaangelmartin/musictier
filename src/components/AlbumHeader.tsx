import { FiCheck, FiDownload, FiInfo, FiRotateCcw, FiShare2 } from 'react-icons/fi'
import type { AlbumDetail } from '../lib/types'

interface Props {
  album: AlbumDetail
  copied: boolean
  exporting: boolean
  onShare: () => void
  onExport: () => void
  onReset: () => void
  onInfo: () => void
}

export function AlbumHeader({
  album,
  copied,
  exporting,
  onShare,
  onExport,
  onReset,
  onInfo,
}: Props) {
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
          {album.year ? ` · ${album.year}` : ''} · {album.tracks.length} canciones
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={onShare}
            className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
          >
            {copied ? <FiCheck /> : <FiShare2 />}
            {copied ? 'link copiado' : 'compartir'}
          </button>
          <button
            onClick={onExport}
            disabled={exporting}
            className="flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-medium text-white/90 transition-colors hover:border-white/60 disabled:opacity-50"
          >
            <FiDownload />
            {exporting ? 'exportando...' : 'exportar png'}
          </button>
          <button
            onClick={onInfo}
            aria-label="info del álbum"
            className="flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-medium text-white/90 transition-colors hover:border-white/60"
          >
            <FiInfo />
            descifrar
          </button>
          <button
            onClick={onReset}
            aria-label="reiniciar tier list"
            className="flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-medium text-white/60 transition-colors hover:border-white/60 hover:text-white"
          >
            <FiRotateCcw />
            reiniciar
          </button>
        </div>
      </div>
    </header>
  )
}
