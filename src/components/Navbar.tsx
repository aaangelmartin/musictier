import { Link, useLocation } from 'react-router-dom'
import { Logo } from './Logo'

export function Navbar() {
  const { pathname } = useLocation()
  const onHome = pathname === '/'

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
      {/* brand-style gradient fade from the bg color at the top */}
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-bg via-bg/80 to-transparent" />
      <nav className="pointer-events-auto relative mx-auto flex h-12 max-w-5xl items-center justify-between px-4 md:px-6">
        <Logo className="text-xl" />
        <div className="flex items-center gap-5 text-sm font-medium">
          <Link
            to="/"
            className={`transition-opacity hover:opacity-80 ${
              onHome ? 'opacity-100' : 'opacity-50'
            }`}
          >
            buscar
          </Link>
          <a
            href="https://aaangelmartin.com"
            target="_blank"
            rel="noreferrer"
            className="opacity-50 transition-opacity hover:opacity-80"
          >
            aaangelmartin
          </a>
        </div>
      </nav>
    </header>
  )
}
