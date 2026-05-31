import { toPng } from 'html-to-image'
import { proxiedArtwork } from './api'

// Export a DOM node (the tier board) to a PNG. Artwork comes from Apple's
// mzstatic CDN, which has no CORS headers and would taint the canvas. We swap
// every <img> to our same-origin /api/artwork proxy (which DOES send CORS),
// wait for them to reload, capture, then restore the originals.

function load(img: HTMLImageElement, src: string): Promise<void> {
  return new Promise((resolve) => {
    if (img.src === src && img.complete) return resolve()
    const done = () => resolve()
    img.addEventListener('load', done, { once: true })
    img.addEventListener('error', done, { once: true })
    img.crossOrigin = 'anonymous'
    img.src = src
  })
}

export async function exportBoard(node: HTMLElement, filename: string): Promise<void> {
  const imgs = Array.from(node.querySelectorAll('img'))
  const originals = imgs.map((img) => img.getAttribute('src') ?? '')

  await Promise.all(
    imgs.map((img, i) => {
      const src = originals[i]
      if (!src || src.startsWith('/api/artwork')) return Promise.resolve()
      return load(img, proxiedArtwork(src))
    }),
  )

  try {
    const dataUrl = await toPng(node, {
      pixelRatio: 2,
      backgroundColor: '#0a0a0a',
      cacheBust: true,
    })
    const link = document.createElement('a')
    link.download = filename
    link.href = dataUrl
    link.click()
  } finally {
    // restore original srcs so the live board keeps using direct (cacheable) urls
    await Promise.all(imgs.map((img, i) => load(img, originals[i])))
  }
}
