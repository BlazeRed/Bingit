import { describe, expect, it } from 'vitest'

import { nextBatch } from '@/sync/write-queue'
import { parseBackup, restoreOps, toBackup, toCsv } from '../format'

const now = new Date('2026-11-26T12:00:00Z')

const response = {
  shows: [
    {
      status: 'watching' as const,
      user_rating: 8,
      user_rated_at: '2026-02-01T00:00:00Z',
      added_to_watchlist_at: null,
      last_watched_at: '2026-03-02T00:00:00Z',
      watched_episodes_count: 2,
      total_episodes_count: 10,
      not_aired_episodes_count: 0,
      show: { title: '=HYPERLINK("x")', ids: { simkl: 1, imdb: 'tt1' } },
      seasons: [
        {
          number: 1,
          episodes: [
            { number: 1, watched_at: '2026-03-01T00:00:00Z' },
            { number: 2, watched_at: '2026-03-02T00:00:00Z' },
          ],
        },
      ],
    },
  ],
}

const restore = () => restoreOps(parseBackup(JSON.stringify(toBackup([response], now))).items, now)

describe('backup', () => {
  it('restores episodes with their own watch dates', () => {
    const batch = nextBatch(restore())

    expect(batch.endpoint).toBe('/sync/history')
    expect(batch.body).toMatchObject({
      shows: [
        {
          seasons: [
            {
              episodes: [
                { number: 1, watched_at: '2026-03-01T00:00:00Z' },
                { number: 2, watched_at: '2026-03-02T00:00:00Z' },
              ],
            },
          ],
        },
      ],
    })
  })

  it('sends history first, then status, then ratings, and removes nothing', () => {
    expect(restore().map((op) => op.kind)).toEqual(['watch', 'status', 'rate'])
  })

  it('rejects other files', () => {
    expect(() => parseBackup('{"app":"other"}')).toThrow('not a Bingit backup')
    expect(() => parseBackup('nope')).toThrow('not a Bingit backup')
  })

  it('skips invalid rows and drops invalid values', () => {
    const good = { type: 'tv', status: 'hold', title: 'A', ids: { simkl: 2 }, rating: 99 }
    const bad = { ...good, ids: { simkl: '2' } }
    const content = JSON.stringify({ app: 'bingit', version: 1, items: [good, bad, null] })

    const { items, skipped } = parseBackup(content)

    expect(skipped).toBe(2)
    expect(items[0]!.rating).toBeNull()
  })

  it('disarms spreadsheet formulas in CSV', () => {
    expect(toCsv(toBackup([response], now))).toContain(`"'=HYPERLINK(""x"")"`)
  })
})
