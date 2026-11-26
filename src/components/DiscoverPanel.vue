<script setup lang="ts">
import ErrorNote from './ErrorNote.vue'
import { computed, ref, watch } from 'vue'

import { getBrowse, getGenreTrending, getGenres, getTrending } from '@/api/discover'
import SegmentedControl from '@/components/SegmentedControl.vue'
import TitleRow from '@/components/TitleRow.vue'
import { useAsync } from '@/composables/useAsync'
import { TYPES } from '@/library/browse'
import type { MediaType } from '@/library/item'

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

const selection = computed(() => `${type.value}|${list.value}|${genre.value}`)
const {
  data: cards,
  error,
  isLoading,
  retry,
} = useAsync(
  () => selection.value,
  () => {
    if (genre.value) return getGenreTrending(type.value, genre.value)
    if (!isBrowse(list.value)) return getTrending(type.value, list.value)
    return getBrowse(type.value === 'anime' ? 'anime' : 'tv', list.value)
  },
)

const heading = computed(() => {
  if (genre.value) {
    const name = genres.value?.find((g) => g.slug === genre.value)?.name ?? genre.value
    return `Trending ${name} on Simkl this month`
  }
  if (isBrowse(list.value)) return `${BROWSE[list.value]} on Simkl`
  return `Trending on Simkl ${TRENDING[list.value].toLowerCase()}`
})

const MOST_WATCHED = {
  movies: 'https://simkl.com/movies/best-movies/most-watched/',
  tv: 'https://simkl.com/tv/best-shows/most-watched/',
  anime: 'https://simkl.com/anime/best-anime/most-watched/',
}
</script>

<template>
  <section class="discover" aria-label="Discover">
    <SegmentedControl v-model="type" :options="TYPES" label="Category" />

    <div class="filters">
      <select v-model="list" class="field" aria-label="List" :disabled="Boolean(genre)">
        <optgroup label="Trending">
          <option v-for="(label, key) in TRENDING" :key="key" :value="key">{{ label }}</option>
        </optgroup>
        <optgroup v-if="type !== 'movies'" label="Browse">
          <option v-for="(label, key) in BROWSE" :key="key" :value="key">{{ label }}</option>
        </optgroup>
      </select>
      <select v-model="genre" class="field" aria-label="Genre">
        <option value="">All genres</option>
        <option v-for="g in genres" :key="g.slug" :value="g.slug">{{ g.name }}</option>
      </select>
    </div>

    <h2>{{ heading }}</h2>
    <ErrorNote v-if="error" :message="error" @retry="retry" />
    <p v-else-if="isLoading" class="muted" role="status">Loading…</p>
    <p v-else-if="!cards?.length" class="muted">Nothing here right now.</p>
    <template v-else>
      <ul class="card-list">
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
  display: flex;
  gap: var(--space-2);
}

.filters select {
  flex: 1;
  min-width: 0;
}
</style>
