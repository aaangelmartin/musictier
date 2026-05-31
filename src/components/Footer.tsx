// App-specific footer (not the aaa. site footer).
export function Footer() {
  return (
    <footer className="mx-auto mt-auto w-full max-w-5xl px-4 pb-10 pt-16 md:px-6">
      <div className="flex flex-col items-center gap-2 border-t border-white/10 pt-6 text-center">
        <span className="text-sm font-bold text-accent">musictier.</span>
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
