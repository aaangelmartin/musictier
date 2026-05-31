// App-specific footer (not the aaa. site footer).
export function Footer() {
  return (
    <footer className="mx-auto mt-auto w-full max-w-5xl px-4 pb-10 pt-16 md:px-6">
      <div className="flex flex-col items-center gap-2 border-t border-white/10 pt-6 text-center">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-accent text-xs font-bold text-bg">
            t
          </span>
          <span className="text-sm font-semibold text-white">tier maker</span>
        </div>
        <p className="text-xs text-white/40">
          haz tier lists de cualquier álbum. datos de apple music / itunes.
        </p>
        <p className="text-xs text-white/30">
          por{' '}
          <a
            href="https://aaangelmartin.com"
            target="_blank"
            rel="noreferrer"
            className="text-white/50 transition-colors hover:text-accent"
          >
            ángel martín
          </a>
        </p>
      </div>
    </footer>
  )
}
