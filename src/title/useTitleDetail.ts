import { onMounted, ref, shallowRef } from 'vue'

import {
  getAnimeExtras,
  getCast,
  getDetail,
  getEpisodes,
  type AnimeExtras,
  type Person,
  type SimklDetail,
} from '@/api/catalog'
import type { MediaType } from '@/library/item'
import { toSeasons, type Season } from './model'

/** Loads one title. Each source fails on its own, so one outage hides one section. */
export function useTitleDetail(type: MediaType, id: number) {
  const detail = shallowRef<SimklDetail>()
  const seasons = shallowRef<Season[]>([])
  const cast = shallowRef<Person[]>([])
  const anime = shallowRef<AnimeExtras>()
  const error = ref('')
  const warnings = ref<string[]>([])

  const warn = (message: string) => () => void warnings.value.push(message)

  async function loadExtras({ ids }: SimklDetail) {
    if (type === 'anime') {
      if (!ids.anilist) return
      await getAnimeExtras(ids.anilist).then(
        (extras) => (anime.value = extras),
        warn('Characters and staff are not available right now.'),
      )
    } else if (ids.tmdb) {
      await getCast(type === 'tv' ? 'tv' : 'movie', ids.tmdb).then(
        (people) => (cast.value = people),
        warn('The cast is not available right now.'),
      )
    }
  }

  async function loadEpisodes() {
    if (type === 'movies') return
    await getEpisodes(type, id).then(
      (episodes) => (seasons.value = toSeasons(episodes)),
      warn('The episode list is not available right now.'),
    )
  }

  onMounted(async () => {
    try {
      // Episodes first: the page needs both to offer actions.
      const [loaded] = await Promise.all([getDetail(type, id), loadEpisodes()])
      detail.value = loaded
      await loadExtras(loaded)
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Could not load this title.'
    }
  })

  return { detail, seasons, cast, anime, error, warnings }
}
