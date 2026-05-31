import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SearchBar } from '../components/SearchBar'
import { SearchResults } from '../components/SearchResults'
import { SavedLists } from '../components/SavedLists'
import { useDebounce } from '../lib/useDebounce'
import { searchAlbums } from '../lib/api'
import { getSavedLists, removeSavedList, type SavedListMeta } from '../lib/tierStorage'
import type { AlbumSummary } from '../lib/types'

const SUGGESTIONS = [
  'currents',
  'blonde',
  'el odio siempre gana',
  'random access memories',
]

export default function Home() {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [albums, setAlbums] = useState<AlbumSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [saved, setSaved] = useState<SavedListMeta[]>([])
  const debounced = useDebounce(query)
  const reqId = useRef(0)

  useEffect(() => setSaved(getSavedLists()), [])

  // keep ?q= in the url so a search is itself shareable / reloadable
  useEffect(() => {
    const next = new URLSearchParams(params)
    if (debounced) next.set('q', debounced)
    else next.delete('q')
    setParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  useEffect(() => {
    const term = debounced.trim()
    if (!term) {
      setAlbums([])
      setError(undefined)
      return
    }
    const id = ++reqId.current
    setLoading(true)
    setError(undefined)
    searchAlbums(term)
      .then((res) => {
        if (id === reqId.current) setAlbums(res)
      })
      .catch((e) => {
        if (id === reqId.current) setError(String(e.message ?? e))
      })
      .finally(() => {
        if (id === reqId.current) setLoading(false)
      })
  }, [debounced])

  function handleRemove(id: string) {
    removeSavedList(id)
    setSaved(getSavedLists())
  }

  const searching = debounced.trim().length > 0

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-12 pt-10 md:px-6">
      <section className="py-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          <span className="text-accent">tier list</span> de cualquier álbum
        </h1>
        <p className="normal-case mx-auto mt-4 max-w-xl text-white/80">
          busca un disco, ordena sus canciones por tiers, lee sus letras y comparte tu
          ranking. sin cuentas, sin login.
        </p>
      </section>

      <div className="mx-auto max-w-xl">
        <SearchBar value={query} onChange={setQuery} autoFocus />
        {!searching && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setQuery(s)}
                className="normal-case rounded-full border border-white/20 px-3 py-1 text-xs text-white/60 transition-colors hover:border-accent hover:text-white"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {searching ? (
        <SearchResults
          albums={albums}
          loading={loading}
          error={error}
          query={debounced}
        />
      ) : (
        <SavedLists lists={saved} onRemove={handleRemove} />
      )}
    </main>
  )
}
