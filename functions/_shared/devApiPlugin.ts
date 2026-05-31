import type { Plugin } from 'vite'
import { handleApi } from './handlers'
import type { AppleEnv } from './jwt'

// Vite dev plugin: serves /api/* in-process using the same handler as the
// Cloudflare Pages Function, so `npm run dev` needs no wrangler. Apple Music
// credentials are read from process.env (or a .dev.vars-style export); when
// absent, handlers fall back to the iTunes Search API.
export function devApiPlugin(): Plugin {
  return {
    name: 'music-tier-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next()
        const env: AppleEnv = {
          APPLE_TEAM_ID: process.env.APPLE_TEAM_ID,
          MUSICKIT_KEY_ID: process.env.MUSICKIT_KEY_ID,
          MUSICKIT_PRIVATE_KEY: process.env.MUSICKIT_PRIVATE_KEY,
        }
        const url = new URL(req.url, 'http://localhost')
        const response = await handleApi(url, env, Math.floor(Date.now() / 1000))
        res.statusCode = response.status
        response.headers.forEach((value, key) => res.setHeader(key, value))
        const body = Buffer.from(await response.arrayBuffer())
        res.end(body)
      })
    },
  }
}
