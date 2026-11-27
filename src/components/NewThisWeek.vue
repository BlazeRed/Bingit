<script setup lang="ts">
import ErrorNote from './ErrorNote.vue'
import { computed, ref, watch } from 'vue'
import { CalendarDays } from '@lucide/vue'

import { getCalendar } from '@/api/discover'
import CalendarSheet from './CalendarSheet.vue'
import { useAsync } from '@/composables/useAsync'
import { daysUntil, followedIds, groupByDay } from '@/discover/calendar'
import { TYPES } from '@/library/browse'
import type { MediaType } from '@/library/item'
import { useLibraryStore } from '@/stores/library'

const emit = defineEmits<{ count: [episodes: number] }>()

const library = useLibraryStore()
const {
  data: files,
  error,
  retry,
} = useAsync(
  () => true,
  () => Promise.all((['tv', 'anime', 'movies'] as const).map(getCalendar)),
)

const airings = computed(() => {
  const [tv, anime, movies] = files.value ?? []
  if (!tv || !anime || !movies) return []
  const now = new Date()
  const mine = followedIds(library.items)
  return [
    ...groupByDay(tv, 'tv', now, mine),
    ...groupByDay(anime, 'anime', now, mine),
    ...groupByDay(movies, 'movies', now, mine),
  ]
    .flatMap((day) => day.airings)
    .filter((airing) => daysUntil(airing.date, now) < 7)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((airing) => ({ ...airing, inDays: daysUntil(airing.date, now) }))
})

/** The first release of each category, soonest first. */
const rows = computed(() =>
  airings.value.filter(
    (airing, index) =>
      airings.value.findIndex((other) => other.card.type === airing.card.type) === index,
  ),
)

const more = computed(() => airings.value.length - rows.value.length)

watch(
  // The page header counts episodes only.
  () => airings.value.filter((airing) => airing.card.type !== 'movies').length,
  (length) => emit('count', length),
  { immediate: true },
)

const when = (inDays: number) =>
  inDays === 0 ? 'Today' : inDays === 1 ? 'Tomorrow' : `In ${inDays} days`

const weekday = (date: Date) => date.toLocaleDateString('en', { weekday: 'short' })

const isOpen = ref(false)
const sheetType = ref<MediaType>('tv')

function open(type: MediaType) {
  sheetType.value = type
  isOpen.value = true
}
</script>

<template>
  <section class="week">
    <div class="week__header">
      <h2>New this week</h2>
      <button type="button" class="action-link" @click="open('tv')">
        <CalendarDays :size="16" aria-hidden="true" />Calendar
      </button>
    </div>

    <ErrorNote v-if="error" :message="error" @retry="retry" />
    <p v-else-if="!files || !library.isImported" class="muted" role="status">Loading…</p>
    <p v-else-if="!airings.length" class="muted">
      Nothing new from your library in the next 7 days.
    </p>
    <ul v-else>
      <li v-for="airing in rows" :key="airing.key">
        <button type="button" class="week__row" @click="open(airing.card.type)">
          <span class="week__date mono">
            {{ weekday(airing.date) }}
            <strong>{{ airing.date.getDate() }}</strong>
          </span>
          <span class="week__text">
            <span class="week__title">{{ airing.card.title }}</span>
            <span class="muted mono">
              {{ TYPES[airing.card.type] }}
              <template v-if="airing.episode"> · {{ airing.episode }}</template>
              · {{ when(airing.inDays) }}
            </span>
          </span>
        </button>
      </li>
    </ul>
    <button v-if="more" type="button" class="action-link week__more" @click="open('tv')">
      <CalendarDays :size="16" aria-hidden="true" />{{ more }} more in the calendar
    </button>

    <CalendarSheet v-model:open="isOpen" :initial-type="sheetType" />
  </section>
</template>

<style scoped>
.week {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.week__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.week__more {
  align-self: flex-start;
}

ul {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.week__row {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  width: 100%;
  padding: var(--space-3);
  border: 0;
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  text-align: left;
  cursor: pointer;
}

/* The next one stands out. */
li:first-child .week__row {
  background: var(--color-highlight);
}

li:first-child .week__date {
  color: var(--color-on-highlight);
}

.week__date {
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: center;
  width: 2.75rem;
  font-size: var(--text-2xs);
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.week__date strong {
  font-family: var(--font-sans);
  font-size: var(--text-lg);
}

.week__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.week__title {
  font-weight: var(--weight-semibold);
  line-height: var(--leading-snug);
}
</style>
