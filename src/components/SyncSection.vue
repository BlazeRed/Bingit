<script setup lang="ts">
import { RefreshCw, Trash2 } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'

import { nextReset, readQuota } from '@/api/quota'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
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

const isConfirming = ref(false)
</script>

<template>
  <section>
    <h2>Sync</h2>
    <div class="card-list">
      <div class="row">
        <p class="row__text">
          <strong>
            {{ library.checkedAt ? `Synced ${timeAgo(library.checkedAt)}` : 'Not synced yet' }}
          </strong>
          <span class="muted">Library, history and ratings</span>
        </p>
        <button
          type="button"
          class="action-link"
          :disabled="library.isSyncing"
          @click="library.sync(true)"
        >
          <RefreshCw :size="16" aria-hidden="true" />{{
            library.isSyncing ? 'Syncing…' : 'Sync now'
          }}
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

      <button type="button" class="row row--button" @click="isConfirming = true">
        <span class="row__text">
          <strong>Clear saved data on this device</strong>
          <span class="muted">You stay signed in. {{ storage }}</span>
        </span>
        <Trash2 :size="18" aria-hidden="true" />
      </button>
    </div>
    <ConfirmDialog
      v-model:open="isConfirming"
      title="Clear saved data?"
      description="Bingit deletes the saved library and cache on this device, then imports again from Simkl."
      action="Clear"
      @confirm="library.reimport()"
    />
  </section>
</template>

<style scoped>
.row .row__line {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}

progress {
  width: 100%;
  height: 6px;
  overflow: hidden;
  border: 0;
  border-radius: var(--radius-full);
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
