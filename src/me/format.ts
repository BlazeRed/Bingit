import type { SimklStats } from '@/api/simkl-types'

export const plural = (count: number, word: string) =>
  `${count.toLocaleString('en')} ${word}${count === 1 ? '' : 's'}`

export const initials = (name: string) =>
  name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('')

/** `41 days 6 h`, `3 h 20 min`, `12 min`. */
export function duration(minutes: number): string {
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  if (days) return `${days} ${days === 1 ? 'day' : 'days'} ${hours} h`
  return hours ? `${hours} h ${minutes % 60} min` : `${minutes} min`
}

export function timeAgo(then: number, now = Date.now()): string {
  const minutes = Math.floor((now - then) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  return hours < 24 ? `${hours} h ago` : `${Math.floor(hours / 24)} d ago`
}

export function summarize(stats: SimklStats) {
  const episodes = (type: SimklStats['tv']) =>
    Object.values(type ?? {}).reduce((sum, s) => sum + (s.watched_episodes_count ?? 0), 0)
  return {
    total: duration(stats.total_mins ?? 0),
    movies: stats.movies?.completed?.count ?? 0,
    tvEpisodes: episodes(stats.tv),
    animeEpisodes: episodes(stats.anime),
    lastWeek: duration(stats.watched_last_week?.total_mins ?? 0),
  }
}
