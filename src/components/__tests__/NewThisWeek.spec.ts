import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'

import NewThisWeek from '../NewThisWeek.vue'

const tomorrow = new Date(Date.now() + 86_400_000).toISOString()

vi.mock('idb-keyval', () => ({ get: async () => undefined }))
vi.mock('@/api/simkl', () => ({}))
vi.mock('@/api/discover', async (original) => ({
  ...(await original<typeof import('@/api/discover')>()),
  getCalendar: async (type: string) => ({
    calendar:
      type === 'tv' ? [{ simkl_id: 1, date: tomorrow, episode: { season: 1, episode: 4 } }] : [],
    metadata: { 1: { title: 'Northbound', ids: { simkl_id: 1 } } },
  }),
}))
vi.mock('@/stores/library', () => ({
  useLibraryStore: () => ({
    isImported: true,
    items: [{ id: 1, status: 'watching' }],
    byId: {},
    added: [],
  }),
}))

describe('NewThisWeek', () => {
  it('lists the next episode and opens the calendar sheet from it', async () => {
    const wrapper = mount(NewThisWeek, {
      attachTo: document.body,
      global: { plugins: [createPinia()], stubs: { RouterLink: RouterLinkStub } },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('S01E04 · Tomorrow')
    expect(document.querySelector('[role="dialog"]')).toBeNull()

    await wrapper.get('li button').trigger('click')
    await flushPromises()

    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Northbound')
    wrapper.unmount()
  })
})
