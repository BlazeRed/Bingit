/**
 * Persisted queue of user changes. Sends them in order, merged per endpoint,
 * at most one POST per second (Simkl blocks faster writers).
 */
import { get, set } from 'idb-keyval'

import { ApiError } from '@/api/http'
import { simklUser } from '@/api/simkl'
import { SignedOutError } from '@/auth/session'
import { addEpisodes, countEpisodes, type Episodes } from '@/library/episodes'
import { applyOps, type Op } from '@/library/ops'
import { updateLibrary } from './engine'

const QUEUE_KEY = 'write-queue'
const QUEUE_LOCK = 'bingit-queue'
const SEND_LOCK = 'bingit-send'
const MAX_BATCH = 100
const POST_GAP_MS = 1100

export interface Failure {
  message: string
  ops: Op[]
}

export const readQueue = async () => (await get<Op[]>(QUEUE_KEY)) ?? []

const editQueue = (edit: (queue: Op[]) => Op[]) =>
  navigator.locks.request(QUEUE_LOCK, async () => set(QUEUE_KEY, edit(await readQueue())))

export function enqueue(op: Op): Promise<void> {
  // An empty episode list must never be sent: Simkl reads it as "the whole show",
  // and removing a whole show deletes it from the library.
  const isEmpty =
    (op.kind === 'watch' || op.kind === 'unwatch') &&
    op.episodes !== undefined &&
    countEpisodes(op.episodes) === 0
  return isEmpty ? Promise.resolve() : editQueue((queue) => [...queue, op])
}

function endpointOf(op: Op): string {
  switch (op.kind) {
    case 'status':
      return '/sync/add-to-list'
    case 'watch':
      return '/sync/history'
    case 'rate':
      return op.rating === null ? '/sync/ratings/remove' : '/sync/ratings'
    default:
      return '/sync/history/remove'
  }
}

interface Entry {
  op: Op
  /** Episodes to mark or unmark; absent for whole-title entries. */
  episodes?: Episodes
  /** Watch time per `season:episode`. */
  times: Record<string, string>
}

function toEntry(op: Op): Entry {
  const episodes = op.kind === 'watch' || op.kind === 'unwatch' ? op.episodes : undefined
  const times: Entry['times'] = {}
  for (const [season, numbers] of Object.entries(episodes ?? {})) {
    for (const number of numbers) times[`${season}:${number}`] = op.at
  }
  return { op, episodes, times }
}

/** Two entries for one title: join episodes; otherwise the whole title or the latest wins. */
function mergeEntries(a: Entry, b: Entry): Entry {
  if (a.episodes && b.episodes) {
    return {
      op: b.op,
      episodes: addEpisodes(a.episodes, b.episodes),
      times: { ...a.times, ...b.times },
    }
  }
  return b.op.kind === 'unwatch' && !a.episodes ? a : b
}

function toPayload({ op, episodes, times }: Entry) {
  const ids = { simkl: op.item.id }
  if (op.kind === 'status') return { ids, to: op.to }
  if (op.kind === 'rate') {
    return op.rating === null ? { ids } : { ids, rating: op.rating, rated_at: op.at }
  }
  if (episodes) {
    return {
      ids,
      seasons: Object.entries(episodes).map(([season, numbers]) => ({
        number: Number(season),
        episodes: numbers.map((number) => ({
          number,
          ...(op.kind === 'watch' && { watched_at: times[`${season}:${number}`] }),
        })),
      })),
    }
  }
  if (op.kind === 'remove') return { ids }
  // A whole anime needs an explicit status; a movie does not.
  return { ids, watched_at: op.at, ...(op.item.type === 'anime' && { status: 'completed' }) }
}

/** The leading changes that share an endpoint become one request. */
export function nextBatch(queue: Op[]) {
  const endpoint = queue[0] && endpointOf(queue[0])
  const end = queue.findIndex((op) => endpointOf(op) !== endpoint)
  const ops = queue.slice(0, Math.min(end === -1 ? queue.length : end, MAX_BATCH))

  const entries = new Map<number, Entry>()
  for (const op of ops) {
    const previous = entries.get(op.item.id)
    const entry = toEntry(op)
    entries.set(op.item.id, previous ? mergeEntries(previous, entry) : entry)
  }

  const body: Record<string, unknown[]> = {}
  for (const entry of entries.values()) {
    const { type } = entry.op.item
    const key = type === 'tv' ? 'shows' : type
    ;(body[key] ??= []).push(toPayload(entry))
  }
  return { endpoint: endpoint ?? '', ops, body }
}

interface WriteResponse {
  not_found?: Record<string, { ids?: { simkl?: number } }[]>
}

/** Problems with the app registration or token, not with the change itself. */
const KEEP_STATUSES = new Set([401, 412, 429])

/** Network trouble and server limits pass; a rejected change will fail again. */
const isTemporary = (error: unknown) =>
  !(error instanceof ApiError) ||
  KEEP_STATUSES.has(error.status) ||
  error.status >= 500 ||
  error.code === 'rate_limit' ||
  error.code === 'invalid_json'

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Sends the queue. Throws on a temporary error and keeps the changes; drops
 * changes Simkl rejects and returns them as failures.
 */
export function flushQueue(onChange: () => Promise<void>) {
  return navigator.locks.request(SEND_LOCK, async () => {
    const failures: Failure[] = []
    let sent = 0

    for (let queue = await readQueue(); queue.length; queue = await readQueue()) {
      const { endpoint, ops, body } = nextBatch(queue)
      let rejected: Failure | undefined
      try {
        const response = await simklUser<WriteResponse>(endpoint, { body })
        const missing = new Set(
          Object.values(response?.not_found ?? {})
            .flat()
            .map((entry) => entry.ids?.simkl),
        )
        const lost = ops.filter((op) => missing.has(op.item.id))
        if (lost[0]) {
          rejected = { message: `Simkl could not find “${lost[0].item.title}”.`, ops: lost }
        }
        const saved = ops.filter((op) => !missing.has(op.item.id))
        await updateLibrary((items) => applyOps(items, saved))
        sent += saved.length
      } catch (error) {
        if (error instanceof SignedOutError || isTemporary(error)) {
          // The next sender also has to respect the POST limit.
          await pause(POST_GAP_MS)
          throw error
        }
        const reason = (error as ApiError).message
        rejected = { message: `Simkl rejected a change: ${reason}`, ops }
      }

      if (rejected) failures.push(rejected)
      const done = new Set(ops.map((op) => op.id))
      await editQueue((current) => current.filter((op) => !done.has(op.id)))
      await onChange()
      await pause(POST_GAP_MS)
    }
    return { sent, failures }
  })
}
