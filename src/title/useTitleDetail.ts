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
import { getWatchOptions, type WatchOptions } from '@/api/watch-providers'
import { messageOf } from '@/lib/errors'
import type { MediaType } from '@/library/item'
import { toSeasons, type Season } from './model'

/** Loads one title. Each source fails on its own, so one outage hides one section. */
export function useTitleDetail(type: MediaType, id: number, { withPeople = true } = {}) {
  const detail = shallowRef<SimklDetail>()
  const seasons = shallowRef<Season[]>([])
  const cast = shallowRef<Person[]>([])
  const anime = shallowRef<AnimeExtras>()
  const watchOptions = shallowRef<WatchOptions | null>(null)
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

  async function loadWatchOptions({ ids, anime_type }: SimklDetail) {
    if (!ids.tmdb) return
    // OVAs and specials are skipped: their TMDB id can point to another title.
    if (type === 'anime' && anime_type !== 'tv' && anime_type !== 'movie') return
    const kind = type === 'movies' || anime_type === 'movie' ? 'movie' : 'tv'
    await getWatchOptions(kind, ids.tmdb).then(
      (options) => (watchOptions.value = options),
      warn('Where to watch is not available right now.'),
    )
  }

  async function loadEpisodes() {
    if (type === 'movies') return
    await getEpisodes(type, id).then(
      (episodes) => (seasons.value = toSeasons(episodes)),
      warn('The episode list is not available right now.'),
    )
  }

  async function load() {
    error.value = ''
    warnings.value = []
    try {
      // Episodes first: the page needs both to offer actions.
      const [loaded] = await Promise.all([getDetail(type, id), loadEpisodes()])
      detail.value = loaded
      if (withPeople) await Promise.all([loadExtras(loaded), loadWatchOptions(loaded)])
    } catch (cause) {
      error.value = messageOf(cause)
    }
  }

  onMounted(load)

  return { detail, seasons, cast, anime, watchOptions, error, warnings, load }
}
