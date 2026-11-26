/** Capped IndexedDB cache for public catalog responses (ARCHITECTURE.md §8). */
import { clear, createStore, delMany, entries, get, set, type UseStore } from 'idb-keyval'

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const MAX_ENTRIES = 500

interface Entry<T> {
  value: T
  savedAt: number
}

let store: UseStore | undefined
const cacheStore = () => (store ??= createStore('bingit-cache', 'responses'))

/** Returns a fresh cached value, else loads one. A stale value beats an error. */
export async function cachedFetch<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
): Promise<T> {
  // A broken cache must not break the page.
  const entry = await Promise.resolve()
    .then(() => get<Entry<T>>(key, cacheStore()))
    .catch(() => undefined)
  if (entry && Date.now() - entry.savedAt < ttlMs) return entry.value

  try {
    const value = await load()
    void Promise.resolve()
      .then(() => set(key, { value, savedAt: Date.now() }, cacheStore()))
      .catch(() => undefined)
    return value
  } catch (error) {
    if (entry) return entry.value
    throw error
  }
}

/** Drops old entries, then the oldest ones above the cap. */
export async function pruneCache(): Promise<void> {
  const all = await entries<string, Entry<unknown>>(cacheStore())
  const newestFirst = all.sort(([, a], [, b]) => b.savedAt - a.savedAt)
  const expired = newestFirst.filter(
    ([, entry], index) => index >= MAX_ENTRIES || Date.now() - entry.savedAt > MAX_AGE_MS,
  )
  await delMany(
    expired.map(([key]) => key),
    cacheStore(),
  )
}

export const clearCache = () => clear(cacheStore())
