/** Person pages: TMDB for movie and TV people, AniList for anime staff. */
import { cachedFetch } from '@/db/cache'
import { anilistQuery } from './anilist'
import type { ExternalSource } from './discover'
import { tmdbGet } from './tmdb'

const TTL = 7 * 24 * 60 * 60 * 1000

export interface Credit {
  key: string
  source: ExternalSource
  id: number
  title: string
  year: number | null
  role: string
}

export interface Profile {
  name: string
  image: string | null
  about: string
  credits: Credit[]
}

interface TmdbCredit {
  id: number
  media_type: 'movie' | 'tv'
  title?: string
  name?: string
  release_date?: string
  first_air_date?: string
  character?: string
  job?: string
}

interface TmdbPerson {
  name: string
  biography: string
  profile_path: string | null
  combined_credits: { cast: TmdbCredit[]; crew: TmdbCredit[] }
}

/** One row per title, newest first; the first role listed wins. */
function uniqueNewestFirst(credits: Credit[]): Credit[] {
  const byKey = new Map<string, Credit>()
  for (const credit of credits) {
    if (!byKey.has(credit.key)) byKey.set(credit.key, credit)
  }
  return [...byKey.values()].sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
}

export function getPerson(id: string): Promise<Profile> {
  return cachedFetch(`tmdb:person:${id}`, TTL, async () => {
    const person = await tmdbGet<TmdbPerson>(`/person/${id}`, {
      append_to_response: 'combined_credits',
    })
    const { cast, crew } = person.combined_credits
    return {
      name: person.name,
      image: person.profile_path && `https://image.tmdb.org/t/p/w185${person.profile_path}`,
      about: person.biography,
      credits: uniqueNewestFirst(
        [...cast, ...crew].map((credit) => ({
          key: `${credit.media_type}:${credit.id}`,
          source: `tmdb-${credit.media_type}` as const,
          id: credit.id,
          title: credit.title ?? credit.name ?? 'Untitled',
          year: Number((credit.release_date ?? credit.first_air_date)?.slice(0, 4)) || null,
          role: credit.character || credit.job || '',
        })),
      ),
    }
  })
}

interface AniListNode {
  id: number
  type: string
  title: { romaji: string; english: string | null }
  startDate: { year: number | null }
}

interface AniListStaff {
  name: { full: string }
  image: { large: string | null }
  description: string | null
  characterMedia: { edges: { node: AniListNode; characters: { name: { full: string } }[] }[] }
  staffMedia: { edges: { node: AniListNode; staffRole: string }[] }
}

const STAFF_QUERY = `query ($id: Int) {
  Staff(id: $id) {
    name { full }
    image { large }
    description(asHtml: false)
    characterMedia(sort: POPULARITY_DESC, perPage: 25) {
      edges { characters { name { full } } node { id type title { romaji english } startDate { year } } }
    }
    staffMedia(sort: POPULARITY_DESC, perPage: 25) {
      edges { staffRole node { id type title { romaji english } startDate { year } } }
    }
  }
}`

/** AniList descriptions are Markdown with some HTML; shown as plain text. */
export const toPlainText = (text: string) =>
  text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>|__|\*\*|~!|!~/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')

const toCredit = (node: AniListNode, role: string): Credit => ({
  key: String(node.id),
  source: 'anilist',
  id: node.id,
  title: node.title.english ?? node.title.romaji,
  year: node.startDate.year,
  role,
})

export function getStaff(id: string): Promise<Profile> {
  return cachedFetch(`anilist:staff:${id}`, TTL, async () => {
    const { Staff } = await anilistQuery<{ Staff: AniListStaff }>(STAFF_QUERY, {
      id: Number(id),
    })
    const voiced = Staff.characterMedia.edges.map(({ node, characters }) => ({
      node,
      role: characters.map((c) => c.name.full).join(', '),
    }))
    const worked = Staff.staffMedia.edges.map(({ node, staffRole }) => ({
      node,
      role: staffRole,
    }))
    return {
      name: Staff.name.full,
      image: Staff.image.large,
      about: toPlainText(Staff.description ?? ''),
      credits: uniqueNewestFirst(
        [...voiced, ...worked]
          .filter(({ node }) => node.type === 'ANIME')
          .map(({ node, role }) => toCredit(node, role)),
      ),
    }
  })
}
