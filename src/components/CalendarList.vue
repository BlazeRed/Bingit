<script setup lang="ts">
import { CheckboxIndicator, CheckboxRoot } from 'reka-ui'
import { Check } from '@lucide/vue'
import ErrorNote from './ErrorNote.vue'
import { computed, ref, watch } from 'vue'

import { getCalendar } from '@/api/discover'
import SegmentedControl from '@/components/SegmentedControl.vue'
import TitleRow from '@/components/TitleRow.vue'
import { useAsync } from '@/composables/useAsync'
import { followedIds, groupByDay, mostPopular, type Day } from '@/discover/calendar'
import { TYPES } from '@/library/browse'
import type { MediaType } from '@/library/item'
import { useLibraryStore } from '@/stores/library'

const DAYS_PER_PAGE = 7
/** The whole catalog airs hundreds of titles a day. */
const PER_DAY = 15

const props = defineProps<{ initialType: MediaType }>()

const library = useLibraryStore()
const type = ref<MediaType>(props.initialType)
const isMineOnly = ref(true)
const shown = ref(DAYS_PER_PAGE)
const expanded = ref(new Set<string>())
watch([type, isMineOnly], () => {
  shown.value = DAYS_PER_PAGE
  expanded.value = new Set()
})

const airingsOf = (day: Day) =>
  expanded.value.has(day.date.toDateString()) ? day.airings : mostPopular(day.airings, PER_DAY)

const { data: file, error, isLoading, retry } = useAsync(() => type.value, getCalendar)

const mine = computed(() => followedIds(library.items))

const days = computed(() =>
  file.value
    ? groupByDay(file.value, type.value, new Date(), isMineOnly.value ? mine.value : undefined)
    : [],
)

const dayName = (date: Date) =>
  date.toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })

const time = (date: Date) => date.toLocaleTimeString('en', { timeStyle: 'short' })
</script>

<template>
  <div class="calendar">
    <div class="calendar__filters">
      <SegmentedControl v-model="type" :options="TYPES" label="Category" />
      <label class="mine">
        <CheckboxRoot v-model="isMineOnly" class="mine__box">
          <CheckboxIndicator>
            <Check :size="14" :stroke-width="3" aria-hidden="true" />
          </CheckboxIndicator>
        </CheckboxRoot>
        Only titles in my library
      </label>
    </div>

    <!-- A new filter starts from the first day. -->
    <div :key="`${type}:${isMineOnly}`" class="calendar__days">
      <ErrorNote v-if="error" :message="error" @retry="retry" />
      <p v-else-if="isLoading" class="muted" role="status">Loading…</p>
      <p v-else-if="!days.length" class="muted">Nothing scheduled in the coming weeks.</p>

      <section v-for="day in days.slice(0, shown)" :key="day.date.toDateString()">
        <h3>{{ dayName(day.date) }}</h3>
        <ul class="card-list">
          <TitleRow
            v-for="airing in airingsOf(day)"
            :key="airing.key"
            :card="airing.card"
            :note="[airing.episode, time(airing.date)].filter(Boolean).join(' · ')"
          />
        </ul>
        <button
          v-if="airingsOf(day).length < day.airings.length"
          type="button"
          class="field all"
          @click="expanded.add(day.date.toDateString())"
        >
          Show all {{ day.airings.length }}
        </button>
      </section>

      <button
        v-if="shown < days.length"
        type="button"
        class="field"
        @click="shown += DAYS_PER_PAGE"
      >
        Show more days
      </button>
    </div>

    <p class="calendar__credit muted">Release data from <a href="https://simkl.com">Simkl</a>.</p>
  </div>
</template>

<style scoped>
.calendar {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.calendar__filters {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-5) var(--space-2);
  border-bottom: 1px solid var(--color-border);
}

.calendar__days {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-4);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: var(--space-4) var(--space-5);
}

/* The list scrolls; its sections must not shrink. */
.calendar__days > * {
  flex-shrink: 0;
}

.calendar__credit {
  padding: var(--space-3) var(--space-5) calc(var(--space-3) + env(safe-area-inset-bottom));
  border-top: 1px solid var(--color-border);
}

.all {
  margin-top: var(--space-2);
}

.mine {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  min-height: var(--tap-min);
}

.mine__box {
  display: grid;
  flex: none;
  place-items: center;
  width: 1.25rem;
  height: 1.25rem;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  cursor: pointer;
}

.mine__box[data-state='checked'] {
  border-color: var(--color-action);
  background: var(--color-action);
  color: var(--color-on-action);
}

h3 {
  margin-bottom: var(--space-3);
  font-size: var(--text-base);
}
</style>
