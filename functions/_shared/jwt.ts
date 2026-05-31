// Mints an Apple Music developer token (ES256 JWT) using Web Crypto, which is
// available both in Cloudflare Workers and modern Node. The signed token never
// leaves the server in v1 — handlers use it to call api.music.apple.com.
//
// CRITICAL: SubtleCrypto's ECDSA/P-256/SHA-256 signature is already in JOSE
// r||s (IEEE P1363) form — exactly what JWT expects. Do NOT DER-encode it.

export interface AppleEnv {
  APPLE_TEAM_ID?: string
  MUSICKIT_KEY_ID?: string
  MUSICKIT_PRIVATE_KEY?: string
}

export function hasAppleCreds(env: AppleEnv): boolean {
  return Boolean(env.APPLE_TEAM_ID && env.MUSICKIT_KEY_ID && env.MUSICKIT_PRIVATE_KEY)
}

function base64url(input: ArrayBuffer | string): string {
  let bytes: Uint8Array
  if (typeof input === 'string') {
    bytes = new TextEncoder().encode(input)
  } else {
    bytes = new Uint8Array(input)
  }
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s+/g, '')
  const bin = atob(body)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return buf.buffer
}

// Simple in-memory cache; tokens are valid for months, we keep a short TTL.
let cached: { token: string; exp: number } | null = null

export async function getDeveloperToken(env: AppleEnv, now: number): Promise<string> {
  if (cached && cached.exp - 60 > now) return cached.token

  const teamId = env.APPLE_TEAM_ID!
  const keyId = env.MUSICKIT_KEY_ID!
  // Support keys pasted with literal "\n" sequences (e.g. via wrangler secret).
  const pem = env.MUSICKIT_PRIVATE_KEY!.replace(/\\n/g, '\n')

  const iat = now
  const exp = now + 60 * 60 * 12 // 12h — well under Apple's 6-month max
  const header = { alg: 'ES256', kid: keyId }
  const payload = { iss: teamId, iat, exp }
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(
    JSON.stringify(payload),
  )}`

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(pem),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput),
  )
  const token = `${signingInput}.${base64url(sig)}`
  cached = { token, exp }
  return token
}
