import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/api/http'
import { simklUser } from '@/api/simkl'
import { fakeLocks } from '@/auth/__tests__/fake-locks'
import { item } from '@/library/__tests__/item-factory'
import type { Change, Op } from '@/library/ops'
import { enqueue, flushQueue, nextBatch, readQueue } from '../write-queue'

const db = new Map<string, unknown>()
vi.mock('idb-keyval', () => ({
  get: async (key: string) => db.get(key),
  set: async (key: string, value: unknown) => void db.set(key, value),
}))
vi.mock('@/api/simkl', () => ({
  simklUser: vi.fn<typeof import('@/api/simkl').simklUser>(),
}))

let nextId = 0
const op = (change: Change, id = 1, over: Partial<Op> = {}): Op =>
  ({ ...change, id: String(++nextId), at: `t${nextId}`, item: item(id), ...over }) as Op

const flush = async () => {
  const result = flushQueue(async () => {})
  result.catch(() => undefined)
  await vi.runAllTimersAsync()
  return result
}

beforeEach(() => {
  db.clear()
  vi.resetAllMocks()
  vi.useFakeTimers()
  vi.stubGlobal('navigator', { locks: fakeLocks() })
})
afterEach(() => vi.useRealTimers())

describe('nextBatch', () => {
  it('merges episodes of one show and keeps each watch time', () => {
    const first = op({ kind: 'watch', episodes: { 1: [1] } })
    const second = op({ kind: 'watch', episodes: { 1: [2] } })

    expect(nextBatch([first, second]).body).toEqual({
      shows: [
        {
          ids: { simkl: 1 },
          seasons: [
            {
              number: 1,
              episodes: [
                { number: 1, watched_at: first.at },
                { number: 2, watched_at: second.at },
              ],
            },
          ],
        },
      ],
    })
  })

  it('stops at the first change for another endpoint, to keep the order', () => {
    const batch = nextBatch([
      op({ kind: 'watch', episodes: { 1: [1] } }),
      op({ kind: 'unwatch', episodes: { 1: [1] } }),
      op({ kind: 'watch', episodes: { 1: [2] } }),
    ])

    expect(batch.ops).toHaveLength(1)
  })

  it('sends only the latest status of a title', () => {
    const batch = nextBatch([
      op({ kind: 'status', to: 'hold' }),
      op({ kind: 'status', to: 'dropped' }),
    ])

    expect(batch.body).toEqual({ shows: [{ ids: { simkl: 1 }, to: 'dropped' }] })
  })

  it('lets a full removal win over an episode removal', () => {
    const batch = nextBatch([op({ kind: 'remove' }), op({ kind: 'unwatch', episodes: { 1: [1] } })])

    expect(batch.body).toEqual({ shows: [{ ids: { simkl: 1 } }] })
  })
})

describe('queue', () => {
  it('never queues an empty episode list, which would delete the show', async () => {
    await enqueue(op({ kind: 'unwatch', episodes: { 1: [] } }))

    await expect(readQueue()).resolves.toEqual([])
  })

  it('sends each endpoint once and empties the queue', async () => {
    await enqueue(op({ kind: 'status', to: 'hold' }))
    await enqueue(op({ kind: 'rate', rating: 8 }, 2))
    vi.mocked(simklUser).mockResolvedValue({})

    await expect(flush()).resolves.toMatchObject({ sent: 2, failures: [] })
    expect(vi.mocked(simklUser).mock.calls.map(([path]) => path)).toEqual([
      '/sync/add-to-list',
      '/sync/ratings',
    ])
    await expect(readQueue()).resolves.toEqual([])
  })

  it.each([
    ['offline', new TypeError('offline')],
    ['rate limited', new ApiError(429, 'rate_limit', 'slow down')],
  ])('keeps the change when %s', async (_case, error) => {
    await enqueue(op({ kind: 'rate', rating: 8 }))
    vi.mocked(simklUser).mockRejectedValue(error)

    await expect(flush()).rejects.toBe(error)
    await expect(readQueue()).resolves.toHaveLength(1)
  })

  it('drops a rejected change and reports it', async () => {
    await enqueue(op({ kind: 'rate', rating: 8 }))
    vi.mocked(simklUser).mockRejectedValue(new ApiError(400, 'wrong_parameter', 'bad'))

    const { failures } = await flush()

    expect(failures).toHaveLength(1)
    await expect(readQueue()).resolves.toEqual([])
  })

  it('reports titles Simkl does not know', async () => {
    await enqueue(op({ kind: 'rate', rating: 8 }))
    vi.mocked(simklUser).mockResolvedValue({ not_found: { shows: [{ ids: { simkl: 1 } }] } })

    await expect(flush()).resolves.toMatchObject({ sent: 0, failures: [{ ops: [{}] }] })
  })
})
