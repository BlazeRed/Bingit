import { describe, expect, it } from 'vitest'

import { padEpisodeCode } from '../episodes'

describe('padEpisodeCode', () => {
  it.each([
    ['E5', 'E05'],
    ['E105', 'E105'],
    ['S1E2', 'S01E02'],
    ['S01E02', 'S01E02'],
  ])('shows %s as %s', (code, shown) => {
    expect(padEpisodeCode(code)).toBe(shown)
  })
})
