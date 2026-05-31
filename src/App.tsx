import { lazy, Suspense } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'

const Home = lazy(() => import('./pages/Home'))
const AlbumPage = lazy(() => import('./pages/AlbumPage'))

function Fade({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex min-h-[100dvh] flex-col"
    >
      {children}
    </motion.div>
  )
}

export default function App() {
  const location = useLocation()
  return (
    <>
      <Navbar />
      <Suspense fallback={<div className="min-h-[100dvh]" />}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={
                <Fade>
                  <Home />
                  <Footer />
                </Fade>
              }
            />
            <Route
              path="/a/:albumId"
              element={
                <Fade>
                  <AlbumPage />
                  <Footer />
                </Fade>
              }
            />
            <Route
              path="*"
              element={
                <Fade>
                  <Home />
                  <Footer />
                </Fade>
              }
            />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </>
  )
}
