import { Link } from 'react-router-dom'

// The aaa. wordmark. Rendered as text (not the public SVG) so it always uses
// Outfit and the dot is never lost. The dot is part of the mark.
export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="aaa. inicio"
      className={`font-bold tracking-tight text-white transition-opacity hover:opacity-80 ${className}`}
    >
      aaa.
    </Link>
  )
}
