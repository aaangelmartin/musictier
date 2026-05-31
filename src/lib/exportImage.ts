import { proxiedArtwork } from './api'
import type { BoardState } from './tierStorage'
import { UNRANKED } from './tierStorage'
import type { Track } from './types'

// We render the export on a canvas instead of html-to-image: the cards use
// aspect-ratio + object-cover, which foreignObject-based capture renders
// unreliably (blank artwork). Drawing manually guarantees the images appear.
// Artwork is loaded through images.weserv.nl (CORS) so the canvas is not tainted.

interface ExportInput {
  board: BoardState
  trackMap: Record<string, Track>
  albumName: string
  artistName?: string
  albumArtUrl?: string
  filename: string
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!url) return resolve(null)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = proxiedArtwork(url)
  })
}

function rr(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

// wrap into at most `maxLines` lines, breaking over-long words, ellipsis if cut
function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  maxLines: number,
): string[] {
  const lines: string[] = []
  let cur = ''
  const pushWord = (word: string) => {
    let w = word
    while (w.length) {
      const candidate = cur ? `${cur} ${w}` : w
      if (ctx.measureText(candidate).width <= maxW) {
        cur = candidate
        return
      }
      if (!cur) {
        // single word too long: take as many chars as fit
        let i = w.length
        while (i > 1 && ctx.measureText(w.slice(0, i)).width > maxW) i--
        lines.push(w.slice(0, i))
        w = w.slice(i)
        if (lines.length >= maxLines) return
      } else {
        lines.push(cur)
        cur = ''
        if (lines.length >= maxLines) return
      }
    }
  }
  for (const word of text.split(/\s+/)) {
    if (lines.length >= maxLines) break
    pushWord(word)
  }
  if (cur && lines.length < maxLines) lines.push(cur)
  if (lines.length === maxLines) {
    // mark truncation if there was more text than drawn
    const drawn = lines.join(' ')
    if (drawn.length < text.length) {
      let last = lines[maxLines - 1]
      while (last.length && ctx.measureText(`${last}…`).width > maxW)
        last = last.slice(0, -1)
      lines[maxLines - 1] = `${last}…`
    }
  }
  return lines
}

export async function exportBoard({
  board,
  trackMap,
  albumName,
  artistName,
  albumArtUrl,
  filename,
}: ExportInput): Promise<void> {
  const W = 1080
  const PAD = 28
  const CARD = 104
  const LABEL = CARD // tier label is the same square size as the song cards
  const COVER = CARD // album cover in the header matches too
  const GAP = 10
  const HEADER_H = PAD + COVER + 24
  const ROW_GAP = 10

  // make sure Outfit is available so canvas text matches the app
  if (document.fonts?.ready) await document.fonts.ready

  const contentX = PAD + LABEL + GAP
  const contentW = W - contentX - PAD
  const cols = Math.max(1, Math.floor((contentW + GAP) / (CARD + GAP)))

  // layout pass: compute row heights and total height
  const rows = board.tiers.map((tier) => {
    const ids = board.items[tier.id] ?? []
    const n = ids.length
    const r = Math.max(0, Math.ceil(n / cols))
    const cardsH = r > 0 ? r * CARD + (r - 1) * GAP : 0
    return { tier, ids, height: Math.max(LABEL, cardsH) }
  })

  let H = HEADER_H
  for (const row of rows) H += row.height + ROW_GAP
  H += PAD

  // preload every artwork we need (track thumbnails + album cover)
  void UNRANKED // unranked tray is intentionally not exported
  const ids = new Set<string>()
  rows.forEach((r) => r.ids.forEach((id) => ids.add(id)))
  const entries = [...ids]
  const [imgs, albumImg] = await Promise.all([
    Promise.all(entries.map((id) => loadImage(trackMap[id]?.artworkUrl ?? ''))),
    loadImage(albumArtUrl ?? ''),
  ])
  const imgMap = new Map<string, HTMLImageElement | null>()
  entries.forEach((id, i) => imgMap.set(id, imgs[i]))

  const dpr = 2
  const canvas = document.createElement('canvas')
  canvas.width = W * dpr
  canvas.height = H * dpr
  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)
  ctx.textBaseline = 'alphabetic'

  // background
  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, W, H)

  // header, top-left: album cover (card-sized) + name + artist, text centred
  if (albumImg) {
    ctx.save()
    rr(ctx, PAD, PAD, COVER, COVER, 12)
    ctx.clip()
    ctx.drawImage(albumImg, PAD, PAD, COVER, COVER)
    ctx.restore()
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    rr(ctx, PAD, PAD, COVER, COVER, 12)
    ctx.fill()
  }
  const tx = PAD + COVER + 18
  const midY = PAD + COVER / 2
  ctx.textAlign = 'left'
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 28px Outfit, sans-serif'
  ctx.fillText(albumName, tx, midY - 2, W - tx - 180)
  if (artistName) {
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.font = '500 17px Outfit, sans-serif'
    ctx.fillText(artistName, tx, midY + 24, W - tx - 180)
  }

  // header, top-right: branding
  ctx.textAlign = 'right'
  ctx.fillStyle = '#00b5e2'
  ctx.font = '700 22px Outfit, sans-serif'
  ctx.fillText('tier maker.', W - PAD, midY - 4)
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.font = '500 13px Outfit, sans-serif'
  ctx.fillText('aaangelmartin.com', W - PAD, midY + 18)
  ctx.textAlign = 'left'

  let y = HEADER_H

  for (const row of rows) {
    // label
    ctx.fillStyle = row.tier.color
    rr(ctx, PAD, y, LABEL, LABEL, 14)
    ctx.fill()
    ctx.fillStyle = 'rgba(0,0,0,0.8)'
    ctx.font = '700 44px Outfit, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(row.tier.label, PAD + LABEL / 2, y + LABEL / 2 + 16)
    ctx.textAlign = 'left'

    // cards
    row.ids.forEach((id, i) => {
      const cx = contentX + (i % cols) * (CARD + GAP)
      const cy = y + Math.floor(i / cols) * (CARD + GAP)
      const img = imgMap.get(id)
      ctx.save()
      rr(ctx, cx, cy, CARD, CARD, 10)
      ctx.clip()
      if (img) {
        ctx.drawImage(img, cx, cy, CARD, CARD)
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.08)'
        ctx.fillRect(cx, cy, CARD, CARD)
      }
      // scrim
      const grad = ctx.createLinearGradient(0, cy + CARD * 0.45, 0, cy + CARD)
      grad.addColorStop(0, 'rgba(0,0,0,0)')
      grad.addColorStop(1, 'rgba(0,0,0,0.92)')
      ctx.fillStyle = grad
      ctx.fillRect(cx, cy, CARD, CARD)
      // title
      const name = trackMap[id]?.name ?? ''
      ctx.font = '600 13px Outfit, sans-serif'
      ctx.fillStyle = '#ffffff'
      const lineH = 15
      const lines = wrapLines(ctx, name, CARD - 14, 3)
      let ty = cy + CARD - 8 - (lines.length - 1) * lineH
      for (const line of lines) {
        ctx.fillText(line, cx + 7, ty)
        ty += lineH
      }
      ctx.restore()
    })

    y += row.height + ROW_GAP
  }

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'))
  if (!blob) return
  const link = document.createElement('a')
  link.download = filename
  link.href = URL.createObjectURL(blob)
  link.click()
  URL.revokeObjectURL(link.href)
}
