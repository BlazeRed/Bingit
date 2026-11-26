import { readonly, ref, shallowRef, watch, type WatchSource } from 'vue'

import { SignedOutError } from '@/auth/session'
import { useAuthStore } from '@/stores/auth'

/** Runs `load` whenever `source` changes. A late answer never replaces a newer one. */
export function useAsync<S, T>(source: WatchSource<S>, load: (value: S) => Promise<T>) {
  const data = shallowRef<T>()
  const error = ref('')
  const isLoading = ref(false)
  const auth = useAuthStore()
  let latest = 0

  watch(
    source,
    async (value) => {
      const run = ++latest
      isLoading.value = true
      error.value = ''
      data.value = undefined
      try {
        const result = await load(value)
        if (run === latest) data.value = result
      } catch (cause) {
        if (cause instanceof SignedOutError) auth.expire(cause.message)
        else if (run === latest) {
          error.value = cause instanceof Error ? cause.message : 'Could not load this page.'
        }
      } finally {
        if (run === latest) isLoading.value = false
      }
    },
    { immediate: true },
  )

  return { data, error: readonly(error), isLoading: readonly(isLoading) }
}
