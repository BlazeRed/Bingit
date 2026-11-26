/** Pure filtering and sorting for the Library screen. */
import type { SimklStatus } from '@/api/simkl-types'
import type { LibraryItem, MediaType } from './item'

export const BUCKETS = {
  watchlist: { label: 'Watchlist', status: 'plantowatch' },
  watching: { label: 'Watching', status: 'watching' },
  seen: { label: 'Seen', status: 'completed' },
  paused: { label: 'Paused', status: 'hold' },
  dropped: { label: 'Dropped', status: 'dropped' },
} satisfies Record<string, { label: string; status: SimklStatus }>

export type Bucket = keyof typeof BUCKETS

export const TYPES: Record<MediaType, string> = { movies: 'Movies', tv: 'TV', anime: 'Anime' }

/** Movies have no Watching or Paused state on Simkl. */
export function bucketsFor(type: MediaType): { primary: Bucket[]; secondary: Bucket[] } {
  return type === 'movies'
    ? { primary: ['watchlist', 'seen'], secondary: ['dropped'] }
    : { primary: ['watchlist', 'watching', 'seen'], secondary: ['paused', 'dropped'] }
}

/** Turns raw route params into a valid type and bucket. */
export function parseSelection(type: unknown, bucket: unknown) {
  const safeType: MediaType = type === 'movies' || type === 'anime' ? type : 'tv'
  const { primary, secondary } = bucketsFor(safeType)
  const fallback: Bucket = safeType === 'movies' ? 'watchlist' : 'watching'
  const safeBucket = [...primary, ...secondary].find((b) => b === bucket) ?? fallback
  return { type: safeType, bucket: safeBucket }
}

/** Newest first; ISO dates sort as text, missing values go last. */
const newestFirst = (a: string | null, b: string | null) => (b ?? '').localeCompare(a ?? '')

export const SORTS = {
  added: {
    label: 'Recently added',
    compare: (a: LibraryItem, b: LibraryItem) => newestFirst(a.addedAt, b.addedAt),
  },
  watched: {
    label: 'Recently watched',
    compare: (a: LibraryItem, b: LibraryItem) => newestFirst(a.lastWatchedAt, b.lastWatchedAt),
  },
  title: {
    label: 'Title',
    compare: (a: LibraryItem, b: LibraryItem) => a.title.localeCompare(b.title),
  },
  year: {
    label: 'Newest release',
    compare: (a: LibraryItem, b: LibraryItem) => (b.year ?? 0) - (a.year ?? 0),
  },
  rating: {
    label: 'Your rating',
    compare: (a: LibraryItem, b: LibraryItem) => (b.rating ?? 0) - (a.rating ?? 0),
  },
}

export type SortKey = keyof typeof SORTS

export function browse(
  items: LibraryItem[],
  type: MediaType,
  bucket: Bucket,
  search: string,
  sort: SortKey,
): LibraryItem[] {
  const needle = search.trim().toLocaleLowerCase()
  return items
    .filter(
      (item) =>
        item.type === type &&
        item.status === BUCKETS[bucket].status &&
        item.title.toLocaleLowerCase().includes(needle),
    )
    .sort(SORTS[sort].compare)
}
