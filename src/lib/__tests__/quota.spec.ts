import { beforeEach, describe, expect, it, vi } from 'vitest'

import { isQuotaLow, nextReset, readQuota, recordQuota } from '@/api/quota'

const headers = (remaining: number) =>
  new Headers({ 'X-RateLimit-Limit': '500', 'X-RateLimit-Remaining': String(remaining) })

beforeEach(() => {
  localStorage.clear()
  vi.useRealTimers()
})

describe('quota', () => {
  it('resets at midnight in New York', () => {
    const reset = nextReset(Date.parse('2026-11-26T12:00:00Z'))

    expect(reset.toISOString()).toBe('2026-11-27T05:00:00.000Z')
  })

  it('is low under a tenth of the allowance', () => {
    recordQuota(headers(49))

    expect(isQuotaLow()).toBe(true)
  })

  it('is forgotten after the reset', () => {
    recordQuota(headers(0))

    expect(readQuota(Date.now() + 25 * 3_600_000)).toBeNull()
  })

  it('ignores responses without the headers', () => {
    recordQuota(new Headers())

    expect(readQuota()).toBeNull()
  })
})
