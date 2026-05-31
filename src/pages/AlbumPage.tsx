import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlbumHeader } from '../components/AlbumHeader'
import { TierBoard } from '../components/TierBoard'
import { DetailDrawer } from '../components/DetailDrawer'
import { getAlbum } from '../lib/api'
import { exportBoard } from '../lib/exportImage'
import { stopPreview } from '../lib/audioStore'
import { loadBoard, resetBoard, saveBoard, type BoardState } from '../lib/tierStorage'
import type { AlbumDetail, Track } from '../lib/types'

export default function AlbumPage() {
  const { albumId = '' } = useParams()
  const [album, setAlbum] = useState<AlbumDetail | null>(null)
  const [error, setError] = useState<string>()
  const [board, setBoard] = useState<BoardState | null>(null)
  const [detail, setDetail] = useState<Track | 'album' | null>(null)
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  // load album + its saved (or fresh) board
  useEffect(() => {
    let alive = true
    setAlbum(null)
    setError(undefined)
    setBoard(null)
    stopPreview()
    getAlbum(albumId)
      .then((a) => {
        if (!alive) return
        setAlbum(a)
        setBoard(loadBoard(a.id, a.tracks))
      })
      .catch((e) => alive && setError(String(e.message ?? e)))
    return () => {
      alive = false
    }
  }, [albumId])

  // persist on every board change
  useEffect(() => {
    if (album && board) saveBoard(album.id, board)
  }, [album, board])

  const trackMap = useMemo(() => {
    const m: Record<string, Track> = {}
    album?.tracks.forEach((t) => (m[t.id] = t))
    return m
  }, [album])

  function handleShare() {
    navigator.clipboard
      ?.writeText(window.location.href)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      })
      .catch(() => {})
  }

  async function handleExport() {
    if (!exportRef.current || !album) return
    setExporting(true)
    try {
      const slug = album.name
        .replace(/[^a-z0-9]+/gi, '-')
        .toLowerCase()
        .slice(0, 40)
      await exportBoard(exportRef.current, `tierlist-${slug}.png`)
    } finally {
      setExporting(false)
    }
  }

  function handleReset() {
    if (album && board) setBoard(resetBoard(album.id, album.tracks))
  }

  if (error) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-16 text-center md:px-6">
        <p className="text-white/60">no se pudo cargar el álbum: {error}</p>
        <Link to="/" className="mt-4 inline-block text-accent hover:underline">
          volver a buscar
        </Link>
      </main>
    )
  }

  if (!album || !board) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-16 text-center md:px-6">
        <p className="text-accent">cargando álbum...</p>
      </main>
    )
  }

  const detailTrack = detail === 'album' ? null : detail

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-8 md:px-6">
      <AlbumHeader
        album={album}
        copied={copied}
        exporting={exporting}
        onShare={handleShare}
        onExport={handleExport}
        onReset={handleReset}
        onInfo={() => setDetail('album')}
      />

      <div className="mt-8">
        <TierBoard
          board={board}
          setBoard={setBoard as React.Dispatch<React.SetStateAction<BoardState>>}
          trackMap={trackMap}
          onInfo={(t) => setDetail(t)}
          editable
          exportRef={exportRef}
        />
      </div>

      <DetailDrawer
        album={album}
        track={detailTrack}
        open={detail !== null}
        onClose={() => setDetail(null)}
      />
    </main>
  )
}
