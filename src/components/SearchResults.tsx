import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { AlbumSummary } from '../lib/types'

interface Props {
  albums: AlbumSummary[]
  loading: boolean
  error?: string
  query: string
}

export function SearchResults({ albums, loading, error, query }: Props) {
  if (error) {
    return <p className="py-10 text-center text-white/50">algo salió mal: {error}</p>
  }
  if (loading) {
    return <p className="py-10 text-center text-white/50">buscando...</p>
  }
  if (query && albums.length === 0) {
    return (
      <p className="py-10 text-center text-white/50">sin resultados para “{query}”.</p>
    )
  }
  if (albums.length === 0) return null

  return (
    <ul className="grid grid-cols-2 gap-4 py-8 sm:grid-cols-3">
      {albums.map((album, i) => (
        <motion.li
          key={album.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3), ease: 'easeOut' }}
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
  )
}
