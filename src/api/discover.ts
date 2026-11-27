/** Search, trending, browse lists and calendars, normalised to one `Card` shape. */
import { cachedFetch } from '@/db/cache'
import type { MediaType } from '@/library/item'
import { simklData, simklUser } from './simkl'
import type { SimklIds } from './simkl-types'

export interface Card {
  id: number
  type: MediaType
  title: string
  year: number | null
  poster: string | null
  ids: SimklIds
  animeType: string | null
  episodes: number | null
  /** Only some lists send these. */
  genres?: string[]
  rating?: number | null
}

/** The parts the endpoints share; each one uses its own subset. */
export interface RawTitle {
  title: string
  /** Anime in search results. */
  title_en?: string | null
  year?: number | null
  /** `MM/DD/YYYY` in trending files, ISO elsewhere. */
  release_date?: string | null
  poster?: string | null
  ids: Partial<SimklIds> & { simkl_id?: number }
  endpoint_type?: string
  /** `/search/id`: media type. `/search/anime`: anime subtype. */
  type?: string
  anime_type?: string | null
  ep_count?: number | null
  /** Simkl popularity rank: lower is more popular. */
  rank?: number | null
  total_episodes?: number | null
  genres?: string[] | null
  ratings?: { simkl?: { rating?: number | null } | null } | null
}

export function toCard(raw: RawTitle, type: MediaType): Card | null {
  const id = raw.ids.simkl_id ?? raw.ids.simkl
  if (!id) return null
  const { simkl_id: _, ...ids } = raw.ids
  const releaseYear = Number(/\d{4}/.exec(raw.release_date ?? '')?.[0]) || null
  return {
    id,
    type,
    title: raw.title_en || raw.title,
    year: raw.year ?? releaseYear,
    poster: raw.poster ?? null,
    ids: { ...ids, simkl: id },
    animeType: type === 'anime' ? (raw.anime_type ?? raw.type ?? null) : null,
    episodes: raw.ep_count ?? raw.total_episodes ?? null,
    genres: raw.genres ?? undefined,
    rating: raw.ratings?.simkl?.rating ?? null,
  }
}

export const toMediaType = (type: string | undefined): MediaType =>
  type === 'movie' || type === 'movies' ? 'movies' : type === 'anime' ? 'anime' : 'tv'

/** Some endpoints answer `null` instead of an empty list. */
const toCards = (list: RawTitle[] | null, type: (raw: RawTitle) => MediaType) =>
  (list ?? []).flatMap((raw) => toCard(raw, type(raw)) ?? [])

export type SearchScope = 'all' | 'movie' | 'tv' | 'anime'

// Session caches: every user request counts against the daily quota.
const searches = new Map<string, Card[]>()
const browses = new Map<string, Card[]>()

export async function searchTitles(
  query: string,
  scope: SearchScope,
  signal: AbortSignal,
): Promise<Card[]> {
  const key = `${scope}:${query.toLocaleLowerCase()}`
  const known = searches.get(key)
  if (known) return known
  const found = await simklUser<RawTitle[] | null>(`/search/${scope}`, {
    query: { q: query, extended: 'full', limit: '20' },
    signal,
  })
  const cards = toCards(found, (raw) => toMediaType(raw.endpoint_type ?? scope))
  searches.set(key, cards)
  return cards
}

export type TrendingPeriod = 'today' | 'week' | 'month'

export interface Genre {
  name: string
  slug: string
}

/**
 * One genre has its own file for the month only. For today and this week the
 * genre is picked out of the 500 most watched titles.
 */
export async function getTrending(type: MediaType, period: TrendingPeriod, genre?: Genre) {
  let file = `${period}_${genre ? 500 : 100}`
  if (genre && period === 'month') file = `genre/${encodeURIComponent(genre.slug)}_month_500`
  const list = await simklData<RawTitle[]>(`/discover/trending/${type}/${file}.json`)
  const cards = toCards(list, () => type)
  if (!genre) return cards
  const matches = period === 'month' ? cards : cards.filter((c) => c.genres?.includes(genre.name))
  return matches.slice(0, 100)
}

export const getGenres = (type: MediaType) =>
  simklData<Genre[]>(`/discover/trending/${type}/genre/index.json`)

/** Top rated and premieres exist only for TV and anime, and cost quota. */
export async function getBrowse(type: 'tv' | 'anime', list: 'best' | 'new' | 'soon') {
  const path = list === 'best' ? `/${type}/best/all` : `/${type}/premieres/${list}`
  const known = browses.get(path)
  if (known) return known
  const cards = toCards(await simklUser<RawTitle[] | null>(path), () => type)
  browses.set(path, cards)
  return cards
}

export type ExternalSource = 'tmdb-movie' | 'tmdb-tv' | 'anilist'

/** Looks up the Simkl title for another catalog's id. Costs one request, cached. */
export function findByExternalId(source: ExternalSource, id: string) {
  const query: Record<string, string> =
    source === 'anilist' ? { anilist: id } : { tmdb: id, type: source.slice('tmdb-'.length) }
  return cachedFetch(`find:${source}:${id}`, 7 * 24 * 60 * 60 * 1000, async () => {
    const [match] = (await simklUser<RawTitle[] | null>('/search/id', { query })) ?? []
    return match ? toCard(match, toMediaType(match.type)) : null
  })
}

export type CalendarKind = MediaType

export interface CalendarFile {
  calendar: {
    simkl_id: number
    date: string
    episode?: { season?: number; episode: number; title?: string | null }
  }[]
  metadata: Record<string, RawTitle>
}

export const getCalendar = (kind: CalendarKind) =>
  simklData<CalendarFile>(`/calendar/v2/${kind === 'movies' ? 'movie_release' : kind}.json`)
