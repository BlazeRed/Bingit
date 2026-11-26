<script setup lang="ts">
import type { Person } from '@/api/catalog'

defineProps<{ title: string; people: Person[] }>()
</script>

<template>
  <section>
    <h2>{{ title }}</h2>
    <ul>
      <li v-for="person in people" :key="person.key">
        <img v-if="person.image" :src="person.image" alt="" width="56" height="56" loading="lazy" />
        <span v-else class="placeholder" />
        <span>{{ person.name }}</span>
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
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(5.5rem, 1fr));
  gap: var(--space-4) var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

li {
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

.role {
  color: var(--color-text-muted);
}
</style>
