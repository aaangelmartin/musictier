import { useSyncExternalStore } from 'react'

// A single shared <audio> so only one 30s preview plays at a time across the
// whole board. Components subscribe to know which track id is currently playing.

let audio: HTMLAudioElement | null = null
let currentId: string | null = null
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function ensureAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio()
    audio.addEventListener('ended', () => {
      currentId = null
      emit()
    })
  }
  return audio
}

export function togglePreview(id: string, url: string | undefined) {
  if (!url) return
  const el = ensureAudio()
  if (currentId === id) {
    el.pause()
    currentId = null
    emit()
    return
  }
  el.src = url
  el.currentTime = 0
  void el.play().catch(() => {
    currentId = null
    emit()
  })
  currentId = id
  emit()
}

export function stopPreview() {
  if (audio) audio.pause()
  currentId = null
  emit()
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function usePlayingId(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => currentId,
    () => null,
  )
}
