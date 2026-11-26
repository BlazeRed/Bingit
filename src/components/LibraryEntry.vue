<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Check } from '@lucide/vue'

import { posterUrl } from '@/api/images'
import { parseEpisodeCode, type Episodes } from '@/library/episodes'
import type { LibraryItem } from '@/library/item'
import { routeType } from '@/title/model'

const props = defineProps<{
  item: LibraryItem
  layout: 'list' | 'grid'
  selected?: boolean
}>()
const emit = defineEmits<{ watch: [item: LibraryItem, episodes: Episodes] }>()

const next = computed(() => {
  const { status, nextToWatch } = props.item
  if (status !== 'watching' || !nextToWatch) return null
  const episodes = parseEpisodeCode(nextToWatch)
  return episodes && { code: nextToWatch, short: nextToWatch.replace(/^S\d+/, ''), episodes }
})

const poster = computed(
  () => props.item.poster && posterUrl(props.item.poster, props.layout === 'grid' ? '_ca' : '_cm'),
)
const hasProgress = computed(() => props.item.status === 'watching' || props.item.status === 'hold')
const percent = computed(() => {
  const { watchedCount, totalCount } = props.item
  return totalCount ? Math.min(100, (watchedCount / totalCount) * 100) : 0
})
const meta = computed(() => {
  const { year, runtime, type, totalCount } = props.item
  const length = type === 'movies' ? runtime && `${runtime} min` : totalCount && `${totalCount} eps`
  return [year, length].filter(Boolean).join(' · ')
})
</script>

<template>
  <li
    class="entry"
    :class="[`entry--${layout}`, { 'entry--selected': selected }]"
    :data-id="item.id"
  >
    <RouterLink
      class="entry__link"
      :to="{ name: 'title', params: { type: routeType(item.type), id: item.id } }"
      :aria-current="selected ? 'true' : undefined"
    >
      <img
        v-if="poster"
        class="entry__poster"
        :src="poster"
        alt=""
        width="84"
        height="124"
        loading="lazy"
      />
      <span v-else class="entry__poster" />

      <span class="entry__body">
        <span class="entry__title">{{ item.title }}</span>
        <span class="entry__meta mono" :class="{ 'entry__facts--progress': hasProgress }">
          {{ meta }}
        </span>
      </span>

      <span v-if="hasProgress" class="entry__progress">
        <span class="entry__meta mono">
          <span v-if="item.nextToWatch" class="entry__narrow"> Next {{ item.nextToWatch }} · </span>
          {{ item.watchedCount }}/{{ item.totalCount }}
        </span>
        <span class="entry__track"><span :style="{ width: `${percent}%` }" /></span>
      </span>

      <span v-if="hasProgress && item.nextToWatch" class="entry__next mono">
        {{ item.nextToWatch }}
      </span>

      <span
        v-if="item.rating"
        class="entry__rating mono"
        :class="{ 'entry__rating--progress': hasProgress }"
      >
        <span class="visually-hidden">Your rating:</span>
        {{ item.rating }}/10
      </span>
    </RouterLink>
    <button
      v-if="next"
      type="button"
      class="entry__mark"
      :aria-label="`Mark ${next.code} of ${item.title} watched`"
      @click="emit('watch', item, next.episodes)"
    >
      <Check :size="16" aria-hidden="true" />{{ next.short }}
    </button>
  </li>
</template>

<style scoped>
.entry {
  /* Native alternative to a virtualized list. */
  content-visibility: auto;
  contain-intrinsic-size: auto 90px;
}

.entry__mark {
  display: inline-flex;
  flex: none;
  gap: var(--space-1);
  justify-content: center;
  align-items: center;
  min-height: var(--control-h);
  padding: 0 var(--space-3);
  border: 0;
  border-radius: var(--radius-md);
  background: var(--color-action);
  color: var(--color-on-action);
  font-weight: var(--weight-semibold);
  cursor: pointer;
}

.entry__link {
  display: grid;
  flex: 1;
  grid-template-columns: auto minmax(0, 1fr) auto;
  grid-template-areas:
    'poster body rating'
    'poster progress rating';
  column-gap: var(--space-3);
  align-content: center;
  align-items: center;
  min-width: 0;
  color: var(--color-text);
  text-decoration: none;
}

.entry__poster {
  grid-area: poster;
  width: var(--poster-list-w);
  height: auto;
  aspect-ratio: 2 / 3;
  object-fit: cover;
  border-radius: var(--radius-sm);
  background: var(--color-surface-sunken);
}

.entry__body {
  display: flex;
  grid-area: body;
  flex-direction: column;
  min-width: 0;
}

.entry__title {
  font-weight: var(--weight-semibold);
  line-height: var(--leading-snug);
}

.entry__meta {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.entry__progress {
  display: flex;
  grid-area: progress;
  flex-direction: column;
}

.entry__next {
  display: none;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

/* Narrow rows in progress show next episode and count only. */
.entry--list .entry__facts--progress,
.entry--list .entry__rating--progress {
  display: none;
}

.entry__track {
  height: 3px;
  margin-top: var(--space-1);
  overflow: hidden;
  background: var(--color-track);
}

.entry__track span {
  display: block;
  height: 100%;
  background: var(--color-progress);
}

.entry__rating {
  grid-area: rating;
  justify-self: start;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--color-highlight);
  color: var(--color-on-highlight);
  font-size: var(--text-sm);
}

.entry--list {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-3) var(--space-4);
}

.entry--list + .entry--list {
  border-top: 1px solid var(--color-border-subtle);
}

.entry--selected {
  background: var(--color-wash);
}

/* A table when the list is wide enough. */
@container (min-width: 38rem) {
  .entry--list .entry__link {
    grid-template-columns: var(--table-columns);
    grid-template-areas: none;
  }

  .entry--list .entry__link > * {
    grid-area: auto;
    grid-row: 1;
  }

  .entry--list .entry__link {
    /* Poster and title share the first column. */
    position: relative;
  }

  .entry--list .entry__poster {
    grid-column: 1;
    justify-self: start;
  }

  .entry--list .entry__body {
    grid-column: 1;
    padding-left: calc(var(--poster-list-w) + var(--space-3));
  }

  .entry--list .entry__progress {
    grid-column: 2;
  }

  .entry--list .entry__next {
    display: block;
    grid-column: 3;
  }

  .entry--list .entry__rating {
    grid-column: 4;
  }

  .entry--list .entry__narrow {
    display: none;
  }

  .entry--list .entry__facts--progress,
  .entry--list .entry__rating--progress {
    display: revert;
  }

  .entry--list .entry__mark {
    width: var(--table-action);
  }

  .entry--list:not(:has(.entry__mark)) {
    padding-right: calc(var(--space-4) + var(--space-3) + var(--table-action));
  }
}

.entry--grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  contain-intrinsic-size: auto 240px;
}

.entry--grid .entry__link {
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-1);
}

.entry--grid .entry__poster {
  width: 100%;
}

.entry--grid .entry__rating {
  align-self: flex-start;
}
</style>
