import { describe, expect, it } from 'vitest'

import { item } from '@/library/__tests__/item-factory'
import { applyOps } from '@/library/ops'
import { inProgress, locateEpisode } from '../continue'

const episode = (season: number, number: number, aired = true) => ({
  season,
  episode: number,
  type: 'episode',
  aired,
  title: `S${season}E${number}`,
})
const list = [episode(1, 1), episode(1, 2), episode(2, 1), episode(2, 2, false)]

describe('locateEpisode', () => {
  it('names the current episode and finds the next one across seasons', () => {
    expect(locateEpisode(list, { 1: [2] }, 'S01E02', {})).toEqual({
      name: 'S1E2',
      next: 'S02E01',
    })
  })

  it('has no next episode when the rest is not aired', () => {
    expect(locateEpisode(list, { 2: [1] }, 'S02E01', {}).next).toBeUndefined()
  })

  it('moves a marked show to its next episode at once', () => {
    const show = item(1, { nextToWatch: 'S01E01' })

    const items = applyOps({ 1: show }, [
      { id: 'a', at: 'now', item: show, kind: 'watch', episodes: { 1: [1] }, next: 'S01E02' },
    ])

    expect(inProgress(Object.values(items))[0]!.nextToWatch).toBe('S01E02')
  })
})
