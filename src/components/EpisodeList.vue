<script setup lang="ts">
import { computed } from 'vue'
import { Check } from '@lucide/vue'

import type { SimklEpisode } from '@/api/catalog'
import type { Episodes } from '@/library/episodes'
import { currentSeason, type Season } from '@/title/model'

const props = defineProps<{
  seasons: Season[]
  watched: Episodes
  /** The season to show; without it, the one the user is in. */
  season?: number
  /** Side panel: small rows. */
  compact?: boolean
}>()
const emit = defineEmits<{ watch: [episodes: Episodes]; unwatch: [episodes: Episodes] }>()

const isWatched = (season: number, episode: number) =>
  props.watched[season]?.includes(episode) ?? false

/** Read once: the list must not jump away when the last episode gets marked. */
const initial = currentSeason(props.seasons, props.watched)
const selected = computed(() => props.season ?? initial)

const shown = computed(() => props.seasons.find((s) => s.number === selected.value))
const aired = computed(() => shown.value?.episodes.filter((e) => e.aired) ?? [])
const unwatched = computed(() => aired.value.filter((e) => !isWatched(selected.value!, e.episode)))

/** The first aired episode still to watch. */
const next = computed(() => unwatched.value[0])
const watchedInSeason = computed(() => aired.value.length - unwatched.value.length)

const inSeason = (episodes: SimklEpisode[]): Episodes => ({
  [selected.value!]: episodes.map((e) => e.episode),
})

function toggle(episode: SimklEpisode) {
  if (isWatched(selected.value!, episode.episode)) emit('unwatch', inSeason([episode]))
  else emit('watch', inSeason([episode]))
}

const upTo = (episode: SimklEpisode) =>
  emit('watch', inSeason(unwatched.value.filter((e) => e.episode <= episode.episode)))

function toggleSeason() {
  if (unwatched.value.length) emit('watch', inSeason(unwatched.value))
  else if (confirm('Mark every episode of this season as not watched?')) {
    emit('unwatch', inSeason(aired.value))
  }
}

const code = (episode: number) =>
  `S${String(selected.value).padStart(2, '0')}E${String(episode).padStart(2, '0')}`

const airDate = (date?: string | null) =>
  date ? new Date(date).toLocaleDateString('en', { dateStyle: 'medium' }) : 'Date unknown'
</script>

<template>
  <section class="episodes" :class="{ 'episodes--compact': compact }" aria-label="Episodes">
    <p v-if="compact" class="episodes__summary">
      Season {{ selected }} · {{ watchedInSeason }} of {{ shown?.episodes.length }} watched
    </p>
    <div v-else-if="aired.length" class="episodes__bar">
      <button type="button" class="chip" @click="toggleSeason">
        {{ unwatched.length ? 'Mark season watched' : 'Unmark season' }}
      </button>
    </div>

    <ol>
      <li
        v-for="episode in shown?.episodes"
        :key="episode.episode"
        :class="{ episodes__next: episode === next }"
      >
        <button
          type="button"
          class="check"
          :disabled="!episode.aired"
          :aria-pressed="isWatched(selected!, episode.episode)"
          :aria-label="`Episode ${episode.episode} watched`"
          @click="toggle(episode)"
        >
          <Check v-if="isWatched(selected!, episode.episode)" :size="20" aria-hidden="true" />
        </button>
        <div class="episodes__text">
          <span class="episodes__meta mono">
            {{ code(episode.episode) }}
            <template v-if="!compact"> · {{ airDate(episode.date) }}</template>
            <template v-if="episode === next"> · NEXT</template>
          </span>
          <span>{{ episode.title || `Episode ${episode.episode}` }}</span>
        </div>
        <button
          v-if="!compact && episode.aired && unwatched.indexOf(episode) > 0"
          type="button"
          class="chip"
          :aria-label="`Mark watched up to episode ${episode.episode}`"
          @click="upTo(episode)"
        >
          Up to here
        </button>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.episodes {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.episodes__bar {
  display: flex;
  justify-content: flex-end;
}

.chip {
  min-height: var(--control-h);
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  font-size: var(--text-sm);
  white-space: nowrap;
  cursor: pointer;
}

ol {
  margin: 0;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  list-style: none;
}

li {
  /* Long anime have hundreds of episodes. */
  content-visibility: auto;
  contain-intrinsic-size: auto 60px;
  display: flex;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-2) var(--space-3);
}

li + li {
  border-top: 1px solid var(--color-border-subtle);
}

.check {
  display: grid;
  flex: none;
  place-items: center;
  width: var(--tap-min);
  height: var(--tap-min);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  cursor: pointer;
}

.check[aria-pressed='true'] {
  border-color: var(--color-action);
  background: var(--color-action);
  color: var(--color-on-action);
}

.check:disabled {
  border-style: dashed;
  cursor: default;
}

.episodes__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.episodes__next {
  background: var(--color-highlight);
}

.episodes__next .episodes__meta {
  color: var(--color-on-highlight);
}

.episodes__summary {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-muted);
}

.episodes--compact li {
  padding-block: var(--space-1);
}

.episodes--compact .check {
  width: 2rem;
  height: 2rem;
  border-radius: var(--radius-sm);
}

.episodes--compact .episodes__text {
  flex-direction: row;
  gap: var(--space-3);
  align-items: baseline;
}

.episodes--compact .episodes__meta {
  flex: none;
  min-width: 4rem;
}

.episodes__meta {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
</style>
