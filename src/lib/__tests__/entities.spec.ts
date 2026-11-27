import { describe, expect, it } from 'vitest'

import { decodeDeep } from '../entities'

describe('decodeDeep', () => {
  it('decodes the texts of a response and leaves the rest', () => {
    const response = [{ title: 'JoJo&#039;s &amp; &#x41; &unknown; A&B', year: 2012, end: null }]

    expect(decodeDeep(response)).toEqual([
      { title: "JoJo's & A &unknown; A&B", year: 2012, end: null },
    ])
  })
})
