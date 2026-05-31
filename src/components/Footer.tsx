import { useI18n } from '../lib/i18n'

// App-specific footer (not the aaa. site footer).
export function Footer() {
  const { t } = useI18n()
  return (
    <footer className="mx-auto mt-auto w-full max-w-5xl px-4 pb-10 pt-16 md:px-6">
      <div className="flex flex-col items-center gap-2 border-t border-white/10 pt-6 text-center">
        <span className="text-sm font-bold text-accent">musictier.</span>
        <p className="text-xs text-white/40">{t('footer.tagline')}</p>
        <p className="text-xs text-white/30">
          {t('footer.by')}{' '}
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
