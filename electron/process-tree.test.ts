import { createRequire } from 'node:module'
import { describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
type RunCommand = (command: string, args: string[], options: { windowsHide: boolean; stdio: string }) => unknown
const { terminateBackendProcess } = require('./process-tree.cjs') as {
  terminateBackendProcess(child: { pid: number; exitCode: number | null; kill(): void }, platform: string, run?: RunCommand): void
}

describe('desktop backend shutdown', () => {
  it('terminates the complete backend process tree on Windows', () => {
    const child = { pid: 4321, exitCode: null, kill: vi.fn() }
    const run = vi.fn()
    terminateBackendProcess(child, 'win32', run)
    expect(run).toHaveBeenCalledWith('taskkill', ['/pid', '4321', '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
    expect(child.kill).not.toHaveBeenCalled()
  })

  it('uses a normal child termination on macOS', () => {
    const child = { pid: 4321, exitCode: null, kill: vi.fn() }
    terminateBackendProcess(child, 'darwin', vi.fn())
    expect(child.kill).toHaveBeenCalledOnce()
  })

  it('does nothing when the backend has already exited', () => {
    const child = { pid: 4321, exitCode: 0, kill: vi.fn() }
    const run = vi.fn()
    terminateBackendProcess(child, 'win32', run)
    expect(run).not.toHaveBeenCalled()
    expect(child.kill).not.toHaveBeenCalled()
  })
})
