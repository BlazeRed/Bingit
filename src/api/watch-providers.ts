/** Where to watch a title in one country: TMDB data, provided by JustWatch. */
import { cachedFetch } from '@/db/cache'
import { tmdbGet } from './tmdb'

const TTL = 24 * 60 * 60 * 1000

interface TmdbProvider {
  provider_id: number
  provider_name: string
  logo_path: string
}

type Offer = 'flatrate' | 'free' | 'ads' | 'rent' | 'buy'

export type TmdbRegion = { link: string } & Partial<Record<Offer, TmdbProvider[]>>

const GROUPS: [label: string, offers: Offer[]][] = [
  ['Stream', ['flatrate', 'free', 'ads']],
  ['Rent', ['rent']],
  ['Buy', ['buy']],
]

export function toWatchOptions(region: TmdbRegion) {
  const groups = GROUPS.flatMap(([label, offers]) => {
    // A service can be in more than one offer of a group.
    const unique = new Map(
      offers.flatMap((offer) => region[offer] ?? []).map((p) => [p.provider_id, p]),
    )
    const providers = [...unique.values()].map((p) => ({
      id: p.provider_id,
      name: p.provider_name,
      logo: `https://image.tmdb.org/t/p/w92${p.logo_path}`,
    }))
    return providers.length ? [{ label, providers }] : []
  })
  return { link: region.link, groups }
}

export type WatchOptions = ReturnType<typeof toWatchOptions>

/** The country of the browser language: `it` and `it-IT` give `IT`. */
// ponytail: no country setting; add one on Me if the browser language misleads people.
export const userCountry = (language = navigator.language) =>
  new Intl.Locale(language).maximize().region ?? 'US'

/** `null` when TMDB lists nothing for the country. */
export function getWatchOptions(
  type: 'movie' | 'tv',
  tmdbId: string,
  country = userCountry(),
): Promise<WatchOptions | null> {
  return cachedFetch(`tmdb:providers:${type}:${tmdbId}:${country}`, TTL, async () => {
    const response = await tmdbGet<{
      'watch/providers'?: { results?: Partial<Record<string, TmdbRegion>> }
    }>(`/${type}/${tmdbId}`, { append_to_response: 'watch/providers' })
    const region = response['watch/providers']?.results?.[country]
    const options = region && toWatchOptions(region)
    return options?.groups.length ? options : null
  })
}
