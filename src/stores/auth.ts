import { ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { get, set } from 'idb-keyval'

import { getUserSettings } from '@/api/simkl'
import type { SimklUserSettings } from '@/api/simkl-types'
import * as session from '@/auth/session'
import { clearCache } from '@/db/cache'
import { messageOf } from '@/lib/errors'

const USER_KEY = 'user'

export const useAuthStore = defineStore('auth', () => {
  const status = ref<'loading' | 'signedOut' | 'signedIn'>('loading')
  const userName = ref('')
  const account = shallowRef<SimklUserSettings['account']>()
  const error = ref('')

  async function loadUser() {
    // Fetched once, then cached: it costs one request of the daily quota.
    let settings = await get<SimklUserSettings>(USER_KEY)
    if (!settings) {
      settings = await getUserSettings()
      await set(USER_KEY, settings)
    }
    userName.value = settings.user.name
    account.value = settings.account
  }

  async function restore() {
    try {
      if (!(await session.hasSession())) {
        status.value = 'signedOut'
        return
      }
      status.value = 'signedIn'
      await loadUser()
    } catch (cause) {
      // A failed profile request (offline, 5xx) keeps the user signed in.
      if (cause instanceof session.SignedOutError || status.value === 'loading') {
        status.value = 'signedOut'
      }
      error.value = messageOf(cause)
    }
  }

  async function signIn() {
    error.value = ''
    try {
      location.assign(await session.createAuthorizeUrl())
    } catch (cause) {
      error.value = messageOf(cause)
    }
  }

  async function completeSignIn(query: URLSearchParams) {
    error.value = ''
    try {
      await session.completeSignIn(query)
    } catch (cause) {
      error.value = messageOf(cause)
      return
    }
    // Ask the browser not to evict the library under disk pressure.
    void navigator.storage?.persist?.()
    await restore()
  }

  async function signOut() {
    await session.signOut()
    await clearCache()
    userName.value = ''
    account.value = undefined
    error.value = ''
    status.value = 'signedOut'
  }

  /** The session ended outside this store (revoked or expired grant). */
  function expire(message: string) {
    userName.value = ''
    account.value = undefined
    error.value = message
    status.value = 'signedOut'
  }

  return { status, userName, account, error, restore, signIn, completeSignIn, signOut, expire }
})
