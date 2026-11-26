<script setup lang="ts">
import { RouterLink } from 'vue-router'

import EpisodeList from './EpisodeList.vue'
import ErrorNote from './ErrorNote.vue'
import StatusSelect from './StatusSelect.vue'
import { fanartUrl } from '@/api/images'
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
      <h2>{{ item.title }}</h2>
      <ErrorNote v-if="error" :message="error" @retry="load" />
      <p v-else-if="!detail" class="muted" role="status">Loading…</p>

      <template v-else>
        <div class="panel__actions">
          <StatusSelect :type="isMovie ? 'movies' : type" :status="saved?.status" @change="act" />
          <span v-if="saved?.rating" class="mono">★ {{ saved.rating }}/10</span>
          <button
            v-if="isMovie && saved?.status !== 'completed'"
            type="button"
            class="button"
            @click="act({ kind: 'watch' })"
          >
            Mark watched
          </button>
        </div>
        <p class="panel__links">
          <RouterLink :to="{ name: 'title', params: { type: routeType(type), id } }">
            Full page
          </RouterLink>
          <a :href="simklPageUrl(item)" target="_blank" rel="noopener">View on Simkl →</a>
        </p>
        <p v-for="warning in warnings" :key="warning" class="muted">{{ warning }}</p>
        <EpisodeList
          v-if="!isMovie && seasons.length"
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

.panel__actions,
.panel__links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
}
</style>
