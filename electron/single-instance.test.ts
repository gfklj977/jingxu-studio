import { createRequire } from 'node:module'
import { describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const { configureSingleInstance } = require('./single-instance.cjs') as {
  configureSingleInstance(app: Record<string, unknown>, getWindow: () => Record<string, unknown> | null): boolean
}

function fakeApp(hasLock: boolean) {
  const handlers = new Map<string, () => void>()
  return {
    handlers,
    requestSingleInstanceLock: vi.fn(() => hasLock),
    quit: vi.fn(),
    on: vi.fn((event: string, handler: () => void) => handlers.set(event, handler)),
  }
}

describe('desktop single-instance behavior', () => {
  it('quits the second process when the instance lock is unavailable', () => {
    const app = fakeApp(false)
    expect(configureSingleInstance(app, () => null)).toBe(false)
    expect(app.quit).toHaveBeenCalledOnce()
    expect(app.on).not.toHaveBeenCalled()
  })

  it('keeps the primary process and registers the second-instance handler', () => {
    const app = fakeApp(true)
    expect(configureSingleInstance(app, () => null)).toBe(true)
    expect(app.quit).not.toHaveBeenCalled()
    expect(app.handlers.has('second-instance')).toBe(true)
  })

  it('restores, shows and focuses the existing window', () => {
    const app = fakeApp(true)
    const window = { isMinimized: vi.fn(() => true), restore: vi.fn(), show: vi.fn(), focus: vi.fn() }
    configureSingleInstance(app, () => window)
    app.handlers.get('second-instance')?.()
    expect(window.restore).toHaveBeenCalledOnce()
    expect(window.show).toHaveBeenCalledOnce()
    expect(window.focus).toHaveBeenCalledOnce()
  })
})
