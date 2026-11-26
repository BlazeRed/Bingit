/** Public data for the detail page. Free of Simkl quota, cached locally. */
import { cachedFetch } from '@/db/cache'
import type { MediaType } from '@/library/item'
import { anilistQuery } from './anilist'
import type { SimklIds } from './simkl-types'
import { simklCatalog } from './simkl'
import { tmdbGet } from './tmdb'

// Short for Simkl: episode lists change when an episode airs.
const SIMKL_TTL = 6 * 60 * 60 * 1000
const EXTRA_TTL = 7 * 24 * 60 * 60 * 1000

export interface SimklRelated {
  title: string
  year?: number | null
  poster?: string | null
  type: string
  ids: SimklIds
}

export interface SimklDetail {
  title: string
  en_title?: string | null
  year?: number | null
  ids: SimklIds
  poster?: string | null
  fanart?: string | null
  runtime?: number | null
  overview?: string | null
  genres?: string[]
  network?: string | null
  anime_type?: string | null
  total_episodes?: number | null
  ratings?: Partial<Record<'simkl' | 'imdb' | 'mal', { rating?: number }>>
  trailers?: { name?: string | null; youtube: string }[] | null
  users_recommendations?: SimklRelated[] | null
}

export interface SimklEpisode {
  title?: string | null
  /** Omitted for anime. */
  season?: number
  episode: number
  type: string
  aired?: boolean
  date?: string | null
}

export interface Person {
  key: string
  name: string
  role: string
  image: string | null
}

export function getDetail(type: MediaType, id: number): Promise<SimklDetail> {
  return cachedFetch(`simkl:${type}:${id}`, SIMKL_TTL, async () => {
    const detail = await simklCatalog<SimklDetail | null>(`/${type}/${id}`)
    if (!detail?.title) throw new Error('Title not found on Simkl.')
    return detail
  })
}

export function getEpisodes(type: 'tv' | 'anime', id: number): Promise<SimklEpisode[]> {
  return cachedFetch(`simkl:episodes:${id}`, SIMKL_TTL, async () => {
    const episodes = await simklCatalog<SimklEpisode[] | null>(`/${type}/episodes/${id}`)
    if (!Array.isArray(episodes)) throw new Error('Episode list not available.')
    return episodes
  })
}

interface TmdbCast {
  id: number
  name: string
  profile_path: string | null
  /** Movies. */
  character?: string
  /** TV `aggregate_credits`. */
  roles?: { character: string }[]
}

export function getCast(type: 'movie' | 'tv', tmdbId: string): Promise<Person[]> {
  const credits = type === 'tv' ? 'aggregate_credits' : 'credits'
  return cachedFetch(`tmdb:${type}:${tmdbId}`, EXTRA_TTL, async () => {
    const response = await tmdbGet<Partial<Record<string, { cast?: TmdbCast[] }>>>(
      `/${type}/${tmdbId}`,
      { append_to_response: credits },
    )
    return (response[credits]?.cast ?? []).slice(0, 12).map((member) => ({
      key: String(member.id),
      name: member.name,
      role: member.character ?? member.roles?.[0]?.character ?? '',
      image: member.profile_path && `https://image.tmdb.org/t/p/w185${member.profile_path}`,
    }))
  })
}

interface AniListName {
  id: number
  name: { full: string }
  image: { medium: string | null }
}

interface AniListMedia {
  nextAiringEpisode: { episode: number; airingAt: number } | null
  characters: { edges: { node: AniListName; voiceActors: { name: { full: string } }[] }[] }
  staff: { edges: { role: string; node: AniListName }[] }
  relations: {
    edges: {
      relationType: string
      node: { id: number; siteUrl: string; title: { romaji: string; english: string | null } }
    }[]
  }
}

const ANIME_QUERY = `query ($id: Int) {
  Media(id: $id, type: ANIME) {
    nextAiringEpisode { episode airingAt }
    characters(sort: [ROLE, RELEVANCE], perPage: 12) {
      edges { node { id name { full } image { medium } } voiceActors(language: JAPANESE) { name { full } } }
    }
    staff(sort: RELEVANCE, perPage: 8) { edges { role node { id name { full } image { medium } } } }
    relations { edges { relationType node { id siteUrl title { romaji english } } } }
  }
}`

const toPerson = (node: AniListName, role: string): Person => ({
  key: `${node.id}:${role}`,
  name: node.name.full,
  role,
  image: node.image.medium,
})

export function getAnimeExtras(anilistId: string) {
  return cachedFetch(`anilist:${anilistId}`, SIMKL_TTL, async () => {
    const { Media } = await anilistQuery<{ Media: AniListMedia }>(ANIME_QUERY, {
      id: Number(anilistId),
    })
    return {
      nextAiring: Media.nextAiringEpisode,
      characters: Media.characters.edges.map((edge) =>
        toPerson(edge.node, edge.voiceActors[0]?.name.full ?? ''),
      ),
      staff: Media.staff.edges.map((edge) => toPerson(edge.node, edge.role)),
      relations: Media.relations.edges.map(({ relationType, node }) => ({
        id: node.id,
        url: node.siteUrl,
        title: node.title.english ?? node.title.romaji,
        relation: relationType.toLowerCase().replaceAll('_', ' '),
      })),
    }
  })
}

export type AnimeExtras = Awaited<ReturnType<typeof getAnimeExtras>>
