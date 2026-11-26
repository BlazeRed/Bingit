<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'

import type { Profile } from '@/api/people'

const PAGE = 40

defineProps<{ profile?: Profile; error: string; source: string; sourceUrl: string }>()
const shown = ref(PAGE)
</script>

<template>
  <main class="page">
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-else-if="!profile" class="muted" role="status">Loading…</p>

    <template v-else>
      <header>
        <img v-if="profile.image" :src="profile.image" alt="" width="96" height="144" />
        <h1>{{ profile.name }}</h1>
      </header>
      <details v-if="profile.about">
        <summary>About</summary>
        <p>{{ profile.about }}</p>
      </details>

      <h2>Roles</h2>
      <ul class="card-list">
        <li v-for="credit in profile.credits.slice(0, shown)" :key="credit.key">
          <span class="year mono">{{ credit.year ?? '—' }}</span>
          <span>
            <RouterLink :to="{ name: 'find', params: { source: credit.source, id: credit.id } }">
              {{ credit.title }}
            </RouterLink>
            <span v-if="credit.role" class="muted"> · {{ credit.role }}</span>
          </span>
        </li>
      </ul>
      <button
        v-if="shown < profile.credits.length"
        type="button"
        class="field"
        @click="shown += PAGE"
      >
        Show more
      </button>
      <p class="muted">
        Data from <a :href="sourceUrl" target="_blank" rel="noopener">{{ source }}</a>
      </p>
    </template>
  </main>
</template>

<style scoped>
header {
  display: flex;
  gap: var(--space-4);
  align-items: flex-end;
}

img {
  width: 6rem;
  height: auto;
  border-radius: var(--radius-lg);
}

summary {
  min-height: var(--tap-min);
  cursor: pointer;
}

details p {
  white-space: pre-line;
}

li {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
}

li + li {
  border-top: 1px solid var(--color-border-subtle);
}

.year {
  flex: none;
  width: 3rem;
  color: var(--color-text-muted);
}
</style>
