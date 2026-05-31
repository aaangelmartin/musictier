# musictier

Search for any album and build a tier list of its songs. Rank tracks by dragging
them into tiers, preview them, read the lyrics, export the result as an image, and
share a link that carries your exact ranking.

Live: https://aaangelmartin.com/musictier/

musictier is open source and runs entirely in the browser. There is no backend
and no login: the catalog comes from the public iTunes Search API and lyrics from
LRCLIB, both queried directly from the client.

## Features

- Album and artist search.
- Drag-and-drop tier list of every track on an album, with editable tier labels,
  colors, and rows.
- 30-second previews, lyrics, and a detail panel with album and track metadata.
- PNG export of the finished tier list.
- Shareable links: the full ranking is encoded in the URL, so anyone who opens it
  sees your exact tier list. Progress is also saved locally in the browser.

## Tech stack

React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7, Framer Motion, and
dnd-kit.

## Getting started

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

### Scripts

| Command         | Description                          |
| --------------- | ------------------------------------ |
| `npm run dev`   | Start the development server.        |
| `npm run build` | Type-check and build for production. |
| `npm run lint`  | Check formatting with Prettier.      |

## Deployment

A GitHub Actions workflow builds and publishes to GitHub Pages on every push to
`main`. The build base path is derived from the repository name, so the project is
served from `https://<user>.github.io/<repo>/` (or a custom domain).

## License

MIT
