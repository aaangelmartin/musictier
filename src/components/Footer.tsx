import { FiGithub, FiInstagram, FiMail } from 'react-icons/fi'
import { Logo } from './Logo'

export function Footer() {
  return (
    <footer className="mx-auto mt-auto w-full max-w-5xl px-4 py-12 md:px-6">
      <div className="border-t border-white/20 pt-8">
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col items-center gap-3 md:items-start">
            <Logo className="text-lg" />
            <div className="flex items-center gap-4 text-white/50">
              <a
                href="https://github.com/aaangelmartin"
                target="_blank"
                rel="noreferrer"
                aria-label="github"
                className="transition-opacity hover:opacity-100"
              >
                <FiGithub />
              </a>
              <a
                href="https://instagram.com/aaangelmartin"
                target="_blank"
                rel="noreferrer"
                aria-label="instagram"
                className="transition-opacity hover:opacity-100"
              >
                <FiInstagram />
              </a>
              <a
                href="mailto:hola@aaangelmartin.com"
                aria-label="mail"
                className="transition-opacity hover:opacity-100"
              >
                <FiMail />
              </a>
            </div>
          </div>
          <p className="text-xs text-white/30">
            tier maker, un proyecto de ángel martín. datos vía apple music / itunes.
          </p>
        </div>
      </div>
    </footer>
  )
}
