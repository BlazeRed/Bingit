<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import { posterUrl } from '@/api/images'
import { browse, TYPES } from '@/library/browse'
import { timeAgo } from '@/me/format'
import type { MediaType } from '@/library/item'
import { useLibraryStore } from '@/stores/library'
import { routeType } from '@/title/model'

const library = useLibraryStore()

const recent = computed(() =>
  (Object.keys(TYPES) as MediaType[])
    .flatMap((type) => browse(library.items, type, 'watchlist', '', 'added'))
    .sort((a, b) => (b.addedAt ?? '').localeCompare(a.addedAt ?? ''))
    .slice(0, 3),
)
</script>

<template>
  <section v-if="recent.length">
    <h2>Recently added to Watchlist</h2>
    <ul class="card-list">
      <li v-for="item in recent" :key="item.id">
        <img
          v-if="item.poster"
          :src="posterUrl(item.poster, '_cm')"
          alt=""
          width="30"
          height="45"
          loading="lazy"
        />
        <span>
          <RouterLink :to="{ name: 'title', params: { type: routeType(item.type), id: item.id } }">
            {{ item.title }}
          </RouterLink>
          <span class="muted">
            {{ TYPES[item.type] }}
            <template v-if="item.addedAt">
              · added {{ timeAgo(Date.parse(item.addedAt)) }}
            </template>
          </span>
        </span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

li {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-3);
}

li + li {
  border-top: 1px solid var(--color-border-subtle);
}

img {
  border-radius: var(--radius-sm);
}

li > span {
  display: flex;
  flex-direction: column;
}

a {
  color: var(--color-text);
  font-weight: var(--weight-semibold);
  text-decoration: none;
}
</style>
