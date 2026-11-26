<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check } from '@lucide/vue'

import type { SimklEpisode } from '@/api/catalog'
import type { Episodes } from '@/library/episodes'
import type { Season } from '@/title/model'

const props = defineProps<{ seasons: Season[]; watched: Episodes }>()
const emit = defineEmits<{ watch: [episodes: Episodes]; unwatch: [episodes: Episodes] }>()

const isWatched = (season: number, episode: number) =>
  props.watched[season]?.includes(episode) ?? false

/** Open the season the user is in. */
const firstOpenSeason = props.seasons.find((season) =>
  season.episodes.some((e) => e.aired && !isWatched(season.number, e.episode)),
)
const selected = ref((firstOpenSeason ?? props.seasons.at(-1))?.number)

const season = computed(() => props.seasons.find((s) => s.number === selected.value))
const aired = computed(() => season.value?.episodes.filter((e) => e.aired) ?? [])
const unwatched = computed(() => aired.value.filter((e) => !isWatched(selected.value!, e.episode)))

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
  <section class="episodes" aria-label="Episodes">
    <div class="episodes__bar">
      <div v-if="seasons.length > 1" class="episodes__seasons">
        <button
          v-for="s in seasons"
          :key="s.number"
          type="button"
          class="chip"
          :aria-pressed="s.number === selected"
          @click="selected = s.number"
        >
          Season {{ s.number }}
        </button>
      </div>
      <h2 v-else>Episodes</h2>
      <button v-if="aired.length" type="button" class="chip" @click="toggleSeason">
        {{ unwatched.length ? 'Mark season watched' : 'Unmark season' }}
      </button>
    </div>

    <ol>
      <li v-for="episode in season?.episodes" :key="episode.episode">
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
            {{ code(episode.episode) }} · {{ airDate(episode.date) }}
          </span>
          <span>{{ episode.title || `Episode ${episode.episode}` }}</span>
        </div>
        <button
          v-if="episode.aired && unwatched.indexOf(episode) > 0"
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
  flex-wrap: wrap;
  gap: var(--space-2);
  justify-content: space-between;
  align-items: center;
}

.episodes__seasons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

h2 {
  font-size: var(--text-md);
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

.chip[aria-pressed='true'] {
  border-color: var(--color-text);
  background: var(--color-text);
  color: var(--color-bg);
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

.episodes__meta {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
</style>
