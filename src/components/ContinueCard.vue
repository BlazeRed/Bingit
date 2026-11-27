<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Check } from '@lucide/vue'

import { getDetail, getEpisodes } from '@/api/catalog'
import { fanartUrl, posterUrl } from '@/api/images'
import { useAsync } from '@/composables/useAsync'
import { locateEpisode } from '@/home/continue'
import { parseEpisodeCode } from '@/library/episodes'
import type { LibraryItem } from '@/library/item'
import { useLibraryStore } from '@/stores/library'
import { routeType } from '@/title/model'

const props = defineProps<{ item: LibraryItem }>()
const library = useLibraryStore()

// Both free and cached. A failure only hides the episode name or the artwork.
const id = () => props.item.id
const type = props.item.type === 'anime' ? 'anime' : 'tv'
const { data: episodes } = useAsync(id, (value) => getEpisodes(type, value))
const { data: detail } = useAsync(id, (value) => getDetail(type, value))

const code = computed(() => props.item.nextToWatch ?? '')
const current = computed(() => parseEpisodeCode(code.value))
const located = computed(() =>
  current.value && episodes.value
    ? locateEpisode(episodes.value, current.value, code.value, props.item.seasons ?? {})
    : undefined,
)
const percent = computed(() => {
  const { watchedCount, totalCount } = props.item
  return totalCount ? Math.min(100, (watchedCount / totalCount) * 100) : 0
})
const short = computed(() => code.value.replace(/^S\d+/, ''))

function mark() {
  if (!current.value) return
  void library.act({
    kind: 'watch',
    episodes: current.value,
    next: located.value?.next,
    item: props.item,
  })
}
</script>

<template>
  <li class="card">
    <picture v-if="item.poster" class="card__art">
      <!-- Wide screens show a landscape card. -->
      <source v-if="detail?.fanart" media="(min-width: 64rem)" :srcset="fanartUrl(detail.fanart)" />
      <img :src="posterUrl(item.poster, '_cm')" alt="" width="84" height="124" />
    </picture>
    <span v-else class="card__art" />

    <div class="card__text">
      <RouterLink
        class="card__title"
        :to="{ name: 'title', params: { type: routeType(item.type), id: item.id } }"
      >
        {{ item.title }}
      </RouterLink>
      <span class="card__episode muted">
        <span class="card__code mono">{{ code }}</span>
        <template v-if="located?.name"> · {{ located.name }}</template>
      </span>
      <span class="card__track"><span :style="{ width: `${percent}%` }" /></span>
    </div>

    <button
      v-if="current"
      type="button"
      class="button card__mark"
      :aria-label="`Mark ${code} of ${item.title} watched`"
      @click="mark"
    >
      <!-- At this size the tick is as tall as the digits: same top, same baseline. -->
      <Check :size="20" :stroke-width="2.25" aria-hidden="true" />
      <span class="card__long">Watched</span>
      {{ short }}
    </button>
  </li>
</template>

<style scoped>
.card {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-3) var(--space-4);
}

.card__art {
  flex: none;
  width: var(--poster-list-w);
  aspect-ratio: 2 / 3;
  overflow: hidden;
  border-radius: var(--radius-sm);
  background: var(--color-surface-sunken);
}

.card__art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.card__title {
  color: var(--color-text);
  font-weight: var(--weight-semibold);
  line-height: var(--leading-snug);
  text-decoration: none;
}

.card__code {
  font-size: var(--text-xs);
  color: var(--color-text);
}

.card__track {
  height: 3px;
  margin-top: var(--space-2);
  overflow: hidden;
  background: var(--color-track);
}

.card__track span {
  display: block;
  height: 100%;
  background: var(--color-progress);
}

.card__mark {
  display: inline-flex;
  flex: none;
  gap: var(--space-1);
  justify-content: center;
  align-items: center;
  min-height: var(--control-h);
  padding: 0 var(--space-3);
}

.card__long {
  display: none;
}

@media (min-width: 64rem) {
  .card {
    flex-direction: column;
    align-items: stretch;
    padding: 0;
    overflow: hidden;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    background: var(--color-surface);
  }

  .card__art {
    width: 100%;
    aspect-ratio: 16 / 9;
    border-radius: 0;
  }

  .card__text {
    padding: 0 var(--space-3);
  }

  /* One line: the cards of a row stay level. */
  .card__episode {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card__mark {
    margin: 0 var(--space-3) var(--space-3);
    padding: 0 var(--space-1);
    white-space: nowrap;
  }

  .card__mark svg {
    flex: none;
  }

  .card__long {
    display: inline;
  }
}
</style>
