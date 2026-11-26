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

ul {
  display: flex;
  gap: var(--space-4);
  margin: 0;
  padding: 0 0 var(--space-2);
  overflow-x: auto;
  list-style: none;
}

li {
  flex: none;
  width: 4.5rem;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  font-size: var(--text-xs);
}

img,
.placeholder {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-full);
  object-fit: cover;
  background: var(--color-surface-sunken);
}

a {
  color: var(--color-text);
  font-weight: var(--weight-medium);
}

.role {
  color: var(--color-text-muted);
}
</style>
