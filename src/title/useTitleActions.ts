import { computed, type Ref } from 'vue'

import type { SimklDetail } from '@/api/catalog'
import type { Episodes } from '@/library/episodes'
import type { MediaType } from '@/library/item'
import type { Change } from '@/library/ops'
import { useLibraryStore } from '@/stores/library'
import { airedEpisodes, seedItem, type Season } from './model'

/** The user's state for one title, and the way to change it. */
export function useTitleActions(
  type: MediaType,
  id: number,
  detail: Ref<SimklDetail | undefined>,
  seasons: Ref<Season[]>,
) {
  const library = useLibraryStore()

  const item = computed(() => library.byId[id])
  const subject = computed(
    () => item.value ?? (detail.value && seedItem(type, detail.value, seasons.value)),
  )
  const isMovie = computed(
    () => type === 'movies' || (detail.value?.anime_type ?? item.value?.animeType) === 'movie',
  )

  const aired = computed(() => airedEpisodes(seasons.value))
  /** A completed title has no episode list: all aired episodes count as watched. */
  const watched = computed<Episodes>(
    () => item.value?.seasons ?? (item.value?.status === 'completed' ? aired.value : {}),
  )
  const isHistoryUnknown = computed(
    () => item.value && !item.value.seasons && item.value.status === 'dropped',
  )

  function act(change: Change) {
    if (!subject.value) return
    const baseline = item.value?.status === 'completed' ? aired.value : undefined
    void library.act({ ...change, item: subject.value, baseline })
  }

  return { item, subject, isMovie, watched, isHistoryUnknown, act }
}
