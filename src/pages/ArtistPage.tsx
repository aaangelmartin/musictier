import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getArtistDiscography, getArtistImage, type ArtistDiscography } from '../lib/api'
import { useI18n } from '../lib/i18n'

export default function ArtistPage() {
  const { t } = useI18n()
  const { artistId = '' } = useParams()
  const [artist, setArtist] = useState<ArtistDiscography | null>(null)
  const [photo, setPhoto] = useState<string>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    let alive = true
    setArtist(null)
    setPhoto(undefined)
    setError(undefined)
    getArtistDiscography(artistId)
      .then((a) => {
        if (!alive) return
        setArtist(a)
        setPhoto(a.artworkUrl) // album art as a placeholder
        // upgrade to the real Apple Music photo once it resolves (best-effort)
        getArtistImage(a.id, a.appleUrl).then((url) => {
          if (alive && url) setPhoto(url)
        })
      })
      .catch((e) => alive && setError(String(e.message ?? e)))
    return () => {
      alive = false
    }
  }, [artistId])

  if (error) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-16 text-center md:px-6">
        <p className="text-white/60">
          {t('artist.loadError')} {error}
        </p>
        <Link to="/" className="mt-4 inline-block text-accent hover:underline">
          {t('album.back')}
        </Link>
      </main>
    )
  }

  if (!artist) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-16 text-center md:px-6">
        <p className="text-accent">{t('artist.loading')}</p>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-8 md:px-6">
      <Link
        to="/"
        className="normal-case text-sm text-white/50 transition-colors hover:text-accent"
      >
        ← {t('album.back')}
      </Link>

      <header className="mt-6 flex items-center gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5">
          {photo ? (
            <img src={photo} alt={artist.name} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-white/40">
              {artist.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="normal-case truncate text-3xl font-bold tracking-tight sm:text-4xl">
            {artist.name}
          </h1>
          <p className="normal-case mt-1 text-sm text-white/50">
            {artist.albums.length} {t('artist.releases')}
          </p>
        </div>
      </header>

      {artist.albums.length === 0 ? (
        <p className="py-12 text-center text-white/50">{t('artist.noAlbums')}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 py-8 sm:grid-cols-3 md:grid-cols-4">
          {artist.albums.map((album, i) => (
            <motion.li
              key={album.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                delay: Math.min(i * 0.03, 0.3),
                ease: 'easeOut',
              }}
            >
              <Link to={`/a/${album.id}`} className="group block">
                <div className="aspect-square overflow-hidden rounded-xl border border-white/10 bg-white/5">
                  {album.artworkUrl && (
                    <img
                      src={album.artworkUrl}
                      alt={album.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                </div>
                <p className="normal-case mt-2 truncate text-sm font-semibold text-white">
                  {album.name}
                </p>
                {album.year && (
                  <p className="normal-case truncate text-xs text-white/50">
                    {album.year}
                  </p>
                )}
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </main>
  )
}
