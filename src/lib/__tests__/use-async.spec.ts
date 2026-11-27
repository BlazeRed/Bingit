import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { effectScope, nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import { useAsync } from '@/composables/useAsync'

vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({}) }))

describe('useAsync with keepPrevious', () => {
  it('keeps the old data while loading and drops it on failure', async () => {
    setActivePinia(createPinia())
    const source = ref('tv')
    let finishLoading = () => {}
    const scope = effectScope()
    const { data } = scope.run(() =>
      useAsync(
        () => source.value,
        async (value) => {
          if (value === 'broken') throw new Error('nope')
          if (value === 'anime') await new Promise<void>((resolve) => (finishLoading = resolve))
          return value
        },
        { keepPrevious: true },
      ),
    )!
    await flushPromises()

    source.value = 'anime'
    await nextTick()
    expect(data.value).toBe('tv')
    finishLoading()
    await flushPromises()
    expect(data.value).toBe('anime')

    source.value = 'broken'
    await flushPromises()
    expect(data.value).toBeUndefined()
    scope.stop()
  })
})
