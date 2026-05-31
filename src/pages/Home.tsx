import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SearchBar } from '../components/SearchBar'
import { SearchResults } from '../components/SearchResults'
import { SavedLists } from '../components/SavedLists'
import { useDebounce } from '../lib/useDebounce'
import { searchAlbums } from '../lib/api'
import { getSavedLists, removeSavedList, type SavedListMeta } from '../lib/tierStorage'
import { useI18n } from '../lib/i18n'
import type { AlbumSummary } from '../lib/types'

export default function Home() {
  const { t } = useI18n()
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
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-12 pt-12 md:px-6 md:pt-20">
      <section className="pb-8">
        <h1 className="text-5xl font-bold leading-[0.95] tracking-tight sm:text-6xl">
          {t('home.hero1')} <span className="text-accent">{t('home.heroAccent')}</span>.
        </h1>
        <p className="normal-case mt-5 max-w-lg text-base text-white/70">
          {t('home.subtitle')}
        </p>
      </section>

      <SearchBar value={query} onChange={setQuery} autoFocus />

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
