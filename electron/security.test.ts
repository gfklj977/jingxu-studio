import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { isAllowedPublishUrl } = require('./security.cjs') as { isAllowedPublishUrl(value: string): boolean }

describe('desktop publish URL allowlist', () => {
  it('allows only configured HTTPS creator platforms', () => {
    expect(isAllowedPublishUrl('https://creator.douyin.com/')).toBe(true)
    expect(isAllowedPublishUrl('https://evil.example/?next=creator.douyin.com')).toBe(false)
    expect(isAllowedPublishUrl('http://creator.douyin.com/')).toBe(false)
    expect(isAllowedPublishUrl('javascript:alert(1)')).toBe(false)
  })
})
