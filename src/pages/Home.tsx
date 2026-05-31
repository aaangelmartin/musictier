import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SearchBar } from '../components/SearchBar'
import { SearchResults } from '../components/SearchResults'
import { useDebounce } from '../lib/useDebounce'
import { searchAlbums } from '../lib/api'
import type { AlbumSummary } from '../lib/types'

export default function Home() {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [albums, setAlbums] = useState<AlbumSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  const debounced = useDebounce(query)
  const reqId = useRef(0)

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

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-12 pt-28 md:px-6">
      <section className="py-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          tier list de cualquier álbum
        </h1>
        <p className="normal-case mx-auto mt-4 max-w-xl text-white/80">
          busca un disco, ordena sus canciones por tiers, descífralo y comparte el link
          para que otros hagan el suyo.
        </p>
      </section>

      <div className="mx-auto max-w-xl">
        <SearchBar value={query} onChange={setQuery} autoFocus />
      </div>

      <SearchResults albums={albums} loading={loading} error={error} query={debounced} />
    </main>
  )
}
