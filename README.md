# musictier

Search for any album and build a tier list of its songs. Rank tracks by dragging
them into tiers, preview them, inspect full metadata, export the result as an
image, and share a link that carries your exact ranking.

Live: https://aaangelmartin.com/musictier/

## Features

- Album and artist search backed by the Apple catalog.
- Drag-and-drop tier list of every track on an album, with editable tier labels,
  colors, and rows.
- 30-second previews and a detail panel with album, track, and artist metadata.
- PNG export of the finished tier list.
- Shareable links: the full ranking is encoded in the URL, so anyone who opens it
  sees your exact tier list. Progress is also saved locally in the browser.

## Tech stack

React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7, Framer Motion,
dnd-kit, and a Cloudflare Pages Function used as an optional API proxy.

## Getting started

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

The dev server runs the app and the `/api/*` endpoints in a single process, so no
extra tooling is required. With no Apple credentials configured, search falls back
to the iTunes Search API, which covers search, metadata, and previews.

### Scripts

| Command             | Description                                               |
| ------------------- | --------------------------------------------------------- |
| `npm run dev`       | Start the development server.                             |
| `npm run build`     | Type-check and build for production.                      |
| `npm run lint`      | Check formatting with Prettier.                           |
| `npm run pages:dev` | Run the Cloudflare Pages Functions locally with Wrangler. |

## Configuration (optional)

Richer metadata is available through the Apple Music API. It requires a MusicKit
`.p8` key (a standard APNs key will not work), its Key ID, and your Team ID. These
are stored as encrypted secrets, never in the repository:

```bash
wrangler pages secret put APPLE_TEAM_ID
wrangler pages secret put MUSICKIT_KEY_ID
wrangler pages secret put MUSICKIT_PRIVATE_KEY
```

The developer token is signed server-side (ES256) and is never exposed to the
client. Without these secrets the app works fully against the iTunes Search API.

## Deployment

### GitHub Pages (default)

A GitHub Actions workflow builds and publishes the site on every push to `main`.
On static hosting there is no backend: the client queries the iTunes Search API
directly, and image export proxies artwork through a CORS-enabled image service.
Search, tier lists, previews, export, and sharing all work without a server.

### Cloudflare Pages (optional)

Build command `npm run build`, output directory `dist`. The functions in
`/functions` deploy automatically and, together with the Apple credentials above,
enable richer metadata. Full playback for Apple Music subscribers (MusicKit JS
sign-in) is planned for a later release.
