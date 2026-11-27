import { describe, expect, it, vi } from 'vitest'

import { listenForInstallPrompt, useInstall } from '../install'

describe('install', () => {
  it('keeps the browser prompt and uses it once', async () => {
    listenForInstallPrompt()
    const prompt = vi.fn<() => Promise<void>>(async () => {})
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt,
    })
    window.dispatchEvent(event)
    const { canPrompt, install } = useInstall()

    expect(event.defaultPrevented).toBe(true)
    expect(canPrompt()).toBe(true)
    await install()

    expect(prompt).toHaveBeenCalledOnce()
    expect(canPrompt()).toBe(false)
  })
})
