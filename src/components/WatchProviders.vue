<script setup lang="ts">
import { ExternalLink } from '@lucide/vue'
import type { WatchOptions } from '@/api/watch-providers'

defineProps<{ options: WatchOptions }>()
</script>

<template>
  <section>
    <h2>Where to watch</h2>
    <dl>
      <div v-for="group in options.groups" :key="group.label">
        <dt>{{ group.label }}</dt>
        <dd v-for="provider in group.providers" :key="provider.id">
          <img
            :src="provider.logo"
            :alt="provider.name"
            :title="provider.name"
            width="40"
            height="40"
            loading="lazy"
          />
        </dd>
      </div>
    </dl>
    <p>
      Data from <a href="https://www.justwatch.com" target="_blank" rel="noopener">JustWatch</a>
    </p>
    <a class="action-link" :href="options.link" target="_blank" rel="noopener">
      <ExternalLink :size="16" aria-hidden="true" />All options on TMDB
    </a>
  </section>
</template>

<style scoped>
h2 {
  margin-bottom: var(--space-3);
  font-size: var(--text-md);
}

dl {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: 0 0 var(--space-3);
}

dl > div {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
}

dt {
  width: 4rem;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

dd {
  margin: 0;
}

img {
  display: block;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-lg);
  background: var(--color-surface-sunken);
}

p {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
</style>
