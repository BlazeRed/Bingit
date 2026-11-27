<script setup lang="ts">
import ErrorNote from './ErrorNote.vue'
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Check, Compass, Plus } from '@lucide/vue'

import { getTrending, type Card } from '@/api/discover'
import { posterUrl } from '@/api/images'
import SegmentedControl from './SegmentedControl.vue'
import { useAsync } from '@/composables/useAsync'
import { TYPES } from '@/library/browse'
import type { MediaType } from '@/library/item'
import { simklPageUrl } from '@/library/item'
import { useLibraryStore } from '@/stores/library'
import { useQuickAddList } from '@/composables/useQuickAdd'
import { routeType } from '@/title/model'

const SHOWN = 12

/** Signed out: titles open on Simkl, and nothing can be added. */
const props = defineProps<{ isGuest?: boolean }>()

const library = useLibraryStore()
const quickAdd = useQuickAddList()
const type = ref<MediaType>('tv')
// Free file: no quota.
const {
  data: cards,
  error,
  retry,
} = useAsync(
  () => type.value,
  (value) => getTrending(value, 'week'),
  // No "Loading…" flash between tabs.
  { keepPrevious: true },
)

const linkTo = (card: Card) =>
  props.isGuest
    ? { is: 'a', attrs: { href: simklPageUrl(card), target: '_blank', rel: 'noopener' } }
    : {
        is: RouterLink,
        attrs: { to: { name: 'title', params: { type: routeType(card.type), id: card.id } } },
      }
</script>

<template>
  <section class="top" :class="{ 'top--guest': isGuest }">
    <div class="top__header">
      <h2>Most watched on Simkl this week</h2>
      <RouterLink v-if="!isGuest" class="action-link" :to="{ name: 'search' }">
        <Compass :size="16" aria-hidden="true" />Discover
      </RouterLink>
      <SegmentedControl v-model="type" :options="TYPES" label="Category" />
    </div>

    <ErrorNote v-if="error" :message="error" @retry="retry" />
    <p v-else-if="!cards" class="muted" role="status">Loading…</p>
    <!-- A new list starts scrolled to its first title. -->
    <ol v-else :key="cards[0]?.id">
      <li v-for="(card, index) in cards.slice(0, SHOWN)" :key="card.id">
        <div class="top__art">
          <component :is="linkTo(card).is" v-bind="linkTo(card).attrs">
            <img
              v-if="card.poster"
              :src="posterUrl(card.poster, '_ca')"
              :alt="card.title"
              width="190"
              height="279"
              loading="lazy"
            />
            <span v-else class="visually-hidden">{{ card.title }}</span>
          </component>
          <span class="top__rank mono">#{{ index + 1 }}</span>
          <!-- Until the library is loaded, "Add" could overwrite a saved status. -->
          <template v-if="library.isImported">
            <span
              v-if="library.byId[card.id] && !quickAdd.isJustAdded(card)"
              class="top__badge top__badge--saved"
            >
              <Check :size="20" aria-hidden="true" />
              <span class="visually-hidden">In your library</span>
            </span>
            <button
              v-else
              type="button"
              class="top__badge"
              :class="{ 'top__badge--saved': quickAdd.isJustAdded(card) }"
              :aria-label="
                quickAdd.isJustAdded(card)
                  ? `Remove ${card.title} from your watchlist`
                  : `Add ${card.title} to your watchlist`
              "
              @click="quickAdd.toggle(card)"
            >
              <component
                :is="quickAdd.isJustAdded(card) ? Check : Plus"
                :size="20"
                aria-hidden="true"
              />
            </button>
          </template>
        </div>
        <span class="top__title" :title="card.title">{{ card.title }}</span>
        <span class="muted mono">{{ card.year }}</span>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.top {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.top__header {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
}

.top__header h2 {
  flex: 1;
}

/* Full width on phones. */
.top__header .segmented {
  width: 100%;
}

ol {
  display: flex;
  gap: var(--space-3);
  margin: 0 calc(-1 * var(--space-5));
  padding: 0 var(--space-5) var(--space-2);
  overflow-x: auto;
  list-style: none;
}

li {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: var(--space-1);
  width: var(--poster-card-w);
}

.top__art {
  position: relative;
  aspect-ratio: 2 / 3;
  border-radius: var(--radius-md);
  background: var(--color-surface-sunken);
}

img {
  width: 100%;
  height: 100%;
  border-radius: var(--radius-md);
  object-fit: cover;
}

.top__art a {
  display: block;
  height: 100%;
}

.top__rank {
  position: absolute;
  top: var(--space-2);
  left: var(--space-2);
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
}

.top__badge {
  position: absolute;
  right: var(--space-2);
  bottom: var(--space-2);
  display: grid;
  place-items: center;
  width: var(--tap-min);
  height: var(--tap-min);
  border: 0;
  border-radius: var(--radius-full);
  background: var(--color-surface);
}

button.top__badge {
  cursor: pointer;
}

.top__badge--saved {
  background: var(--color-action);
  color: var(--color-on-action);
}

.top__title {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  /* Always two lines, so the section keeps its height on every tab. */
  min-height: 2lh;
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  line-height: var(--leading-snug);
}

/* On the landing page this is a preview, quieter than the sign-in above it. */
.top--guest {
  --poster-card-w: 6rem;
}

.top.top--guest h2 {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

/* Keeps the hero still while the posters load. */
.top--guest > p {
  min-height: 13rem;
}

@media (min-width: 64rem) {
  .top__header .segmented {
    width: auto;
    min-width: 15rem;
  }

  /* Wide screens: title, category, then the action at the far right. */
  .top__header a {
    order: 1;
  }

  .top--guest > p {
    min-height: 20rem;
  }

  ol {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    margin: 0;
    padding: 0;
    overflow: visible;
  }

  li {
    width: auto;
  }

  /* One row of six. */
  li:nth-child(n + 7) {
    display: none;
  }
}
</style>
