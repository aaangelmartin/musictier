import { Link } from 'react-router-dom'
import { FiX } from 'react-icons/fi'
import { useI18n } from '../lib/i18n'
import type { SavedListMeta } from '../lib/tierStorage'

interface Props {
  lists: SavedListMeta[]
  onRemove: (id: string) => void
}

export function SavedLists({ lists, onRemove }: Props) {
  const { t } = useI18n()
  if (!lists.length) return null

  return (
    <section className="py-8">
      <h2 className="mb-4 text-sm font-semibold tracking-widest text-white/50">
        {t('saved.title')}
      </h2>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {lists.map((l) => (
          <li key={l.id} className="group relative">
            <Link to={`/a/${l.id}`} className="block">
              <div className="relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-white/5">
                {l.art && (
                  <img
                    src={l.art}
                    alt={l.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                )}
                <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-accent backdrop-blur-sm">
                  {l.ranked}/{l.total}
                </span>
              </div>
              <p className="normal-case mt-2 truncate text-sm font-semibold text-white">
                {l.name}
              </p>
              <p className="normal-case truncate text-xs text-white/50">{l.artist}</p>
            </Link>
            <button
              onClick={() => onRemove(l.id)}
              aria-label={t('saved.remove')}
              className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white/80 opacity-0 backdrop-blur-sm transition-opacity hover:text-white group-hover:opacity-100"
            >
              <FiX size={15} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
