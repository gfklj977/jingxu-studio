import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'
import { describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const { attachDesktopSmokeTest } = require('./smoke.cjs') as {
  attachDesktopSmokeTest(options: Record<string, unknown>): void
}

describe('packaged desktop smoke mode', () => {
  it('reports success and quits after the renderer is ready', async () => {
    const webContents = new EventEmitter() as EventEmitter & { executeJavaScript: ReturnType<typeof vi.fn> }
    webContents.executeJavaScript = vi.fn().mockResolvedValue({ title: '镜序工坊', hasRoot: true })
    const quit = vi.fn()
    const fail = vi.fn()
    const report = vi.fn()

    attachDesktopSmokeTest({ window: { webContents }, quit, fail, report, timeoutMs: 100 })
    webContents.emit('did-finish-load')
    await vi.waitFor(() => expect(quit).toHaveBeenCalledOnce())

    expect(fail).not.toHaveBeenCalled()
    expect(report).toHaveBeenCalledWith(expect.objectContaining({ title: '镜序工坊', hasRoot: true }))
  })
})
