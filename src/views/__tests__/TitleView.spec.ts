import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'

import { fakeLocks } from '@/auth/__tests__/fake-locks'
import TitleView from '../TitleView.vue'

const db = new Map<string, unknown>()
vi.mock('idb-keyval', () => ({
  get: async (key: string) => db.get(key),
  set: async (key: string, value: unknown) => void db.set(key, value),
}))
vi.mock('@/api/simkl', () => ({}))
vi.mock('@/api/catalog', () => ({
  getDetail: async () => ({ title: 'Northbound', ids: { simkl: 7 } }),
  getEpisodes: async (_type: string, id: number) => [
    { season: 1, episode: 1, type: 'episode', aired: true },
    { season: 1, episode: 2, type: 'episode', aired: true },
    { season: 1, episode: 3, type: 'episode', aired: false },
    ...(id === 8 ? [{ season: 2, episode: 1, type: 'episode', aired: true }] : []),
  ],
}))

describe('TitleView', () => {
  it('queues a mark and shows it at once', async () => {
    vi.stubGlobal('navigator', { locks: fakeLocks() })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/:type/:id', name: 'title', component: TitleView }],
    })
    await router.push('/tv/7?tab=episodes')
    const wrapper = mount(TitleView, { global: { plugins: [router, createPinia()] } })
    await flushPromises()
    const checks = wrapper.findAll('.check')
    expect(checks[2]!.attributes('disabled')).toBeDefined()

    await checks[0]!.trigger('click')
    await flushPromises()

    expect(checks[0]!.attributes('aria-pressed')).toBe('true')
    expect(db.get('write-queue')).toMatchObject([{ kind: 'watch', episodes: { 1: [1] } }])
    expect(wrapper.text()).toContain('1/3 episodes')
    wrapper.unmount()
  })

  it('picks a TV season from the season row', async () => {
    vi.stubGlobal('navigator', { locks: fakeLocks() })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/:type/:id', name: 'title', component: TitleView }],
    })
    await router.push('/tv/8?tab=info')
    const wrapper = mount(TitleView, { global: { plugins: [router, createPinia()] } })
    await flushPromises()
    const [, second] = wrapper.findAll('.season')

    await second!.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query.tab).toBe('episodes')
    expect(wrapper.findAll('.check')).toHaveLength(1)
    wrapper.unmount()
  })
})
