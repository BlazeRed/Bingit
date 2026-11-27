<script setup lang="ts">
import { RouterLink } from 'vue-router'

import { posterUrl } from '@/api/images'
import { routeType } from '@/title/model'

export interface PosterCard {
  id: number
  type: string
  title: string
  year?: number | null
  poster?: string | null
  tag?: string
}

defineProps<{ title: string; cards: PosterCard[] }>()
</script>

<template>
  <section>
    <h2>{{ title }}</h2>
    <ul>
      <li v-for="card in cards" :key="card.id">
        <RouterLink :to="{ name: 'title', params: { type: routeType(card.type), id: card.id } }">
          <img
            v-if="card.poster"
            class="art"
            :src="posterUrl(card.poster, '_ca')"
            alt=""
            width="190"
            height="279"
            loading="lazy"
          />
          <span v-else class="art" />
          <span v-if="card.tag" class="tag">{{ card.tag }}</span>
          <span class="name">{{ card.title }}</span>
          <span class="muted mono">{{ card.year }}</span>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
h2 {
  margin-bottom: var(--space-3);
  font-size: var(--text-md);
}

ul {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(6.5rem, 1fr));
  gap: var(--space-4) var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

a {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  color: var(--color-text);
  text-decoration: none;
}

.art {
  width: 100%;
  height: auto;
  aspect-ratio: 2 / 3;
  border-radius: var(--radius-md);
  object-fit: cover;
  background: var(--color-surface-sunken);
}

.tag {
  align-self: flex-start;
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--color-wash);
  color: var(--color-on-wash);
  font-size: var(--text-2xs);
  font-weight: var(--weight-semibold);
}

.name {
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  line-height: var(--leading-snug);
}
</style>
