const { spawnSync } = require('node:child_process')

function terminateBackendProcess(child, platform = process.platform, run = spawnSync) {
  if (!child || child.exitCode !== null) return
  if (platform === 'win32' && Number.isInteger(child.pid)) {
    try {
      run('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
      return
    } catch (error) {
      console.error('Windows 后端进程树清理失败，回退到直接终止', error)
    }
  }
  child.kill()
}

module.exports = { terminateBackendProcess }
