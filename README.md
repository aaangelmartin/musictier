# tier maker - aaa.

busca un álbum, ordena sus canciones por tiers, descífralo y comparte el link para que
otros hagan el suyo. estética de marca `aaa.` en modo oscuro (`#0a0a0a`, acento cian).

## qué hace

- **buscar** álbumes y artistas
- **tier list** de todas las canciones del álbum, arrastrando entre tiers (S/A/B/C/D
  editables, añade/quita/recolorea filas)
- **descifrar**: panel con toda la metadata de álbum y canciones + previews de 30s
- **exportar** la tier list a png
- **compartir** el link `/a/:id`: abre el álbum vacío para que cada visitante haga su
  propia tier list (el progreso se guarda en `localStorage`, sin backend)

## stack

react 19, typescript, vite 7, tailwind v4, react router v7, framer motion, gsap,
@dnd-kit, html-to-image, react-icons. backend: una cloudflare pages function que hace de
proxy.

## desarrollo

```bash
npm install
npm run dev      # sirve la app y /api/* en el mismo proceso (sin wrangler)
```

sin credenciales de apple, la búsqueda usa la **itunes search api** automáticamente
(gratis, sin auth). suficiente para todo: búsqueda, metadata y previews de 30s.

otros scripts:

```bash
npm run build      # tsc + vite build
npm run lint       # prettier --check
npm run pages:dev  # ejecuta las funciones reales con wrangler
```

## apple music (opcional, metadata más rica)

necesitas una clave `.p8` con la **capability MusicKit habilitada** (una clave APNs normal
no sirve), su **Key ID**, y tu **Team ID**. se guardan como secrets de cloudflare, nunca en
el repo:

```bash
wrangler pages secret put APPLE_TEAM_ID
wrangler pages secret put MUSICKIT_KEY_ID
wrangler pages secret put MUSICKIT_PRIVATE_KEY   # pega el contenido del .p8
```

en local, expórtalas como variables de entorno antes de `npm run dev`. el developer token
se firma en el servidor (ES256) y **nunca** llega al cliente.

## deploy

### github pages (por defecto)

el workflow `.github/workflows/deploy.yml` construye y publica en cada push a `main`. en
hosting estático no hay backend, así que el cliente habla con itunes directamente (jsonp) y
el export usa images.weserv.nl para el artwork. la búsqueda, las tier lists, las previews y
el export funcionan sin servidor. url: `https://aaangelmartin.github.io/MusicTierMaker/`.

### cloudflare pages (opcional, para apple music)

build `npm run build`, output `dist`. las funciones en `/functions` se despliegan solas y,
con las credenciales de apple, dan metadata más rica. la reproducción completa para
suscriptores (login con musickit js) queda como fase posterior.
