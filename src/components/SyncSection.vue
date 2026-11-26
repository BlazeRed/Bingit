<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { nextReset, readQuota } from '@/api/quota'
import { timeAgo } from '@/me/format'
import { useAuthStore } from '@/stores/auth'
import { useLibraryStore } from '@/stores/library'

const auth = useAuthStore()
const library = useLibraryStore()

// Read again after each sync: the numbers come from its responses.
const quota = computed(() => {
  void library.checkedAt
  void library.isSyncing
  return readQuota()
})
const used = computed(() => (quota.value ? quota.value.limit - quota.value.remaining : 0))
const resetTime = nextReset(Date.now()).toLocaleTimeString('en', { timeStyle: 'short' })
const plan = computed(() => {
  const type = auth.account?.type
  if (!type) return 'Resets'
  return `${type[0]!.toUpperCase()}${type.slice(1)} Simkl plan · resets`
})

const storage = ref('')
onMounted(async () => {
  const usage = (await navigator.storage?.estimate?.())?.usage
  if (usage) storage.value = `Uses ${(usage / 1_048_576).toFixed(1)} MB on this device.`
})

function clearData() {
  const question =
    'Delete the saved library and cache on this device, then import again from Simkl?'
  if (confirm(question)) void library.reimport()
}
</script>

<template>
  <section>
    <h2>Sync</h2>
    <div class="card">
      <div class="row">
        <p>
          <strong>
            {{ library.checkedAt ? `Synced ${timeAgo(library.checkedAt)}` : 'Not synced yet' }}
          </strong>
          <span class="muted">Library, history and ratings</span>
        </p>
        <button
          type="button"
          class="field"
          :disabled="library.isSyncing"
          @click="library.sync(true)"
        >
          {{ library.isSyncing ? 'Syncing…' : 'Sync now' }}
        </button>
      </div>
      <p v-if="library.pending.length" class="row muted">
        {{ library.pending.length }} changes waiting to be sent.
      </p>
      <p v-if="library.error" class="row error" role="alert">{{ library.error }}</p>

      <div class="row row--stack">
        <p class="row__line">
          <strong>Simkl requests today</strong>
          <span class="mono">{{ quota ? `${used} / ${quota.limit}` : 'not known yet' }}</span>
        </p>
        <progress v-if="quota" :value="used" :max="quota.limit">{{ used }}</progress>
        <span class="muted">{{ plan }} at {{ resetTime }}</span>
      </div>

      <button type="button" class="row row--button" @click="clearData">
        <strong>Clear saved data on this device</strong>
        <span class="muted">You stay signed in. {{ storage }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.row {
  display: flex;
  gap: var(--space-3);
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
}

.row + .row {
  border-top: 1px solid var(--color-border-subtle);
}

.row p {
  display: flex;
  flex-direction: column;
}

strong {
  font-weight: var(--weight-medium);
}

.row--stack {
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-2);
}

.row .row__line {
  flex-direction: row;
  justify-content: space-between;
}

.row--button {
  flex-direction: column;
  align-items: flex-start;
  gap: 0;
  width: 100%;
  border: 0;
  border-top: 1px solid var(--color-border-subtle);
  background: transparent;
  text-align: left;
  cursor: pointer;
}

progress {
  width: 100%;
  height: 3px;
  border: 0;
  background: var(--color-track);
  appearance: none;
}

progress::-webkit-progress-bar {
  background: var(--color-track);
}

progress::-webkit-progress-value {
  background: var(--color-progress);
}

progress::-moz-progress-bar {
  background: var(--color-progress);
}
</style>
