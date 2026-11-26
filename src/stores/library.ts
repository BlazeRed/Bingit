import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'

import { SignedOutError } from '@/auth/session'
import type { LibraryItem } from '@/library/item'
import { readLibrary, syncLibrary, type LibraryRecord } from '@/sync/engine'
import { useAuthStore } from './auth'

export const useLibraryStore = defineStore('library', () => {
  const record = shallowRef<LibraryRecord>()
  const isSyncing = ref(false)
  const progress = ref('')
  const error = ref('')

  const items = computed<LibraryItem[]>(() => Object.values(record.value?.items ?? {}))
  const isImported = computed(() => record.value !== undefined)
  const checkedAt = computed(() => record.value?.checkedAt)

  // Other tabs share IndexedDB: reload when one of them saves.
  const channel =
    typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('bingit-library')
  if (channel) channel.onmessage = () => void load()

  async function load() {
    record.value = await readLibrary()
  }

  /** `force` skips the minimum interval between checks ("Sync now"). */
  async function sync(force = false) {
    if (isSyncing.value) return
    isSyncing.value = true
    error.value = ''
    try {
      // Show the saved library first, also when offline.
      await load()
      const before = record.value?.checkedAt
      const synced = await syncLibrary(force, (message) => (progress.value = message))
      record.value = synced
      if (synced.checkedAt !== before) channel?.postMessage('saved')
    } catch (cause) {
      if (cause instanceof SignedOutError) useAuthStore().expire(cause.message)
      else error.value = cause instanceof Error ? cause.message : 'Sync failed.'
    } finally {
      isSyncing.value = false
      progress.value = ''
    }
  }

  function reset() {
    record.value = undefined
    error.value = ''
  }

  return { items, isImported, checkedAt, isSyncing, progress, error, sync, reset }
})
