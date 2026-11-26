/** Pure grouping for the calendar screen. */
import { toCard, type Card, type CalendarFile } from '@/api/discover'
import type { LibraryItem, MediaType } from '@/library/item'

export interface Airing {
  key: string
  date: Date
  card: Card
  episode: string
  rank: number
}

export interface Day {
  date: Date
  airings: Airing[]
}

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Airings from the start of today, grouped by local day. `only` limits them to
 * the given Simkl ids.
 */
export function groupByDay(
  file: CalendarFile,
  type: MediaType,
  now: Date,
  only?: Set<number>,
): Day[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = new Map<string, Day>()

  for (const entry of file.calendar) {
    const date = new Date(entry.date)
    if (date < today || (only && !only.has(entry.simkl_id))) continue
    const raw = file.metadata[entry.simkl_id]
    const card = raw && toCard(raw, type)
    if (!card) continue

    const dayKey = date.toDateString()
    const day = days.get(dayKey) ?? { date, airings: [] }
    days.set(dayKey, day)

    const { season, episode } = entry.episode ?? {}
    const code = episode === undefined ? '' : `E${pad(episode)}`
    day.airings.push({
      key: `${entry.simkl_id}:${entry.date}:${season}:${episode}`,
      date,
      card,
      episode: season === undefined ? code : `S${pad(season)}${code}`,
      rank: raw.rank || Number.MAX_SAFE_INTEGER,
    })
  }

  return [...days.values()].sort((a, b) => a.date.getTime() - b.date.getTime())
}

/** The most popular airings of a day, still in time order. */
export function mostPopular(airings: Airing[], limit: number): Airing[] {
  if (airings.length <= limit) return airings
  const kept = new Set([...airings].sort((a, b) => a.rank - b.rank).slice(0, limit))
  return airings.filter((airing) => kept.has(airing))
}

/** Titles the user cares about: everything saved except dropped ones. */
export const followedIds = (items: LibraryItem[]) =>
  new Set(items.filter((item) => item.status !== 'dropped').map((item) => item.id))

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

/** Calendar days between now and the date: 0 is today. */
export const daysUntil = (date: Date, now: Date) =>
  // Rounded: a day with a clock change is not 24 hours long.
  Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / 86_400_000)
