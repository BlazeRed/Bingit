import { describe, expect, it } from 'vitest'

import type { SimklDetail, SimklRelation } from '@/api/catalog'
import { animeSeasons, relationTag, sameStory } from '../model'

const link = (id: number, relation_type: string, is_direct = true): SimklRelation => ({
  title: `Title ${id}`,
  ids: { simkl: id },
  relation_type,
  is_direct,
})

const title = (
  id: number,
  first_aired: string,
  relations: SimklRelation[],
  anime_type = 'tv',
  tvdb = '1',
): SimklDetail => ({
  title: `Title ${id}`,
  ids: { simkl: id, tvdb },
  first_aired,
  anime_type,
  relations,
})

/** The shape of Ranma: an old series and its remake, with false distant "sequels". */
const catalog = [
  title(1, '1989-04', [
    link(2, 'sequel'),
    link(3, 'alternative setting'),
    link(4, 'sequel', false),
  ]),
  title(2, '1989-10', [link(1, 'season 1'), link(4, 'sequel', false)]),
  title(3, '2024-10', [
    link(4, 'sequel'),
    link(1, 'alternative setting'),
    link(2, 'sequel', false),
  ]),
  // A film sits between two seasons of the remake.
  title(4, '2025-10', [link(3, 'season 1'), link(5, 'sequel'), link(2, 'sequel', false)]),
  title(5, '2026-01', [link(4, 'prequel'), link(6, 'sequel')], 'movie'),
  title(6, '2026-10', [link(5, 'prequel'), link(3, 'season 1'), link(7, 'sequel')]),
  // A crossover: a direct "sequel" that is another show.
  title(7, '2008-04', [link(6, 'prequel'), link(8, 'sequel')]),
  // Its announced next season: no TVDB id and no "season 1" link yet.
  title(8, '', [link(7, 'prequel')], 'tv', ''),
]
const load = async (id: number) => catalog[id - 1]!
const ids = async (from: number) => (await animeSeasons(await load(from), load)).map((s) => s.id)

describe('animeSeasons', () => {
  it('follows direct links only, so a remake stays apart', async () => {
    expect(await ids(1)).toEqual([1, 2])
    expect(await ids(2)).toEqual([1, 2])
  })

  it('gives the same list from every season, also across a film', async () => {
    expect(await ids(3)).toEqual([3, 4, 6])
    expect(await ids(6)).toEqual([3, 4, 6])
  })

  it('leaves out another show, but keeps an announced season', async () => {
    expect(await ids(6)).not.toContain(7)
    expect(await ids(7)).toEqual([7, 8])
    expect(await ids(8)).toEqual([7, 8])
  })

  it('is empty for a single season and for a film', async () => {
    expect(await animeSeasons(title(9, '2020', []), load)).toEqual([])
    expect(await ids(5)).toEqual([])
  })
})

describe('sameStory', () => {
  const detail = title(9, '2020', [
    { ...link(1, 'summary'), year: 2019 },
    { ...link(2, 'side story', false), year: 2025 },
    { ...link(3, 'side story', false), year: 2020 },
    link(4, 'sequel'),
  ])

  it('skips the seasons, puts direct links first and summaries last', () => {
    const shown = sameStory(detail, [{ id: 4, year: 2021 }]).map((r) => r.ids.simkl)

    expect(shown).toEqual([3, 2, 1])
  })

  it('does not call a distant title a sequel', () => {
    expect(relationTag(link(1, 'sequel', false))).toBe('Related')
    expect(relationTag(link(1, 'sequel'))).toBe('Sequel')
  })
})
