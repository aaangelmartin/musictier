import { Link, useLocation } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'

// Minimal app-specific top bar. Intentionally NOT the aaa. site chrome.
export function TopBar() {
  const onHome = useLocation().pathname === '/'

  return (
    <div className="sticky top-0 z-30 border-b border-white/10 bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 md:px-6">
        <Link
          to="/"
          className="text-base font-bold tracking-tight text-accent transition-opacity hover:opacity-80"
        >
          tier maker.
        </Link>

        {!onHome && (
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm font-medium text-white/60 transition-colors hover:text-white"
          >
            <FiArrowLeft size={15} />
            buscar
          </Link>
        )}
      </div>
    </div>
  )
}
