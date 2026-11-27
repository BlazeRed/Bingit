<script setup lang="ts">
import { Download, Upload } from '@lucide/vue'
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
    <div class="card-list">
      <button
        type="button"
        class="row row--button"
        :disabled="isExporting"
        @click="exportAs('json')"
      >
        <span class="row__text">
          <strong>Export JSON</strong>
          <span class="muted">Your whole library, can be restored here</span>
        </span>
        <Download :size="18" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="row row--button"
        :disabled="isExporting"
        @click="exportAs('csv')"
      >
        <span class="row__text">
          <strong>Export CSV</strong>
          <span class="muted">For spreadsheets</span>
        </span>
        <Download :size="18" aria-hidden="true" />
      </button>
      <p v-if="isExporting" class="row muted" role="status">Preparing your export…</p>

      <label class="row row--button">
        <span class="row__text">
          <strong>Restore from a file</strong>
          <span class="muted">A Bingit JSON export</span>
        </span>
        <Upload :size="18" aria-hidden="true" />
        <input class="visually-hidden" type="file" accept=".json,application/json" @change="pick" />
      </label>

      <div v-if="picked" class="row row--stack">
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
          <button type="button" class="button button--secondary" @click="picked = undefined">
            Cancel
          </button>
          <button type="button" class="button" :disabled="!picked.items.length" @click="restore">
            Restore to Simkl
          </button>
        </div>
      </div>

      <p v-if="notice" class="row muted" role="status">{{ notice }}</p>
      <p v-if="error" class="row error" role="alert">{{ error }}</p>
    </div>
    <p class="muted">An export reads your library from Simkl (3 requests).</p>
  </section>
</template>

<style scoped>
.buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
}
</style>
