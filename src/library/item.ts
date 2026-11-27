/** The local mirror of one title: only the fields the app reads. */
import type { SimklEntry, SimklIds, SimklItemsKey, SimklStatus } from '@/api/simkl-types'
import { padEpisodeCode } from './episodes'

export type MediaType = 'movies' | 'tv' | 'anime'

export interface LibraryItem {
  id: number
  type: MediaType
  status: SimklStatus
  title: string
  year: number | null
  poster: string | null
  runtime: number | null
  ids: SimklIds
  animeType: string | null
  rating: number | null
  addedAt: string | null
  lastWatchedAt: string | null
  nextToWatch: string | null
  watchedCount: number
  totalCount: number
  notAiredCount: number
  /** Watched episode numbers per season. Absent for completed and dropped titles. */
  seasons?: Record<number, number[]>
}

const TYPE_BY_KEY: Record<SimklItemsKey, MediaType> = {
  shows: 'tv',
  movies: 'movies',
  anime: 'anime',
}

export function toLibraryItem(key: SimklItemsKey, entry: SimklEntry): LibraryItem | null {
  const media = entry.show ?? entry.movie
  if (!media) return null
  return {
    id: media.ids.simkl,
    type: TYPE_BY_KEY[key],
    status: entry.status,
    title: media.title,
    year: media.year ?? null,
    poster: media.poster ?? null,
    runtime: media.runtime ?? null,
    ids: media.ids,
    animeType: entry.anime_type ?? null,
    rating: entry.user_rating ?? null,
    addedAt: entry.added_to_watchlist_at,
    lastWatchedAt: entry.last_watched_at,
    nextToWatch: entry.next_to_watch ? padEpisodeCode(entry.next_to_watch) : null,
    watchedCount: entry.watched_episodes_count,
    totalCount: entry.total_episodes_count,
    notAiredCount: entry.not_aired_episodes_count,
    ...(entry.seasons && {
      seasons: Object.fromEntries(
        entry.seasons.map((season) => [season.number, season.episodes.map((e) => e.number)]),
      ),
    }),
  }
}

export function simklPageUrl(item: Pick<LibraryItem, 'type' | 'id' | 'ids'>): string {
  return `https://simkl.com/${item.type}/${item.id}/${item.ids.slug ?? ''}`
}
