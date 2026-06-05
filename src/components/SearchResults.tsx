import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useI18n } from '../lib/i18n'
import type { AlbumSummary, ArtistSummary } from '../lib/types'

interface Props {
  artists: ArtistSummary[]
  albums: AlbumSummary[]
  loading: boolean
  error?: string
  query: string
}

export function SearchResults({ artists, albums, loading, error, query }: Props) {
  const { t } = useI18n()
  if (error) {
    return (
      <p className="py-10 text-center text-white/50">
        {t('results.error')} {error}
      </p>
    )
  }
  if (loading) {
    return <p className="py-10 text-center text-white/50">{t('results.searching')}</p>
  }
  if (query && artists.length === 0 && albums.length === 0) {
    return (
      <p className="py-10 text-center text-white/50">
        {t('results.noResultsFor')} “{query}”.
      </p>
    )
  }
  if (artists.length === 0 && albums.length === 0) return null

  return (
    <div className="space-y-8 py-8">
      {artists.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">
            {t('results.artists')}
          </h2>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {artists.map((artist, i) => (
              <motion.li
                key={artist.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: Math.min(i * 0.03, 0.3),
                  ease: 'easeOut',
                }}
              >
                <Link
                  to={`/artist/${artist.id}`}
                  className="group flex items-center gap-3"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5">
                    {artist.artworkUrl ? (
                      <img
                        src={artist.artworkUrl}
                        alt={artist.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-lg font-bold text-white/40">
                        {artist.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="normal-case min-w-0 truncate text-sm font-semibold text-white group-hover:text-accent">
                    {artist.name}
                  </p>
                </Link>
              </motion.li>
            ))}
          </ul>
        </section>
      )}

      {albums.length > 0 && (
        <section>
          {artists.length > 0 && (
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">
              {t('results.albums')}
            </h2>
          )}
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {albums.map((album, i) => (
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
                  <p className="normal-case truncate text-xs text-white/50">
                    {album.artistName}
                    {album.year ? ` - ${album.year}` : ''}
                  </p>
                </Link>
              </motion.li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
