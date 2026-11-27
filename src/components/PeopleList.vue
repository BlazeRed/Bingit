<script setup lang="ts">
import { RouterLink } from 'vue-router'

import type { Person } from '@/api/catalog'

defineProps<{ title: string; people: Person[]; profile: 'person' | 'staff' }>()
</script>

<template>
  <section>
    <h2>{{ title }}</h2>
    <ul>
      <li v-for="person in people" :key="person.key">
        <img v-if="person.image" :src="person.image" alt="" width="56" height="56" loading="lazy" />
        <span v-else class="placeholder" />
        <RouterLink
          v-if="person.profileId"
          :to="{ name: profile, params: { id: person.profileId } }"
        >
          {{ person.name }}
        </RouterLink>
        <span v-else>{{ person.name }}</span>
        <span class="role">{{ person.role }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
h2 {
  margin-bottom: var(--space-3);
  font-size: var(--text-md);
}

/* Reaches the screen edges, so the row visibly scrolls. */
ul {
  display: flex;
  gap: var(--space-3);
  margin: 0 calc(-1 * var(--space-5));
  padding: 0 var(--space-5) var(--space-2);
  overflow-x: auto;
  list-style: none;
}

li {
  flex: none;
  width: 5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-sm);
  line-height: var(--leading-snug);
  text-align: center;
}

img,
.placeholder {
  width: 72px;
  height: 72px;
  border-radius: var(--radius-full);
  object-fit: cover;
  background: var(--color-surface-sunken);
}

li > a,
li > img + span,
li > .placeholder + span {
  font-weight: var(--weight-semibold);
}

a {
  color: var(--color-text);
  text-decoration: none;
}

li > .role {
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  font-weight: var(--weight-regular);
}
</style>
