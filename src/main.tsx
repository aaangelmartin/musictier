import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/theme.css'
import App from './App'
import { LangProvider } from './lib/i18n'

// strip trailing slash so '/musictier/' -> '/musictier' and '/' -> ''
const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LangProvider>
      <BrowserRouter basename={basename}>
        <App />
      </BrowserRouter>
    </LangProvider>
  </StrictMode>,
)

// register the service worker (PWA install + offline shell) in production
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const base = import.meta.env.BASE_URL
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => {})
  })
}
