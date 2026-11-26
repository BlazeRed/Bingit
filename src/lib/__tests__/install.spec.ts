import { describe, expect, it, vi } from 'vitest'

import { isAppleMobile, listenForInstallPrompt, useInstall } from '../install'

describe('install', () => {
  it('recognises iPhones and iPads, not desktop Macs', () => {
    expect(isAppleMobile('Mozilla/5.0 (iPhone; CPU iPhone OS 19_0)', 5)).toBe(true)
    expect(isAppleMobile('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 5)).toBe(true)
    expect(isAppleMobile('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 0)).toBe(false)
  })

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
