import { readonly, ref, shallowRef, watch } from 'vue'

import { SignedOutError } from '@/auth/session'
import { messageOf } from '@/lib/errors'
import { useAuthStore } from '@/stores/auth'

/**
 * Runs `load` whenever `source` changes. A late answer never replaces a newer one.
 * `keepPrevious` leaves the old data in place until the new data arrives: use it
 * only when nothing on screen mixes that data with the new source.
 */
export function useAsync<S, T>(
  source: () => S,
  load: (value: S) => Promise<T>,
  { keepPrevious = false } = {},
) {
  const data = shallowRef<T>()
  const error = ref('')
  const isLoading = ref(false)
  const auth = useAuthStore()
  let latest = 0
  const attempt = ref(0)

  watch(
    [source, attempt],
    async ([value]) => {
      const run = ++latest
      isLoading.value = true
      error.value = ''
      if (!keepPrevious) data.value = undefined
      try {
        const result = await load(value)
        if (run === latest) data.value = result
      } catch (cause) {
        if (cause instanceof SignedOutError) auth.expire(cause.message)
        else if (run === latest) {
          // Old data must not pass for the new selection.
          data.value = undefined
          error.value = messageOf(cause)
        }
      } finally {
        if (run === latest) isLoading.value = false
      }
    },
    { immediate: true },
  )

  const retry = () => void attempt.value++

  return { data, error: readonly(error), isLoading: readonly(isLoading), retry }
}
