<script setup lang="ts">
import { ref, shallowRef } from 'vue'

import { SignedOutError } from '@/auth/session'
import { download, fetchBackup } from '@/backup/export'
import { parseBackup, restoreOps, toCsv } from '@/backup/format'
import { messageOf } from '@/lib/errors'
import { plural } from '@/me/format'
import { useAuthStore } from '@/stores/auth'
import { useLibraryStore } from '@/stores/library'

const MAX_BYTES = 50 * 1_048_576

const auth = useAuthStore()
const library = useLibraryStore()

const isExporting = ref(false)
const error = ref('')
const notice = ref('')
const picked = shallowRef<ReturnType<typeof parseBackup>>()

async function exportAs(format: 'json' | 'csv') {
  isExporting.value = true
  error.value = ''
  try {
    const backup = await fetchBackup()
    const name = `bingit-${backup.exportedAt.slice(0, 10)}.${format}`
    if (format === 'json') download(name, JSON.stringify(backup), 'application/json')
    else download(name, toCsv(backup), 'text/csv;charset=utf-8')
  } catch (cause) {
    if (cause instanceof SignedOutError) auth.expire(cause.message)
    else error.value = messageOf(cause)
  } finally {
    isExporting.value = false
  }
}

async function pick(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // Picking the same file again must fire `change` again.
  input.value = ''
  picked.value = undefined
  error.value = ''
  notice.value = ''
  if (!file) return
  try {
    if (file.size > MAX_BYTES) throw new Error('This file is too large.')
    picked.value = parseBackup(await file.text())
  } catch (cause) {
    error.value = messageOf(cause)
  }
}

async function restore() {
  const items = picked.value?.items ?? []
  picked.value = undefined
  await library.actAll(restoreOps(items, new Date()))
  const titles = plural(items.length, 'title')
  notice.value = `Restoring ${titles}. Bingit sends the changes to Simkl in the background.`
}

const episodeCount = () =>
  picked.value?.items.reduce((sum, item) => sum + item.episodes.length, 0) ?? 0
const ratingCount = () => picked.value?.items.filter((item) => item.rating).length ?? 0
</script>

<template>
  <section>
    <h2>Your data</h2>
    <div class="card">
      <p class="muted">
        An export reads your whole library from Simkl (3 requests). JSON can be restored here; CSV
        is for spreadsheets.
      </p>
      <div class="buttons">
        <button type="button" class="field" :disabled="isExporting" @click="exportAs('json')">
          Export JSON
        </button>
        <button type="button" class="field" :disabled="isExporting" @click="exportAs('csv')">
          Export CSV
        </button>
      </div>
      <p v-if="isExporting" class="muted" role="status">Preparing your export…</p>

      <label>
        <strong>Restore from a Bingit JSON file</strong>
        <input type="file" accept=".json,application/json" @change="pick" />
      </label>

      <div v-if="picked" class="preview">
        <p>
          {{ plural(picked.items.length, 'title') }},
          {{ plural(episodeCount(), 'watched episode') }}, {{ plural(ratingCount(), 'rating') }}.
          <template v-if="picked.skipped">
            Skipped, cannot be read: {{ plural(picked.skipped, 'row') }}.
          </template>
        </p>
        <p class="muted">
          Restoring adds history and ratings and sets each title's status. It removes nothing.
        </p>
        <div class="buttons">
          <button type="button" class="button" :disabled="!picked.items.length" @click="restore">
            Restore to Simkl
          </button>
          <button type="button" class="field" @click="picked = undefined">Cancel</button>
        </div>
      </div>

      <p v-if="notice" class="muted" role="status">{{ notice }}</p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
    </div>
  </section>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
}

.buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

button {
  cursor: pointer;
}

label {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

strong {
  font-weight: var(--weight-medium);
}

.preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
</style>
