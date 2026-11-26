/**
 * A change the user made that Simkl may not know yet. The UI shows the saved
 * library with all pending changes applied on top, so rolling one back means
 * removing it from the queue.
 */
import type { SimklStatus } from '@/api/simkl-types'
import { addEpisodes, countEpisodes, removeEpisodes, type Episodes } from './episodes'
import type { LibraryItem } from './item'

export type Change =
  | { kind: 'status'; to: SimklStatus }
  | { kind: 'remove' }
  /**
   * Without `episodes`: the whole title (a movie). `next` is the code of the
   * following episode, when the caller knows the episode list.
   */
  | {
      kind: 'watch'
      episodes?: Episodes
      next?: string
      /** Watch time per `season:episode`, when it differs from `at` (restore). */
      times?: Record<string, string>
    }
  | { kind: 'unwatch'; episodes: Episodes }
  | { kind: 'rate'; rating: number | null }

export type Op = Change & {
  id: string
  /** When the user did it: sent as the watch or rating time, also when offline. */
  at: string
  /** The title, used when it is not in the library yet. */
  item: LibraryItem
  /** All aired episodes. Needed to edit a completed title, which has no list. */
  baseline?: Episodes
}

/** Applying a change twice gives the same result as applying it once. */
function applyOp(current: LibraryItem | undefined, op: Op): LibraryItem | undefined {
  if (op.kind === 'remove') return undefined

  const item: LibraryItem = current ?? {
    ...op.item,
    status: 'plantowatch',
    rating: null,
    watchedCount: 0,
    addedAt: op.at,
  }
  const seasons = item.seasons ?? (item.status === 'completed' ? op.baseline : undefined)

  switch (op.kind) {
    case 'status':
      if (op.to !== 'completed') return { ...item, status: op.to, seasons }
      return {
        ...item,
        status: op.to,
        seasons: undefined,
        nextToWatch: null,
        watchedCount: item.totalCount - item.notAiredCount,
      }
    case 'rate': {
      // Simkl files a newly rated title into a list by itself.
      const filed = item.type === 'movies' ? 'completed' : 'watching'
      return { ...item, rating: op.rating, status: current ? item.status : filed }
    }
    case 'watch': {
      if (!op.episodes) return { ...item, status: 'completed', lastWatchedAt: op.at }
      const watched = addEpisodes(seasons ?? {}, op.episodes)
      const added = countEpisodes(watched) - countEpisodes(seasons ?? {})
      const next = item.nextToWatch
      return {
        ...item,
        status: item.status === 'plantowatch' ? 'watching' : item.status,
        seasons: watched,
        watchedCount: item.watchedCount + added,
        lastWatchedAt: op.at,
        // Without `op.next`, the next episode is unknown until Simkl answers.
        nextToWatch: next && added ? (op.next ?? null) : next,
      }
    }
    case 'unwatch': {
      const watched = removeEpisodes(seasons ?? {}, op.episodes)
      const removed = countEpisodes(seasons ?? {}) - countEpisodes(watched)
      return {
        ...item,
        status: removed && item.status === 'completed' ? 'watching' : item.status,
        seasons: watched,
        watchedCount: Math.max(0, item.watchedCount - removed),
      }
    }
  }
}

export function applyOps(
  items: Record<number, LibraryItem>,
  ops: Op[],
): Record<number, LibraryItem> {
  const result = { ...items }
  for (const op of ops) {
    const next = applyOp(result[op.item.id], op)
    if (next) result[op.item.id] = next
    else delete result[op.item.id]
  }
  return result
}
