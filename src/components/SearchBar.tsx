import { FiSearch, FiX } from 'react-icons/fi'
import { useI18n } from '../lib/i18n'

interface Props {
  value: string
  onChange: (v: string) => void
  autoFocus?: boolean
}

export function SearchBar({ value, onChange, autoFocus }: Props) {
  const { t } = useI18n()
  return (
    <div className="relative w-full">
      <FiSearch className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-white/50" />
      <input
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('search.placeholder')}
        className="w-full rounded-full border border-white/20 bg-white/5 py-3.5 pl-12 pr-12 text-base text-white placeholder:text-white/40 outline-none transition-colors focus:border-accent focus:bg-white/10"
        aria-label={t('search.placeholder')}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          aria-label={t('search.clear')}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 transition-opacity hover:opacity-100"
        >
          <FiX />
        </button>
      )}
    </div>
  )
}
