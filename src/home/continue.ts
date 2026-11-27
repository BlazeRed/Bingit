/** Pure helpers for "Continue watching". */
import type { SimklEpisode } from '@/api/catalog'
import type { Episodes } from '@/library/episodes'
import type { LibraryItem } from '@/library/item'
import { toSeasons } from '@/title/model'

/** Shows in progress with an aired episode left, most recently watched first. */
export const inProgress = (items: LibraryItem[]) =>
  items
    .filter((item) => item.status === 'watching' && item.nextToWatch)
    .sort((a, b) => (b.lastWatchedAt ?? '').localeCompare(a.lastWatchedAt ?? ''))

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Finds the episode `current` points at, and the code of the one after it that is
 * aired and not watched yet. The code keeps the style of `current`.
 */
export function locateEpisode(
  episodes: SimklEpisode[],
  current: Episodes,
  currentCode: string,
  watched: Episodes,
) {
  const ordered = toSeasons(episodes).flatMap((season) =>
    season.episodes.map((episode) => ({ season: season.number, episode })),
  )
  const index = ordered.findIndex(({ season, episode }) =>
    current[season]?.includes(episode.episode),
  )
  const following =
    index === -1
      ? undefined
      : ordered
          .slice(index + 1)
          .find(
            ({ season, episode }) => episode.aired && !watched[season]?.includes(episode.episode),
          )
  const next =
    following &&
    (currentCode.startsWith('S') ? `S${pad(following.season)}` : '') +
      `E${pad(following.episode.episode)}`
  return { name: ordered[index]?.episode.title ?? '', next }
}
