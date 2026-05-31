import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { AlbumHeader } from '../components/AlbumHeader'
import { TierBoard } from '../components/TierBoard'
import { DetailDrawer } from '../components/DetailDrawer'
import { getAlbum } from '../lib/api'
import { canShareImage, exportBoard, shareImage } from '../lib/exportImage'
import { stopPreview } from '../lib/audioStore'
import {
  decodeBoard,
  encodeBoard,
  loadBoard,
  resetBoard,
  saveBoard,
  upsertSavedList,
  UNRANKED,
  type BoardState,
} from '../lib/tierStorage'
import type { AlbumDetail, Track } from '../lib/types'

export default function AlbumPage() {
  const { albumId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [album, setAlbum] = useState<AlbumDetail | null>(null)
  const [error, setError] = useState<string>()
  const [board, setBoard] = useState<BoardState | null>(null)
  const [detail, setDetail] = useState<Track | 'album' | null>(null)
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)

  // capture a shared (?s=) board once, before it is stripped from the url
  const sharedCode = useRef(searchParams.get('s'))

  // load album + its board: a shared ?s= ranking wins, else the saved/fresh one
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
        const shared = sharedCode.current
          ? decodeBoard(sharedCode.current, a.tracks)
          : null
        if (shared) {
          setBoard(shared)
          saveBoard(a.id, shared)
          // drop ?s= so refreshes and edits use the local copy
          setSearchParams({}, { replace: true })
          sharedCode.current = null
        } else {
          setBoard(loadBoard(a.id, a.tracks))
        }
      })
      .catch((e) => alive && setError(String(e.message ?? e)))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumId])

  // persist on every board change, and record it in "my tier lists" once ranked
  useEffect(() => {
    if (!album || !board) return
    saveBoard(album.id, board)
    const unranked = board.items[UNRANKED]?.length ?? 0
    const ranked = album.tracks.length - unranked
    if (ranked > 0) {
      upsertSavedList({
        id: album.id,
        name: album.name,
        artist: album.artistName,
        art: album.artworkUrl,
        updatedAt: Date.now(),
        ranked,
        total: album.tracks.length,
      })
    }
  }, [album, board])

  const trackMap = useMemo(() => {
    const m: Record<string, Track> = {}
    album?.tracks.forEach((t) => (m[t.id] = t))
    return m
  }, [album])

  function copyLink(url: string) {
    navigator.clipboard
      ?.writeText(url)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      })
      .catch(() => {})
  }

  // share the current ranking, encoded into the link
  function handleShareRanking() {
    if (!album || !board) return
    const url = new URL(window.location.href)
    url.search = ''
    url.searchParams.set('s', encodeBoard(board, album.tracks))
    copyLink(url.toString())
  }

  // share just the album, so each visitor builds their own tier list
  function handleShareAlbum() {
    const url = new URL(window.location.href)
    url.search = ''
    copyLink(url.toString())
  }

  function exportInput() {
    if (!album || !board) return null
    const slug = album.name
      .replace(/[^a-z0-9]+/gi, '-')
      .toLowerCase()
      .slice(0, 40)
    return {
      board,
      trackMap,
      albumName: album.name,
      artistName: album.artistName,
      albumArtUrl: album.artworkUrl,
      filename: `tierlist-${slug}.png`,
    }
  }

  async function handleExport() {
    const input = exportInput()
    if (!input) return
    setExporting(true)
    try {
      await exportBoard(input)
    } finally {
      setExporting(false)
    }
  }

  // share the PNG via the native share sheet, fall back to download
  async function handleShareImage() {
    const input = exportInput()
    if (!input) return
    setExporting(true)
    try {
      const shared = await shareImage(input)
      if (!shared) await exportBoard(input)
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
        canShareImage={canShareImage()}
        onShareRanking={handleShareRanking}
        onShareAlbum={handleShareAlbum}
        onShareImage={handleShareImage}
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
