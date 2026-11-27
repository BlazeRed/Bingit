<script setup lang="ts">
import { ChevronDown, ExternalLink, Plus } from '@lucide/vue'
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'

import EpisodeList from './EpisodeList.vue'
import ErrorNote from './ErrorNote.vue'
import LibraryStatusSheet from './LibraryStatusSheet.vue'
import { fanartUrl } from '@/api/images'
import { BUCKETS } from '@/library/browse'
import { simklPageUrl, type LibraryItem } from '@/library/item'
import { routeType } from '@/title/model'
import { useTitleActions } from '@/title/useTitleActions'
import { useTitleDetail } from '@/title/useTitleDetail'

// The parent keys this panel by title.
const props = defineProps<{ item: LibraryItem }>()
const { type, id } = props.item

const { detail, seasons, error, warnings, load } = useTitleDetail(type, id, {
  withPeople: false,
})
const { item: saved, isMovie, watched, act } = useTitleActions(type, id, detail, seasons)

const isStatusOpen = ref(false)
const statusLabel = computed(
  () => Object.values(BUCKETS).find((b) => b.status === saved.value?.status)?.label,
)

const facts = computed(() => {
  const { year } = props.item
  const { genres, runtime } = detail.value ?? {}
  return [year, genres?.[0], runtime && `${runtime} min`].filter(Boolean).join(' · ')
})
</script>

<template>
  <aside class="panel" aria-label="Details">
    <img
      v-if="detail?.fanart"
      class="panel__art"
      :src="fanartUrl(detail.fanart)"
      alt=""
      width="960"
      height="540"
    />
    <div class="panel__body">
      <div>
        <h2>
          <RouterLink :to="{ name: 'title', params: { type: routeType(type), id } }">
            {{ item.title }}
          </RouterLink>
        </h2>
        <p class="muted mono">{{ facts }}</p>
      </div>
      <ErrorNote v-if="error" :message="error" @retry="load" />
      <p v-else-if="!detail" class="muted" role="status">Loading…</p>

      <template v-else>
        <div class="panel__actions">
          <button
            v-if="saved"
            type="button"
            class="status-badge"
            aria-haspopup="dialog"
            :aria-label="`Status: ${statusLabel}. Change`"
            @click="isStatusOpen = true"
          >
            {{ statusLabel }}<ChevronDown :size="16" aria-hidden="true" />
          </button>
          <button
            v-else
            type="button"
            class="button"
            @click="act({ kind: 'status', to: 'plantowatch' })"
          >
            <Plus :size="16" aria-hidden="true" /> Add to Watchlist
          </button>
          <LibraryStatusSheet
            v-if="saved"
            v-model:open="isStatusOpen"
            :type="isMovie ? 'movies' : type"
            :status="saved.status"
            :title="saved.title"
            @change="act"
          />
          <span v-if="saved?.rating" class="panel__rating mono"> {{ saved.rating }}/10 </span>
          <button
            v-if="isMovie && saved?.status !== 'completed'"
            type="button"
            class="button"
            @click="act({ kind: 'watch' })"
          >
            Mark watched
          </button>
          <a
            class="panel__simkl action-link"
            :href="simklPageUrl(item)"
            target="_blank"
            rel="noopener"
          >
            <ExternalLink :size="16" aria-hidden="true" />View on Simkl
          </a>
        </div>
        <p v-for="warning in warnings" :key="warning" class="muted">{{ warning }}</p>
        <EpisodeList
          v-if="!isMovie && seasons.length"
          compact
          :seasons="seasons"
          :watched="watched"
          @watch="(episodes) => act({ kind: 'watch', episodes })"
          @unwatch="(episodes) => act({ kind: 'unwatch', episodes })"
        />
      </template>
    </div>
  </aside>
</template>

<style scoped>
.panel {
  position: sticky;
  top: 0;
  flex: none;
  width: var(--panel-w);
  height: 100dvh;
  overflow-y: auto;
  border-left: 1px solid var(--color-border);
  background: var(--color-surface);
}

.panel__art {
  width: 100%;
  height: 9.5rem;
  object-fit: cover;
}

.panel__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5);
}

h2 {
  font-size: var(--text-lg);
}

.panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
}

h2 a {
  color: var(--color-text);
  text-decoration: none;
}

.panel__rating {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-highlight);
  color: var(--color-on-highlight);
  font-size: var(--text-sm);
}

.panel__simkl {
  margin-left: auto;
  font-size: var(--text-sm);
}
</style>
