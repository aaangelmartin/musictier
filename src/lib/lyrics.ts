// Lyrics from LRCLIB (lrclib.net): free, no auth, CORS-enabled. We try the exact
// /get endpoint first (artist + track + album + duration) and fall back to the
// fuzzy /search endpoint. Plain lyrics only (no synced timestamps).

interface LrclibEntry {
  plainLyrics?: string | null
  syncedLyrics?: string | null
  instrumental?: boolean
}

function plain(entry: LrclibEntry | undefined): string | null {
  if (!entry) return null
  if (entry.instrumental) return '[instrumental]'
  return entry.plainLyrics?.trim() || null
}

export async function getLyrics(
  artist: string,
  track: string,
  album?: string,
  durationMs?: number,
): Promise<string | null> {
  const get = new URLSearchParams({ artist_name: artist, track_name: track })
  if (album) get.set('album_name', album)
  if (durationMs) get.set('duration', String(Math.round(durationMs / 1000)))

  try {
    const res = await fetch(`https://lrclib.net/api/get?${get.toString()}`)
    if (res.ok) {
      const direct = plain((await res.json()) as LrclibEntry)
      if (direct) return direct
    }
  } catch {
    /* fall through to search */
  }

  try {
    const q = new URLSearchParams({ track_name: track, artist_name: artist })
    const res = await fetch(`https://lrclib.net/api/search?${q.toString()}`)
    if (res.ok) {
      const list = (await res.json()) as LrclibEntry[]
      for (const entry of list) {
        const p = plain(entry)
        if (p) return p
      }
    }
  } catch {
    /* no lyrics */
  }
  return null
}
