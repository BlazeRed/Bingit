/** Pure helpers for the detail page. */
import type { SimklDetail, SimklEpisode, SimklRelation } from '@/api/catalog'
import type { Episodes } from '@/library/episodes'
import type { LibraryItem, MediaType } from '@/library/item'

export interface Season {
  number: number
  episodes: SimklEpisode[]
}

/** Regular episodes per season. */
// ponytail: specials are left out; their numbering for writes is unclear for anime.
export function toSeasons(episodes: SimklEpisode[]): Season[] {
  const seasons = new Map<number, SimklEpisode[]>()
  for (const episode of episodes) {
    if (episode.type !== 'episode') continue
    const number = episode.season ?? 1
    seasons.set(number, [...(seasons.get(number) ?? []), episode])
  }
  return [...seasons]
    .sort(([a], [b]) => a - b)
    .map(([number, list]) => ({ number, episodes: list }))
}

/** The first season with an episode to watch, else the last one. */
export function currentSeason(seasons: Season[], watched: Episodes) {
  const open = seasons.find((season) =>
    season.episodes.some((e) => e.aired && !watched[season.number]?.includes(e.episode)),
  )
  return (open ?? seasons.at(-1))?.number
}

export function seasonProgress({ number, episodes }: Season, watched: Episodes) {
  const seen = episodes.filter((e) => watched[number]?.includes(e.episode)).length
  return { watched: seen, total: episodes.length }
}

export function airedEpisodes(seasons: Season[]): Episodes {
  return Object.fromEntries(
    seasons.map((season) => [
      season.number,
      season.episodes.filter((e) => e.aired).map((e) => e.episode),
    ]),
  )
}

/** A library entry for a title the user has not added yet. */
export function seedItem(type: MediaType, detail: SimklDetail, seasons: Season[]): LibraryItem {
  const all = seasons.flatMap((season) => season.episodes)
  return {
    id: detail.ids.simkl,
    type,
    status: 'plantowatch',
    title: detail.en_title || detail.title,
    year: detail.year ?? null,
    poster: detail.poster ?? null,
    runtime: detail.runtime ?? null,
    ids: detail.ids,
    animeType: detail.anime_type ?? null,
    rating: null,
    addedAt: null,
    lastWatchedAt: null,
    nextToWatch: null,
    watchedCount: 0,
    totalCount: all.length || (detail.total_episodes ?? 0),
    notAiredCount: all.filter((e) => !e.aired).length,
  }
}

export const ROUTE_TYPES = { movie: 'movies', tv: 'tv', anime: 'anime' } as const

export type RouteType = keyof typeof ROUTE_TYPES

export const routeType = (type: string): RouteType =>
  type === 'movie' || type === 'movies' ? 'movie' : type === 'anime' ? 'anime' : 'tv'

export interface AnimeSeason {
  id: number
  year: number | null
}

/** Stops a faulty graph from loading titles without end. */
const MAX_CHAIN = 40

/** The immediate neighbours in the story. Simkl names the link to the first season "season 1". */
const neighbours = (detail: SimklDetail) =>
  (detail.relations ?? [])
    .filter(
      (r) =>
        r.is_direct &&
        (r.relation_type.startsWith('season') || ['prequel', 'sequel'].includes(r.relation_type)),
    )
    .map((r) => r.ids.simkl)

const isSeries = (detail: SimklDetail) => detail.anime_type === 'tv' || detail.anime_type === 'ona'

const isUnmapped = (detail: SimklDetail) => !detail.ids.tvdb && !detail.ids.tmdb

/**
 * The first season of the show a title belongs to: crossovers and spin-offs are
 * also direct "sequels", but only real seasons carry a "season 1" link. An
 * announced season has no TVDB or TMDB id yet and no such link: it goes with its
 * neighbour.
 */
function showOf(detail: SimklDetail, found: Map<number, SimklDetail>): number {
  const first = (d: SimklDetail) =>
    d.relations?.find((r) => r.relation_type.startsWith('season'))?.ids.simkl
  const known = isUnmapped(detail)
    ? neighbours(detail)
        .map((id) => found.get(id))
        .find((d) => d && !isUnmapped(d))
    : undefined
  return first(detail) ?? (known && first(known)) ?? (known ?? detail).ids.simkl
}

/**
 * The seasons of an anime, oldest first. Simkl keeps each season as its own title.
 * Only direct links are trustworthy (distant "sequels" include remakes), so this
 * walks them title by title, also through films and specials that sit between two
 * seasons. Empty when there is only one season.
 */
export async function animeSeasons(
  detail: SimklDetail,
  load: (id: number) => Promise<SimklDetail>,
): Promise<AnimeSeason[]> {
  if (!isSeries(detail)) return []
  const found = new Map([[detail.ids.simkl, detail]])
  let edge = [detail]
  while (edge.length) {
    const ids = [...new Set(edge.flatMap(neighbours))]
      .filter((id) => !found.has(id))
      .slice(0, MAX_CHAIN - found.size)
    edge = await Promise.all(ids.map(load))
    edge.forEach((next, index) => found.set(ids[index]!, next))
  }

  const show = showOf(detail, found)
  // Unannounced dates go last.
  const aired = (d: SimklDetail) => d.first_aired || '9999'
  const seasons = [...found]
    .filter(([, d]) => isSeries(d) && showOf(d, found) === show)
    .sort(([, a], [, b]) => aired(a).localeCompare(aired(b)))
    .map(([id, d]) => ({ id, year: d.year ?? null }))
  return seasons.length > 1 ? seasons : []
}

/**
 * Related anime outside the season row: direct links first, then by year.
 * Summaries retell episodes, so they close the list.
 */
export function sameStory(detail: SimklDetail, seasons: AnimeSeason[]): SimklRelation[] {
  const shown = new Set(seasons.map((season) => season.id))
  const isSummary = (r: SimklRelation) => Number(r.relation_type === 'summary')
  return (detail.relations ?? [])
    .filter((r) => !shown.has(r.ids.simkl))
    .sort(
      (a, b) =>
        isSummary(a) - isSummary(b) ||
        Number(!!b.is_direct) - Number(!!a.is_direct) ||
        (a.year ?? Infinity) - (b.year ?? Infinity) ||
        0,
    )
}

/** The label of a related anime. */
export function relationTag({ anime_type, relation_type, is_direct }: SimklRelation) {
  if (anime_type === 'movie') return 'Movie'
  // A distant "sequel" can be a remake: do not promise an order.
  const isDistant = !is_direct && ['prequel', 'sequel'].includes(relation_type)
  const tag = isDistant ? 'related' : relation_type
  return tag.charAt(0).toUpperCase() + tag.slice(1)
}

/** The first announced episode that is not out yet. */
export function nextEpisode(seasons: Season[], now = Date.now()) {
  for (const { number, episodes } of seasons) {
    const found = episodes.find((e) => !e.aired && e.date && Date.parse(e.date) > now)
    if (found) return { season: number, episode: found.episode, date: new Date(found.date!) }
  }
  return null
}
