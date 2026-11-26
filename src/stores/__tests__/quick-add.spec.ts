import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fakeLocks } from '@/auth/__tests__/fake-locks'
import { item } from '@/library/__tests__/item-factory'
import type { Op } from '@/library/ops'
import { useLibraryStore } from '../library'

const db = new Map<string, unknown>()
vi.mock('idb-keyval', () => ({
  get: async (key: string) => db.get(key),
  set: async (key: string, value: unknown) => void db.set(key, value),
}))
vi.mock('@/api/simkl', () => ({}))

const queued = () => (db.get('write-queue') as Op[]).map((op) => op.kind)
const added = item(1, { status: 'plantowatch' })

beforeEach(() => {
  db.clear()
  vi.useFakeTimers()
  vi.stubGlobal('navigator', { locks: fakeLocks() })
  setActivePinia(createPinia())
})

describe('quick add', () => {
  it('can be taken back', async () => {
    const library = useLibraryStore()
    await library.quickAdd(added)

    await library.undoAdd(1)

    expect(queued()).toEqual(['status', 'remove'])
    expect(library.byId[1]).toBeUndefined()
  })

  it('never removes a title that has history by now', async () => {
    const library = useLibraryStore()
    await library.quickAdd(added)
    await library.act({ kind: 'rate', rating: 9, item: added })

    await library.undoAdd(1)

    expect(queued()).toEqual(['status', 'rate'])
  })
})
