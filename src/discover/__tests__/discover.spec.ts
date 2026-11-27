import { describe, expect, it } from 'vitest'

import { toCard } from '@/api/discover'
import { toPlainText } from '@/api/people'
import { groupByDay, mostPopular } from '../calendar'

describe('toCard', () => {
  it('reads the id and year of a trending entry', () => {
    const card = toCard(
      { title: 'A', ids: { simkl_id: 5, tmdb: '9' }, release_date: '10/03/2026' },
      'tv',
    )

    expect(card).toMatchObject({ id: 5, year: 2026, ids: { simkl: 5, tmdb: '9' } })
  })

  it('skips entries without a Simkl id', () => {
    expect(toCard({ title: 'A', ids: {} }, 'tv')).toBeNull()
  })
})

describe('groupByDay', () => {
  const now = new Date(2026, 10, 26, 15)
  const at = (day: number, hour: number) => new Date(2026, 10, day, hour).toISOString()
  const file = {
    calendar: [
      { simkl_id: 1, date: at(25, 20), episode: { season: 1, episode: 1 } },
      { simkl_id: 1, date: at(26, 1), episode: { season: 1, episode: 2 } },
      { simkl_id: 2, date: at(27, 20), episode: { episode: 7 } },
    ],
    metadata: {
      1: { title: 'One', ids: { simkl_id: 1 } },
      2: { title: 'Two', ids: { simkl_id: 2 } },
    },
  }

  it('starts today, including earlier hours, and formats episode codes', () => {
    const days = groupByDay(file, 'tv', now)

    expect(days.map((d) => d.airings.map((a) => a.episode))).toEqual([['S01E02'], ['E07']])
  })

  it('keeps the most popular airings in time order', () => {
    const airings = [3, 1, 2].map((rank) => ({
      ...groupByDay(file, 'tv', now)[0]!.airings[0]!,
      rank,
    }))

    expect(mostPopular(airings, 2).map((a) => a.rank)).toEqual([1, 2])
  })

  it('limits to the given titles', () => {
    const days = groupByDay(file, 'tv', now, new Set([2]))

    expect(days.map((d) => d.airings[0]!.card.title)).toEqual(['Two'])
  })
})

describe('toPlainText', () => {
  it('removes AniList markup', () => {
    expect(toPlainText('__Born:__ <i>Tokyo</i><br>[site](https://x.test)')).toBe(
      'Born: Tokyo\nsite',
    )
  })
})
