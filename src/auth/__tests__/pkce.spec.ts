import { describe, expect, it } from 'vitest'

import { codeChallenge, randomToken } from '../pkce'

describe('pkce', () => {
  it('matches the RFC 7636 Appendix B test vector', async () => {
    await expect(codeChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).resolves.toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    )
  })

  it('creates URL-safe 43-character tokens', () => {
    expect(randomToken()).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })
})
