/**
 * Two-phase Simkl sync: one full import, then deltas gated by /sync/activities.
 * https://api.simkl.org/guides/sync
 */
import { del, get, set } from 'idb-keyval'

import { getActivities, getAllItems, getRatings } from '@/api/simkl'
import type { SimklActivities, SimklAllItems, SimklItemsKey } from '@/api/simkl-types'
import { SYNC_LOCK } from '@/auth/session'
import { decodeDeep } from '@/lib/entities'
import { toLibraryItem, type LibraryItem } from '@/library/item'

const LIBRARY_KEY = 'library'
/** Bump to force a full re-import after a change to `LibraryItem`. */
const VERSION = 2
const MIN_INTERVAL_MS = 5 * 60 * 1000

/** Items and snapshot live in one record, so they are always saved together. */
// ponytail: one record rewritten per sync; split per item if saving gets slow.
export interface LibraryRecord {
  version: number
  items: Record<number, LibraryItem>
  snapshot: SimklActivities
  checkedAt: number
}

const KEYS: SimklItemsKey[] = ['shows', 'movies', 'anime']
const LABELS: Record<SimklItemsKey, string> = {
  shows: 'TV shows',
  movies: 'movies',
  anime: 'anime',
}
const BLOCKS = ['tv_shows', 'movies', 'anime'] as const
const STATUSES = ['watching', 'plantowatch', 'hold', 'completed', 'dropped'] as const

export async function readLibrary(): Promise<LibraryRecord | undefined> {
  const record = await get<LibraryRecord>(LIBRARY_KEY)
  // Libraries saved before the decoding of Simkl texts still hold HTML entities.
  return record?.version === VERSION ? { ...record, items: decodeDeep(record.items) } : undefined
}

/** Forgets the saved library, so that the next sync imports it again. */
export function deleteLibrary() {
  return navigator.locks.request(SYNC_LOCK, () => del(LIBRARY_KEY))
}

/** Changes the saved items, without racing a sync. No-op before the first import. */
export function updateLibrary(change: (items: LibraryRecord['items']) => LibraryRecord['items']) {
  return navigator.locks.request(SYNC_LOCK, async () => {
    const record = await readLibrary()
    if (record) await set(LIBRARY_KEY, { ...record, items: change(record.items) })
  })
}

/**
 * Brings the local mirror up to date. Without `force`, does nothing if the last
 * check is recent. Saves only when every request succeeded.
 */
export function syncLibrary(
  force: boolean,
  onProgress: (message: string) => void,
): Promise<LibraryRecord> {
  return navigator.locks.request(SYNC_LOCK, async () => {
    const saved = await readLibrary()
    if (saved && !force && Date.now() - saved.checkedAt < MIN_INTERVAL_MS) return saved

    // Read activities before the items: later changes then stay in the next delta.
    const snapshot = await getActivities()
    const items = saved ? await pullChanges(saved, snapshot) : await importAll(onProgress)

    const record = { version: VERSION, items, snapshot, checkedAt: Date.now() }
    await set(LIBRARY_KEY, record)
    return record
  })
}

async function importAll(onProgress: (message: string) => void) {
  const items: LibraryRecord['items'] = {}
  // Sequential on purpose: Simkl asks not to pull large libraries in parallel.
  // ponytail: a huge library can return `400 max_items`; split by status then.
  for (const key of KEYS) {
    onProgress(`Importing your ${LABELS[key]}…`)
    merge(items, await getAllItems({ extended: 'full' }, key))
  }
  return items
}

async function pullChanges({ items, snapshot: old }: LibraryRecord, now: SimklActivities) {
  if (now.all === old.all) return items

  const moved = (field: (typeof STATUSES)[number] | 'rated_at' | 'removed_from_list') =>
    BLOCKS.some((block) => now[block]?.[field] !== old[block]?.[field])
  const since: Record<string, string> = old.all ? { date_from: old.all } : {}
  const next = { ...items }

  if (STATUSES.some(moved)) {
    merge(next, await getAllItems({ ...since, extended: 'full' }))
  }
  // A changed or removed rating does not appear in the item delta.
  if (moved('rated_at')) applyRatings(next, await getRatings(since))
  // Deltas never list removals: compare with every id the user still has.
  if (moved('removed_from_list')) {
    removeMissing(next, await getAllItems({ extended: 'simkl_ids_only' }))
  }
  return next
}

function merge(items: LibraryRecord['items'], response: SimklAllItems) {
  for (const key of KEYS) {
    for (const entry of response?.[key] ?? []) {
      const item = toLibraryItem(key, entry)
      if (item) items[item.id] = item
    }
  }
}

function applyRatings(items: LibraryRecord['items'], response: SimklAllItems) {
  for (const entry of KEYS.flatMap((key) => response?.[key] ?? [])) {
    const id = (entry.show ?? entry.movie)?.ids.simkl
    const item = id === undefined ? undefined : items[id]
    if (item) items[item.id] = { ...item, rating: entry.user_rating ?? null }
  }
}

function removeMissing(items: LibraryRecord['items'], response: SimklAllItems) {
  const kept = new Set(
    KEYS.flatMap((key) => response?.[key] ?? []).map((e) => (e.show ?? e.movie)?.ids.simkl),
  )
  for (const item of Object.values(items)) {
    if (!kept.has(item.id)) delete items[item.id]
  }
}
