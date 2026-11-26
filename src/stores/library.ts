import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'

import { ApiError } from '@/api/http'
import { isQuotaLow } from '@/api/quota'
import { SignedOutError } from '@/auth/session'
import { clearCache } from '@/db/cache'
import type { LibraryItem } from '@/library/item'
import { applyOps, type Change, type Op } from '@/library/ops'
import { messageOf } from '@/lib/errors'
import { deleteLibrary, readLibrary, syncLibrary, type LibraryRecord } from '@/sync/engine'
import { enqueue, enqueueAll, flushQueue, readQueue, type Failure } from '@/sync/write-queue'
import { useAuthStore } from './auth'

/** Wait for more taps before sending, so they share one request. */
const SEND_DELAY_MS = 1500
const MAX_RETRY_MS = 60_000

export const useLibraryStore = defineStore('library', () => {
  const record = shallowRef<LibraryRecord>()
  const pending = shallowRef<Op[]>([])
  const failures = shallowRef<Failure[]>([])
  const isSyncing = ref(false)
  const progress = ref('')
  const error = ref('')

  const byId = computed(() => applyOps(record.value?.items ?? {}, pending.value))
  const items = computed<LibraryItem[]>(() => Object.values(byId.value))
  const pendingIds = computed(() => new Set(pending.value.map((op) => op.item.id)))
  const isImported = computed(() => record.value !== undefined)
  const checkedAt = computed(() => record.value?.checkedAt)

  // Other tabs share IndexedDB: reload when one of them saves.
  const channel =
    typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('bingit-library')
  if (channel) channel.onmessage = () => void load()

  async function load() {
    const [saved, queue] = await Promise.all([readLibrary(), readQueue()])
    // Together, so a sent change never disappears for a moment.
    record.value = saved
    pending.value = queue
  }

  async function reloadAndNotify() {
    await load()
    channel?.postMessage('saved')
  }

  function fail(cause: unknown) {
    if (cause instanceof SignedOutError) useAuthStore().expire(cause.message)
    else error.value = messageOf(cause)
  }

  let syncAgain = false

  /** `force` skips the minimum interval between checks ("Sync now"). */
  async function sync(force = false): Promise<void> {
    if (isSyncing.value) {
      syncAgain ||= force
      return
    }
    isSyncing.value = true
    error.value = ''
    try {
      // Show the saved library first, also when offline.
      await load()
      // Near the daily limit, keep the remaining requests for the user's actions.
      if (!force && record.value && isQuotaLow()) return
      const before = record.value?.checkedAt
      const synced = await syncLibrary(force, (message) => (progress.value = message))
      record.value = synced
      if (synced.checkedAt !== before) channel?.postMessage('saved')
    } catch (cause) {
      fail(cause)
    } finally {
      isSyncing.value = false
      progress.value = ''
    }
    if (syncAgain) {
      syncAgain = false
      await sync(true)
    }
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  let retries = 0

  function scheduleSend(delay = SEND_DELAY_MS) {
    clearTimeout(timer)
    timer = setTimeout(() => void send(), delay)
  }

  /**
   * Sends pending changes now, then fetches what Simkl made of them.
   * Safe to call at any time: the queue allows one sender at once.
   */
  async function send() {
    try {
      const result = await flushQueue(reloadAndNotify)
      retries = 0
      failures.value = [...failures.value, ...result.failures]
      if (result.sent) await sync(true)
    } catch (cause) {
      if (cause instanceof SignedOutError) fail(cause)
      else {
        const wait = cause instanceof ApiError ? cause.retryAfter : undefined
        scheduleSend(wait ? wait * 1000 : Math.min(MAX_RETRY_MS, 2000 * 2 ** retries++))
      }
    }
  }

  async function act(change: Change & Pick<Op, 'item' | 'baseline'>) {
    await enqueue({ ...change, id: crypto.randomUUID(), at: new Date().toISOString() })
    await reloadAndNotify()
    scheduleSend()
  }

  /** Queues many changes at once (restore from a backup). */
  async function actAll(ops: Op[]) {
    await enqueueAll(ops)
    await reloadAndNotify()
    scheduleSend(0)
  }

  /** Throws away the local copy and imports it again. Unsent changes stay. */
  async function reimport() {
    await deleteLibrary()
    await clearCache()
    record.value = undefined
    await sync(true)
  }

  async function retry(failure: Failure) {
    dismiss(failure)
    for (const op of failure.ops) await enqueue(op)
    await reloadAndNotify()
    scheduleSend(0)
  }

  function dismiss(failure: Failure) {
    failures.value = failures.value.filter((other) => other !== failure)
  }

  function reset() {
    clearTimeout(timer)
    record.value = undefined
    pending.value = []
    failures.value = []
    error.value = ''
  }

  return {
    items,
    byId,
    pending,
    pendingIds,
    failures,
    isImported,
    checkedAt,
    isSyncing,
    progress,
    error,
    sync,
    send,
    act,
    actAll,
    reimport,
    retry,
    dismiss,
    reset,
  }
})
