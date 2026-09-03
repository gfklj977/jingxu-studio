import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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

describe('desktop update release configuration', () => {
  it('publishes GitHub metadata for NSIS and signed macOS updates', () => {
    const packageJson = JSON.parse(readFileSync(resolve('package.json'), 'utf8'))
    expect(packageJson.build.publish).toEqual([{ provider: 'github', owner: 'gfklj977', repo: 'jingxu-studio' }])
    expect(packageJson.build.mac.target.map((target: { target: string }) => target.target)).toEqual(['dmg', 'zip'])
    expect(packageJson.build.win.target[0].target).toBe('nsis')
  })
})
