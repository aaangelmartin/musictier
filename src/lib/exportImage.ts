import { toPng } from 'html-to-image'
import { proxiedArtwork } from './api'

// Export a DOM node (the tier board) to a PNG. Artwork comes from Apple's
// mzstatic CDN, which sends no CORS headers and would taint the canvas. The
// only fully reliable fix is to inline each image as a data URL before capture:
// we fetch it through our same-origin /api/artwork proxy, convert to base64,
// swap it in, capture, then restore the originals.

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function setSrc(img: HTMLImageElement, src: string): Promise<void> {
  return new Promise((resolve) => {
    if (img.getAttribute('src') === src) return resolve()
    const done = () => resolve()
    img.addEventListener('load', done, { once: true })
    img.addEventListener('error', done, { once: true })
    img.src = src
  })
}

async function toDataUrl(src: string): Promise<string | null> {
  try {
    const res = await fetch(src.startsWith('/api/artwork') ? src : proxiedArtwork(src))
    if (!res.ok) return null
    return await blobToDataUrl(await res.blob())
  } catch {
    return null
  }
}

export async function exportBoard(node: HTMLElement, filename: string): Promise<void> {
  const imgs = Array.from(node.querySelectorAll('img'))
  const originals = imgs.map((img) => img.getAttribute('src') ?? '')

  // hide controls (play/info/indicators) so only artwork + title are captured
  const hidden = Array.from(node.querySelectorAll<HTMLElement>('[data-export-hide]'))
  const prevDisplay = hidden.map((el) => el.style.display)
  hidden.forEach((el) => (el.style.display = 'none'))

  // inline every artwork as a data url so html-to-image embeds it for sure
  const dataUrls = await Promise.all(originals.map(toDataUrl))
  await Promise.all(
    imgs.map((img, i) => (dataUrls[i] ? setSrc(img, dataUrls[i]!) : Promise.resolve())),
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
    hidden.forEach((el, i) => (el.style.display = prevDisplay[i]))
    await Promise.all(imgs.map((img, i) => setSrc(img, originals[i])))
  }
}
