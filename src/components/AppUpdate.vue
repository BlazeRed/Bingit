<script setup lang="ts">
import { useRegisterSW } from 'virtual:pwa-register/vue'

const { needRefresh, updateServiceWorker } = useRegisterSW({
  onRegisteredSW(_url, registration) {
    // An installed app can stay open for days: look for a new version on return.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        void registration?.update().catch(() => undefined)
      }
    })
  },
})
</script>

<template>
  <!-- The user chooses when to reload, so nothing changes under their hands. -->
  <div role="status">
    <p v-if="needRefresh" class="update">
      <span>A new version of Bingit is ready.</span>
      <button type="button" @click="updateServiceWorker()">Reload</button>
      <button type="button" @click="needRefresh = false">Later</button>
    </p>
  </div>
</template>

<style scoped>
.update {
  position: fixed;
  top: var(--space-3);
  right: var(--space-4);
  left: var(--space-4);
  z-index: 6;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
  max-width: 28rem;
  margin-inline: auto;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--color-text);
  color: var(--color-bg);
  font-size: var(--text-sm);
}

span {
  flex: 1 1 12rem;
}

button {
  min-height: var(--tap-min);
  padding: 0 var(--space-2);
  border: 0;
  background: transparent;
  color: inherit;
  font-weight: var(--weight-semibold);
  cursor: pointer;
}
</style>
