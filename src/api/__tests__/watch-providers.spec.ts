import { describe, expect, it } from 'vitest'

import { toWatchOptions, userCountry } from '../watch-providers'

const provider = (provider_id: number) => ({
  provider_id,
  provider_name: `P${provider_id}`,
  logo_path: '/logo.jpg',
})

describe('watch providers', () => {
  it('groups offers, lists a service once and skips empty groups', () => {
    const { groups } = toWatchOptions({
      link: 'https://www.themoviedb.org/movie/1/watch',
      flatrate: [provider(1)],
      ads: [provider(1), provider(2)],
      buy: [provider(3)],
    })

    expect(groups.map((g) => [g.label, g.providers.map((p) => p.id)])).toEqual([
      ['Stream', [1, 2]],
      ['Buy', [3]],
    ])
  })

  it('takes the country from the browser language', () => {
    expect(userCountry('it')).toBe('IT')
    expect(userCountry('en-GB')).toBe('GB')
  })
})
