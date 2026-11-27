/** Hand-written, only the fields the app reads. */
export interface SimklUserSettings {
  user: { name: string; avatar: string }
  account: { id: number; type: string }
}

/** Keys used by `/sync/all-items` and `/sync/ratings`. */
export type SimklItemsKey = 'shows' | 'movies' | 'anime'

export type SimklStatus = 'watching' | 'plantowatch' | 'hold' | 'completed' | 'dropped'

type SimklActivityBlock = Partial<
  Record<SimklStatus | 'rated_at' | 'removed_from_list', string | null>
>

export interface SimklActivities {
  /** `null` on an account without any activity. */
  all: string | null
  tv_shows: SimklActivityBlock
  movies: SimklActivityBlock
  anime: SimklActivityBlock
}

export interface SimklIds {
  simkl: number
  slug?: string
  imdb?: string
  tmdb?: string
  tvdb?: string
  anilist?: string
  mal?: string
}

interface SimklMedia {
  title: string
  poster?: string | null
  year?: number | null
  runtime?: number | null
  ids: SimklIds
}

export interface SimklEntry {
  status: SimklStatus
  user_rating: number | null
  user_rated_at?: string | null
  added_to_watchlist_at: string | null
  last_watched_at: string | null
  next_to_watch?: string | null
  watched_episodes_count: number
  total_episodes_count: number
  not_aired_episodes_count: number
  anime_type?: string
  /** Shows and anime use `show`, movies use `movie`. */
  show?: SimklMedia
  movie?: SimklMedia
  /** Only with `extended=full`, and not for completed or dropped titles. */
  /** `watched_at` only with `episode_watched_at=yes`. */
  seasons?: { number: number; episodes: { number: number; watched_at?: string | null }[] }[]
}

/** Empty results come back as `{}` or `null`. */
export type SimklAllItems = Partial<Record<SimklItemsKey, SimklEntry[]>> | null

interface SimklCount {
  count?: number
  watched_episodes_count?: number
}

export interface SimklStats {
  total_mins?: number
  movies?: Partial<Record<SimklStatus, SimklCount>>
  tv?: Partial<Record<SimklStatus, SimklCount>>
  anime?: Partial<Record<SimklStatus, SimklCount>>
  watched_last_week?: { total_mins?: number }
}
