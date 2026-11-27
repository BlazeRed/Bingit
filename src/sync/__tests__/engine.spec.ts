import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getActivities, getAllItems, getRatings } from '@/api/simkl'
import type { SimklActivities, SimklEntry } from '@/api/simkl-types'
import { fakeLocks } from '@/auth/__tests__/fake-locks'
import { readLibrary, syncLibrary } from '../engine'

const db = new Map<string, unknown>()
vi.mock('idb-keyval', () => ({
  get: async (key: string) => db.get(key),
  set: async (key: string, value: unknown) => void db.set(key, value),
}))
vi.mock('@/api/simkl', () => ({
  getActivities: vi.fn<typeof import('@/api/simkl').getActivities>(),
  getAllItems: vi.fn<typeof import('@/api/simkl').getAllItems>(),
  getRatings: vi.fn<typeof import('@/api/simkl').getRatings>(),
}))

const activities = (all: string, tv: Record<string, string> = {}): SimklActivities => ({
  all,
  tv_shows: tv,
  movies: {},
  anime: {},
})

const show = (id: number, over: Partial<SimklEntry> = {}): SimklEntry => ({
  status: 'watching',
  user_rating: null,
  added_to_watchlist_at: null,
  last_watched_at: null,
  watched_episodes_count: 1,
  total_episodes_count: 2,
  not_aired_episodes_count: 0,
  show: { title: `Show ${id}`, ids: { simkl: id } },
  ...over,
})

const sync = () => syncLibrary(true, () => {})

async function importTwoShows() {
  vi.mocked(getActivities).mockResolvedValueOnce(activities('t1'))
  vi.mocked(getAllItems).mockImplementation(async (_query, type) =>
    type === 'shows'
      ? { shows: [show(1, { seasons: [{ number: 1, episodes: [{ number: 1 }] }] }), show(2)] }
      : {},
  )
  await sync()
  vi.mocked(getAllItems).mockReset()
}

beforeEach(() => {
  db.clear()
  vi.resetAllMocks()
  vi.stubGlobal('navigator', { locks: fakeLocks() })
})

describe('first import', () => {
  it('pulls each type and keeps watched episode numbers', async () => {
    await importTwoShows()

    const library = await readLibrary()
    expect(Object.keys(library!.items)).toEqual(['1', '2'])
    expect(library!.items[1]).toMatchObject({ type: 'tv', seasons: { 1: [1] } })
  })

  it('saves nothing when one pull fails', async () => {
    vi.mocked(getActivities).mockResolvedValue(activities('t1'))
    vi.mocked(getAllItems)
      .mockResolvedValueOnce({ shows: [show(1)] })
      .mockRejectedValue(new Error('offline'))

    await expect(sync()).rejects.toThrow('offline')
    await expect(readLibrary()).resolves.toBeUndefined()
  })
})

describe('delta sync', () => {
  it('only reads activities when nothing changed', async () => {
    await importTwoShows()
    vi.mocked(getActivities).mockResolvedValue(activities('t1'))

    await sync()

    expect(getAllItems).not.toHaveBeenCalled()
    expect(getRatings).not.toHaveBeenCalled()
  })

  it('makes no request when the last check is recent', async () => {
    await importTwoShows()
    vi.mocked(getActivities).mockClear()

    await syncLibrary(false, () => {})

    expect(getActivities).not.toHaveBeenCalled()
  })

  it('merges changed items since the saved timestamp', async () => {
    await importTwoShows()
    vi.mocked(getActivities).mockResolvedValue(activities('t2', { completed: 't2' }))
    vi.mocked(getAllItems).mockResolvedValue({ shows: [show(2, { status: 'completed' })] })

    const { items } = await sync()

    expect(getAllItems).toHaveBeenCalledExactlyOnceWith({ date_from: 't1', extended: 'full' })
    expect(items[2]!.status).toBe('completed')
    expect(items[1]!.status).toBe('watching')
  })

  it('applies a rating change without losing episodes', async () => {
    await importTwoShows()
    vi.mocked(getActivities).mockResolvedValue(activities('t2', { rated_at: 't2' }))
    vi.mocked(getRatings).mockResolvedValue({ shows: [show(1, { user_rating: 9 })] })

    const { items } = await sync()

    expect(items[1]).toMatchObject({ rating: 9, seasons: { 1: [1] } })
    expect(getAllItems).not.toHaveBeenCalled()
  })

  it('removes items that Simkl no longer lists', async () => {
    await importTwoShows()
    vi.mocked(getActivities).mockResolvedValue(activities('t2', { removed_from_list: 't2' }))
    vi.mocked(getAllItems).mockResolvedValue({ shows: [show(2)] })

    const { items } = await sync()

    expect(Object.keys(items)).toEqual(['2'])
  })

  it('keeps the old snapshot and items when a delta fails', async () => {
    await importTwoShows()
    vi.mocked(getActivities).mockResolvedValue(activities('t2', { removed_from_list: 't2' }))
    vi.mocked(getAllItems).mockRejectedValue(new Error('offline'))

    await expect(sync()).rejects.toThrow('offline')

    const library = await readLibrary()
    expect(library!.snapshot.all).toBe('t1')
    expect(Object.keys(library!.items)).toHaveLength(2)
  })
})
