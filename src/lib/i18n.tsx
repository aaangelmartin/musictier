import { createContext, useContext, useState, type ReactNode } from 'react'

export type Lang = 'es' | 'en'

const STORAGE_KEY = 'musictier:lang'

const dict = {
  es: {
    'nav.search': 'buscar',
    'home.hero1': 'rankea las canciones de',
    'home.heroAccent': 'cualquier álbum',
    'home.subtitle':
      'busca un disco, arrástralo a tiers, lee las letras y comparte tu ranking. sin cuentas, sin login.',
    'search.placeholder': 'busca un álbum o artista...',
    'search.clear': 'limpiar',
    'results.error': 'algo salió mal:',
    'results.searching': 'buscando...',
    'results.noResultsFor': 'sin resultados para',
    'results.artists': 'artistas',
    'results.albums': 'álbumes',
    'artist.loading': 'cargando artista...',
    'artist.loadError': 'no se pudo cargar el artista:',
    'artist.releases': 'lanzamientos',
    'artist.noAlbums': 'sin álbumes ni eps.',
    'saved.title': 'tus tier lists',
    'saved.remove': 'quitar de tus tier lists',
    'album.songs': 'canciones',
    'album.share': 'compartir',
    'album.copied': 'link copiado',
    'album.myList': 'mi tier list',
    'album.myListDesc': 'comparten tu ranking exacto',
    'album.emptyAlbum': 'álbum vacío',
    'album.emptyAlbumDesc': 'cada uno hace el suyo',
    'album.asImage': 'como imagen',
    'album.asImageDesc': 'comparte el png de tu tier list',
    'album.export': 'exportar png',
    'album.exporting': 'exportando...',
    'album.decipher': 'descifrar',
    'album.reset': 'reiniciar',
    'album.loading': 'cargando álbum...',
    'album.loadError': 'no se pudo cargar el álbum:',
    'album.back': 'volver a buscar',
    'album.sharedBanner':
      'estás viendo una tier list compartida. remézclala para crear la tuya.',
    'album.remix': 'remixar',
    'detail.lyrics': 'letra',
    'detail.lyricsLoading': 'buscando letra...',
    'detail.lyricsNone': 'letra no disponible.',
    'detail.preview': 'preview 30s',
    'detail.pause': 'pausar preview',
    'detail.album': 'álbum',
    'detail.track': 'pista',
    'detail.disc': 'disco',
    'detail.duration': 'duración',
    'detail.genre': 'género',
    'detail.year': 'año',
    'detail.artist': 'artista',
    'detail.songs': 'canciones',
    'detail.label': 'sello',
    'detail.release': 'lanzamiento',
    'detail.open': 'abrir álbum',
    'tier.add': 'añadir tier',
    'tier.template': 'plantilla',
    'tier.resets': 'reinicia las posiciones',
    'tier.unranked': 'sin clasificar',
    'tier.allRanked': 'todo clasificado. arrastra de vuelta aquí para quitar de un tier.',
    'footer.tagline': 'haz tier lists de cualquier álbum. datos vía itunes.',
    'footer.by': 'por',
  },
  en: {
    'nav.search': 'search',
    'home.hero1': 'rank the songs of',
    'home.heroAccent': 'any album',
    'home.subtitle':
      'search an album, drag it into tiers, read the lyrics and share your ranking. no accounts, no login.',
    'search.placeholder': 'search an album or artist...',
    'search.clear': 'clear',
    'results.error': 'something went wrong:',
    'results.searching': 'searching...',
    'results.noResultsFor': 'no results for',
    'results.artists': 'artists',
    'results.albums': 'albums',
    'artist.loading': 'loading artist...',
    'artist.loadError': "couldn't load the artist:",
    'artist.releases': 'releases',
    'artist.noAlbums': 'no albums or eps.',
    'saved.title': 'your tier lists',
    'saved.remove': 'remove from your tier lists',
    'album.songs': 'songs',
    'album.share': 'share',
    'album.copied': 'link copied',
    'album.myList': 'my tier list',
    'album.myListDesc': 'they get your exact ranking',
    'album.emptyAlbum': 'empty album',
    'album.emptyAlbumDesc': 'everyone makes their own',
    'album.asImage': 'as an image',
    'album.asImageDesc': 'share your tier list png',
    'album.export': 'export png',
    'album.exporting': 'exporting...',
    'album.decipher': 'details',
    'album.reset': 'reset',
    'album.loading': 'loading album...',
    'album.loadError': "couldn't load the album:",
    'album.back': 'back to search',
    'album.sharedBanner': "you're viewing a shared tier list. remix it to make your own.",
    'album.remix': 'remix',
    'detail.lyrics': 'lyrics',
    'detail.lyricsLoading': 'loading lyrics...',
    'detail.lyricsNone': 'lyrics not available.',
    'detail.preview': '30s preview',
    'detail.pause': 'pause preview',
    'detail.album': 'album',
    'detail.track': 'track',
    'detail.disc': 'disc',
    'detail.duration': 'duration',
    'detail.genre': 'genre',
    'detail.year': 'year',
    'detail.artist': 'artist',
    'detail.songs': 'songs',
    'detail.label': 'label',
    'detail.release': 'release',
    'detail.open': 'open album',
    'tier.add': 'add tier',
    'tier.template': 'template',
    'tier.resets': 'resets positions',
    'tier.unranked': 'unranked',
    'tier.allRanked': 'all ranked. drag back here to remove from a tier.',
    'footer.tagline': 'make tier lists of any album. data via itunes.',
    'footer.by': 'by',
  },
} as const

export type TKey = keyof (typeof dict)['es']

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null
    if (saved === 'es' || saved === 'en') return saved
  } catch {
    /* ignore */
  }
  return typeof navigator !== 'undefined' && navigator.language.startsWith('es')
    ? 'es'
    : 'en'
}

interface I18n {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: TKey) => string
}

const Ctx = createContext<I18n>({ lang: 'es', setLang: () => {}, t: (k) => k })

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)
  function setLang(l: Lang) {
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      /* ignore */
    }
    setLangState(l)
  }
  const t = (key: TKey) => dict[lang][key] ?? key
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>
}

export function useI18n(): I18n {
  return useContext(Ctx)
}
