/** The Bingit backup file: building it, reading it, and turning it into changes. */
import type { SimklAllItems, SimklItemsKey, SimklStatus } from '@/api/simkl-types'
import type { Episodes } from '@/library/episodes'
import { toLibraryItem, type LibraryItem, type MediaType } from '@/library/item'
import type { Change, Op } from '@/library/ops'

export interface BackupEpisode {
  season: number
  number: number
  watchedAt: string | null
}

export type BackupItem = Pick<
  LibraryItem,
  'type' | 'ids' | 'title' | 'year' | 'poster' | 'animeType' | 'status' | 'rating'
> & {
  ratedAt: string | null
  addedAt: string | null
  lastWatchedAt: string | null
  episodes: BackupEpisode[]
}

export interface Backup {
  app: 'bingit'
  version: 1
  exportedAt: string
  items: BackupItem[]
}

const KEYS: SimklItemsKey[] = ['shows', 'movies', 'anime']

export function toBackup(responses: SimklAllItems[], now: Date): Backup {
  const items = responses.flatMap((response) =>
    KEYS.flatMap((key) =>
      (response?.[key] ?? []).flatMap((entry) => {
        const item = toLibraryItem(key, entry)
        if (!item) return []
        const { type, ids, title, year, poster, animeType, status, rating } = item
        return {
          type,
          ids,
          title,
          year,
          poster,
          animeType,
          status,
          rating,
          ratedAt: entry.user_rated_at ?? null,
          addedAt: item.addedAt,
          lastWatchedAt: item.lastWatchedAt,
          episodes: (entry.seasons ?? []).flatMap((season) =>
            season.episodes.map((episode) => ({
              season: season.number,
              number: episode.number,
              watchedAt: episode.watched_at ?? null,
            })),
          ),
        }
      }),
    ),
  )
  return { app: 'bingit', version: 1, exportedAt: now.toISOString(), items }
}

/** Spreadsheets run cells that start with these characters as formulas. */
const FORMULA = /^[=+\-@\t\r]/

function cell(value: unknown): string {
  const text = String(value ?? '')
  return `"${(FORMULA.test(text) ? `'${text}` : text).replaceAll('"', '""')}"`
}

export function toCsv({ items }: Backup): string {
  const header = [
    'type',
    'title',
    'year',
    'status',
    'rating',
    'watched_episodes',
    'added_at',
    'last_watched_at',
    'simkl_id',
    'imdb',
    'tmdb',
    'mal',
    'anilist',
  ]
  const rows = items.map((i) => [
    i.type,
    i.title,
    i.year,
    i.status,
    i.rating,
    i.episodes.length,
    i.addedAt,
    i.lastWatchedAt,
    i.ids.simkl,
    i.ids.imdb,
    i.ids.tmdb,
    i.ids.mal,
    i.ids.anilist,
  ])
  return [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n')
}

// ---- Reading a file the user picked: trust nothing in it. ----

const TYPES: MediaType[] = ['movies', 'tv', 'anime']
const STATUSES: SimklStatus[] = ['watching', 'plantowatch', 'hold', 'completed', 'dropped']

type Raw = Record<string, unknown>

const isObject = (value: unknown): value is Raw =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const text = (value: unknown) => (typeof value === 'string' ? value : null)
const date = (value: unknown) =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null
const isWhole = (value: unknown, min: number): value is number =>
  Number.isInteger(value) && (value as number) >= min

function readEpisode(raw: unknown): BackupEpisode[] {
  if (!isObject(raw) || !isWhole(raw.season, 0) || !isWhole(raw.number, 1)) return []
  return [{ season: raw.season, number: raw.number, watchedAt: date(raw.watchedAt) }]
}

function readItem(raw: unknown): BackupItem | null {
  if (!isObject(raw) || !isObject(raw.ids) || !isWhole(raw.ids.simkl, 1)) return null
  const type = TYPES.find((t) => t === raw.type)
  const status = STATUSES.find((s) => s === raw.status)
  const title = text(raw.title)
  if (!type || !status || !title) return null
  const { rating } = raw
  return {
    type,
    status,
    title,
    ids: { simkl: raw.ids.simkl },
    year: isWhole(raw.year, 1) ? raw.year : null,
    poster: text(raw.poster),
    animeType: text(raw.animeType),
    rating: isWhole(rating, 1) && rating <= 10 ? rating : null,
    ratedAt: date(raw.ratedAt),
    addedAt: date(raw.addedAt),
    lastWatchedAt: date(raw.lastWatchedAt),
    episodes: Array.isArray(raw.episodes) ? raw.episodes.flatMap(readEpisode) : [],
  }
}

export function parseBackup(content: string) {
  let raw: unknown
  try {
    raw = JSON.parse(content)
  } catch {
    raw = null
  }
  if (!isObject(raw) || raw.app !== 'bingit' || raw.version !== 1 || !Array.isArray(raw.items)) {
    throw new Error('This file is not a Bingit backup.')
  }
  const items = raw.items.flatMap((item) => readItem(item) ?? [])
  return { items, skipped: raw.items.length - items.length }
}

/**
 * Changes that restore the items. Ordered by kind, so that the queue sends about
 * one request per 100 titles for each. Nothing here removes anything.
 */
export function restoreOps(items: BackupItem[], now: Date): Op[] {
  const watches: Op[] = []
  const statuses: Op[] = []
  const ratings: Op[] = []

  for (const backup of items) {
    const { episodes, ratedAt, ...saved } = backup
    const item: LibraryItem = {
      ...saved,
      id: saved.ids.simkl,
      runtime: null,
      nextToWatch: null,
      watchedCount: 0,
      totalCount: 0,
      notAiredCount: 0,
    }
    const op = (change: Change, at: string | null): Op => ({
      ...change,
      id: crypto.randomUUID(),
      at: at ?? now.toISOString(),
      item,
    })
    const isMovie = item.type === 'movies' || item.animeType === 'movie'

    // A watched movie: the watch event also files it as completed.
    if (isMovie && item.status === 'completed') {
      watches.push(op({ kind: 'watch' }, item.lastWatchedAt))
    } else {
      if (!isMovie && episodes.length) {
        const watched: Episodes = {}
        const times: Record<string, string> = {}
        for (const { season, number, watchedAt } of episodes) {
          ;(watched[season] ??= []).push(number)
          if (watchedAt) times[`${season}:${number}`] = watchedAt
        }
        watches.push(op({ kind: 'watch', episodes: watched, times }, item.lastWatchedAt))
      }
      statuses.push(op({ kind: 'status', to: item.status }, item.addedAt))
    }
    if (item.rating) ratings.push(op({ kind: 'rate', rating: item.rating }, ratedAt))
  }

  return [...watches, ...statuses, ...ratings]
}
