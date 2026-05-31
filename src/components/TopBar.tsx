import { Link } from 'react-router-dom'

// Minimal app-specific top bar. Intentionally NOT the aaa. site chrome.
export function TopBar() {
  return (
    <div className="sticky top-0 z-30 bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-5xl items-center px-4 md:px-6">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm font-semibold text-white transition-opacity hover:opacity-80"
        >
          <span className="h-2.5 w-2.5 rounded-sm bg-accent" />
          tier maker
        </Link>
      </div>
    </div>
  )
}
