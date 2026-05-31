import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { devApiPlugin } from './functions/_shared/devApiPlugin'

// `npm run dev` serves /api/* in-process via devApiPlugin (reusing the exact same
// handler the Cloudflare Pages Function uses), so no wrangler is needed for local
// work. `npm run pages:dev` runs the real Functions runtime instead.
export default defineConfig({
  plugins: [react(), tailwindcss(), devApiPlugin()],
})
