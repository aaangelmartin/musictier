import { Link, useLocation } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { useI18n, type Lang } from '../lib/i18n'

// Minimal app-specific top bar. Intentionally NOT the aaa. site chrome.
export function TopBar() {
  const onHome = useLocation().pathname === '/'
  const { lang, setLang, t } = useI18n()

  return (
    <div className="sticky top-0 z-30 border-b border-white/10 bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 md:px-6">
        <Link
          to="/"
          className="text-base font-bold tracking-tight text-accent transition-opacity hover:opacity-80"
        >
          musictier.
        </Link>

        <div className="flex items-center gap-4">
          {!onHome && (
            <Link
              to="/"
              className="flex items-center gap-1.5 text-sm font-medium text-white/60 transition-colors hover:text-white"
            >
              <FiArrowLeft size={15} />
              {t('nav.search')}
            </Link>
          )}
          <div className="flex items-center gap-1 text-sm font-medium">
            {(['es', 'en'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`transition-opacity hover:opacity-100 ${
                  lang === l ? 'text-white opacity-100' : 'text-white/40'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
