import { handleApi } from '../_shared/handlers'
import type { AppleEnv } from '../_shared/jwt'

// Cloudflare Pages Function: GET /api/artwork
export const onRequestGet: PagesFunction<AppleEnv> = ({ request, env }) => {
  return handleApi(new URL(request.url), env, Math.floor(Date.now() / 1000))
}
