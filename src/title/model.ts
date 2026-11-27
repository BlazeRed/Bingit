/** Pure helpers for the detail page. */
import type { SimklDetail, SimklEpisode } from '@/api/catalog'
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
