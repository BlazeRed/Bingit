<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import type { Card } from '@/api/discover'
import { posterUrl } from '@/api/images'
import { BUCKETS, TYPES } from '@/library/browse'
import { useLibraryStore } from '@/stores/library'
import { useQuickAdd } from '@/composables/useQuickAdd'
import { routeType } from '@/title/model'

const props = defineProps<{ card: Card; note?: string }>()
const library = useLibraryStore()
const { isJustAdded, toggle } = useQuickAdd(() => props.card)

const saved = computed(() => library.byId[props.card.id])
const status = computed(
  () => Object.values(BUCKETS).find((b) => b.status === saved.value?.status)?.label,
)
const meta = computed(() => {
  const { type, animeType, year, episodes } = props.card
  const kind = type === 'anime' && animeType === 'movie' ? 'Anime movie' : TYPES[type]
  const length = type !== 'movies' && episodes ? `${episodes} eps` : ''
  return [kind, year, length].filter(Boolean).join(' · ')
})
</script>

<template>
  <li class="row">
    <img
      v-if="card.poster"
      class="row__poster"
      :src="posterUrl(card.poster, '_cm')"
      alt=""
      width="84"
      height="124"
      loading="lazy"
    />
    <span v-else class="row__poster" />

    <div class="row__body">
      <RouterLink
        class="row__title"
        :to="{ name: 'title', params: { type: routeType(card.type), id: card.id } }"
      >
        {{ card.title }}
      </RouterLink>
      <span class="muted">{{ meta }}</span>
      <span v-if="card.rating" class="row__rating mono">
        <span aria-hidden="true">★</span>
        <span class="visually-hidden">Simkl rating</span>
        {{ card.rating.toFixed(1) }}
      </span>
      <span v-if="note" class="muted mono">{{ note }}</span>
    </div>

    <!-- Until the library is loaded, "Add" could overwrite a saved status. -->
    <template v-if="library.isImported">
      <span v-if="saved && !isJustAdded" class="row__status">{{ status }}</span>
      <button
        v-else
        type="button"
        :class="isJustAdded ? 'row__status' : 'button row__add'"
        :aria-label="
          isJustAdded
            ? `Remove ${card.title} from your watchlist`
            : `Add ${card.title} to your watchlist`
        "
        @click="toggle"
      >
        {{ isJustAdded ? '✓ Added' : '+ Add' }}
      </button>
    </template>
  </li>
</template>

<style scoped>
.row {
  content-visibility: auto;
  contain-intrinsic-size: auto 90px;
  display: flex;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-3) var(--space-4);
}

.row + .row {
  border-top: 1px solid var(--color-border-subtle);
}

.row__poster {
  flex: none;
  width: var(--poster-list-w);
  height: auto;
  aspect-ratio: 2 / 3;
  object-fit: cover;
  border-radius: var(--radius-sm);
  background: var(--color-surface-sunken);
}

.row__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.row__title {
  color: var(--color-text);
  font-weight: var(--weight-semibold);
  line-height: var(--leading-snug);
  text-decoration: none;
}

.row__rating {
  align-self: flex-start;
  padding: 0 var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--color-highlight);
  color: var(--color-on-highlight);
  font-size: var(--text-xs);
}

.row__add {
  padding: 0 var(--space-4);
}

.row__status {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-wash);
  color: var(--color-on-wash);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
}

button {
  border: 0;
  cursor: pointer;
  white-space: nowrap;
}
</style>
