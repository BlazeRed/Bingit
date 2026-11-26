/** Installing the app: a browser prompt where it exists, instructions on iOS. */
import { readonly, ref, shallowRef } from 'vue'

/** Chromium only; not in the standard DOM types. */
interface InstallPromptEvent extends Event {
  prompt(): Promise<unknown>
}

const promptEvent = shallowRef<InstallPromptEvent>()
const isInstalled = ref(false)

export function listenForInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Offer it from the Me page instead of the browser's own banner.
    event.preventDefault()
    promptEvent.value = event as InstallPromptEvent
  })
  window.addEventListener('appinstalled', () => {
    promptEvent.value = undefined
    isInstalled.value = true
  })
}

/** iPadOS presents itself as a Mac, but has a touch screen. */
export const isAppleMobile = (userAgent: string, touchPoints: number) =>
  /iphone|ipad|ipod/i.test(userAgent) || (/macintosh/i.test(userAgent) && touchPoints > 1)

export function useInstall() {
  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as { standalone?: boolean }).standalone === true

  async function install() {
    const event = promptEvent.value
    // A prompt event works once.
    promptEvent.value = undefined
    await event?.prompt()
  }

  return {
    canPrompt: () => promptEvent.value !== undefined,
    needsInstructions:
      !isStandalone && isAppleMobile(navigator.userAgent, navigator.maxTouchPoints),
    isInstalled: readonly(isInstalled),
    install,
  }
}
