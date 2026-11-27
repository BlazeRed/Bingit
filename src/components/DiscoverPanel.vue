<script setup lang="ts">
import ErrorNote from './ErrorNote.vue'
import { computed, ref, watch } from 'vue'

import { Compass, Tag, TrendingUp } from '@lucide/vue'

import { getBrowse, getGenres, getTrending } from '@/api/discover'
import FilterSheet from '@/components/FilterSheet.vue'
import SegmentedControl from '@/components/SegmentedControl.vue'
import TitleRow from '@/components/TitleRow.vue'
import { useAsync } from '@/composables/useAsync'
import { TYPES } from '@/library/browse'
import type { MediaType } from '@/library/item'

/** `hidden` leaves only the pinned header, with what the page puts in it. */
defineProps<{ hidden?: boolean }>()

const PAGE = 30

const TRENDING = {
  today: 'Today',
  week: 'This week',
  month: 'This month',
} as const
const BROWSE = {
  best: 'Top rated',
  new: 'New premieres',
  soon: 'Coming soon',
} as const

type List = keyof typeof TRENDING | keyof typeof BROWSE

const type = ref<MediaType>('tv')
const list = ref<List>('week')
const genre = ref('')
const shown = ref(PAGE)

const isBrowse = (value: List): value is keyof typeof BROWSE => value in BROWSE

// Movies have trending files only.
watch(type, (value) => {
  genre.value = ''
  if (value === 'movies' && isBrowse(list.value)) list.value = 'week'
})
watch([type, list, genre], () => (shown.value = PAGE))

const { data: genres } = useAsync(() => type.value, getGenres)
const chosenGenre = computed(() => genres.value?.find((g) => g.slug === genre.value))
const genreName = computed(() => chosenGenre.value?.name ?? '')

// Browse lists hold every genre, so only a trending list is loaded again for one.
const selection = computed(
  () => `${type.value}|${list.value}|${isBrowse(list.value) ? '' : genre.value}`,
)
const {
  data: loaded,
  error,
  isLoading,
  retry,
} = useAsync(
  () => selection.value,
  () => {
    if (!isBrowse(list.value)) return getTrending(type.value, list.value, chosenGenre.value)
    return getBrowse(type.value === 'anime' ? 'anime' : 'tv', list.value)
  },
)

const isBrowseByGenre = computed(() => isBrowse(list.value) && genre.value !== '')
const hasNoGenres = computed(
  () =>
    isBrowseByGenre.value && Boolean(loaded.value?.length) && !loaded.value?.some((c) => c.genres),
)
const cards = computed(() =>
  isBrowseByGenre.value
    ? loaded.value?.filter((c) => c.genres?.includes(genreName.value))
    : loaded.value,
)
const emptyMessage = computed(() => {
  if (hasNoGenres.value) return 'Simkl sends no genres for this list. Choose a trending list.'
  if (!genre.value) return 'Nothing here right now.'
  const hint = list.value === 'today' || list.value === 'week' ? ' Try “This month”.' : ''
  return `No ${genreName.value} title in this list.${hint}`
})

const heading = computed(() => {
  const name = isBrowse(list.value)
    ? `${BROWSE[list.value]} on Simkl`
    : `Trending on Simkl ${TRENDING[list.value].toLowerCase()}`
  return genre.value ? `${name} · ${genreName.value}` : name
})

const toOptions = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }))

const listGroups = computed(() => {
  const trending = { label: 'Trending', options: toOptions(TRENDING) }
  if (type.value === 'movies') return [trending]
  return [trending, { label: 'Browse', options: toOptions(BROWSE) }]
})

const ALL_GENRES = 'all'
const genreGroups = computed(() => [
  {
    options: [
      { value: ALL_GENRES, label: 'All genres' },
      ...(genres.value ?? []).map((g) => ({ value: g.slug, label: g.name })),
    ],
  },
])

const MOST_WATCHED = {
  movies: 'https://simkl.com/movies/best-movies/most-watched/',
  tv: 'https://simkl.com/tv/best-shows/most-watched/',
  anime: 'https://simkl.com/anime/best-anime/most-watched/',
}
</script>

<template>
  <div class="pinned">
    <slot />
    <SegmentedControl
      v-show="!hidden"
      v-model="type"
      class="category"
      :options="TYPES"
      label="Category"
    />
    <div v-show="!hidden" class="filters">
      <FilterSheet
        :model-value="list"
        :groups="listGroups"
        :label="isBrowse(list) ? 'Browse' : 'Trending'"
        title="List"
        :icon="isBrowse(list) ? Compass : TrendingUp"
        @update:model-value="list = $event as List"
      />
      <FilterSheet
        :model-value="genre || ALL_GENRES"
        :groups="genreGroups"
        label="Genre"
        title="Genre"
        :icon="Tag"
        search-label="Find a genre"
        @update:model-value="genre = $event === ALL_GENRES ? '' : $event"
      />
    </div>
  </div>

  <section v-show="!hidden" class="discover" aria-label="Discover">
    <h2>{{ heading }}</h2>
    <ErrorNote v-if="error" :message="error" @retry="retry" />
    <p v-else-if="isLoading" class="muted" role="status">Loading…</p>
    <p v-else-if="!cards?.length" class="muted">{{ emptyMessage }}</p>
    <template v-else>
      <ul class="card-list card-grid">
        <TitleRow v-for="card in cards.slice(0, shown)" :key="card.id" :card="card" />
      </ul>
      <button v-if="shown < cards.length" type="button" class="field" @click="shown += PAGE">
        Show more
      </button>
    </template>
    <p class="muted">
      <a :href="MOST_WATCHED[type]" target="_blank" rel="noopener">Most watched on Simkl</a>
    </p>
  </section>
</template>

<style scoped>
.discover {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.filters {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
}

@media (min-width: 64rem) {
  .pinned {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  /* Title and search field take a whole row; category and filters share one. */
  :slotted(*) {
    grid-column: 1 / -1;
  }

  .discover > .field {
    align-self: center;
  }
}
</style>
