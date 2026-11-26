/** `_cm` is 84×124 (list thumbnails), `_ca` is 190×279 (cards). */
type PosterSize = '_cm' | '_ca'

export function posterUrl(path: string, size: PosterSize): string {
  return `https://wsrv.nl/?url=https://simkl.in/posters/${path}${size}.webp&q=90`
}
