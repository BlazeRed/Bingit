import { describe, expect, it } from 'vitest'

import { item } from './item-factory'
import { applyOps, type Change, type Op } from '../ops'

const op = (change: Change, over: Partial<Op> = {}): Op =>
  ({ ...change, id: 'a', at: 'now', item: item(1), ...over }) as Op

const apply = (saved: ReturnType<typeof item> | undefined, ...ops: Op[]) =>
  applyOps(saved ? { 1: saved } : {}, ops)[1]

describe('applyOps', () => {
  it('adds a new title as watching when an episode is marked', () => {
    const result = apply(undefined, op({ kind: 'watch', episodes: { 1: [1] } }))

    expect(result).toMatchObject({ status: 'watching', watchedCount: 1, seasons: { 1: [1] } })
  })

  it('counts an episode once when the change is applied twice', () => {
    const change = op({ kind: 'watch', episodes: { 1: [2] } })

    const result = apply(item(1, { watchedCount: 1, seasons: { 1: [1] } }), change, change)

    expect(result).toMatchObject({ watchedCount: 2, seasons: { 1: [1, 2] } })
  })

  it('unmarks one episode of a completed show and keeps the others', () => {
    const completed = item(1, { status: 'completed', watchedCount: 3 })
    const change = op({ kind: 'unwatch', episodes: { 1: [3] } }, { baseline: { 1: [1, 2, 3] } })

    expect(apply(completed, change)).toMatchObject({
      status: 'watching',
      watchedCount: 2,
      seasons: { 1: [1, 2] },
    })
  })

  it('removes a title', () => {
    expect(apply(item(1), op({ kind: 'remove' }))).toBeUndefined()
  })
})
