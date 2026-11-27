import { describe, expect, it, vi } from 'vitest'

import { getTrending } from '../discover'
import { simklData } from '../simkl'

vi.mock('idb-keyval', () => ({}))
vi.mock('../simkl', () => ({
  simklData: vi.fn<() => Promise<unknown>>(async () => [
    { title: 'A', ids: { simkl_id: 1 }, genres: ['Action'] },
    { title: 'B', ids: { simkl_id: 2 }, genres: ['Drama'] },
  ]),
}))

const action = { name: 'Action', slug: 'action' }

describe('getTrending with a genre', () => {
  it('picks the genre out of the 500 most watched of the week', async () => {
    const cards = await getTrending('anime', 'week', action)

    expect(simklData).toHaveBeenLastCalledWith('/discover/trending/anime/week_500.json')
    expect(cards.map((c) => c.title)).toEqual(['A'])
  })

  it('reads the genre file for the month', async () => {
    const cards = await getTrending('anime', 'month', action)

    expect(simklData).toHaveBeenLastCalledWith(
      '/discover/trending/anime/genre/action_month_500.json',
    )
    expect(cards).toHaveLength(2)
  })
})
