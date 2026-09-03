const { spawn } = require('node:child_process')
const { existsSync } = require('node:fs')
const { join } = require('node:path')

function findDesktopExecutable(releaseDir, platform) {
  const executable = platform === 'win32'
    ? join(releaseDir, 'win-unpacked', '镜序工坊.exe')
    : join(releaseDir, 'mac-arm64', '镜序工坊.app', 'Contents', 'MacOS', '镜序工坊')
  if (!existsSync(executable)) throw new Error(`未找到桌面主程序：${executable}`)
  return executable
}

function stopProcessTree(child, platform) {
  if (child.exitCode !== null) return
  if (platform !== 'win32') {
    child.kill('SIGKILL')
    return
  }
  spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
}

async function smokePackagedDesktop({ releaseDir, platform, timeoutMs = 45_000 }) {
  const executable = findDesktopExecutable(releaseDir, platform)
  const child = spawn(executable, [], {
    env: { ...process.env, JINGXU_DESKTOP_SMOKE: '1', ELECTRON_DISABLE_GPU: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  child.stdout.on('data', (chunk) => { output += chunk.toString() })
  child.stderr.on('data', (chunk) => { output += chunk.toString() })

  const result = await Promise.race([
    new Promise((resolve) => child.once('exit', (code, signal) => resolve({ code, signal }))),
    new Promise((resolve) => setTimeout(() => resolve({ timeout: true }), timeoutMs)),
  ])
  if (result.timeout) {
    stopProcessTree(child, platform)
    throw new Error(`桌面主程序未在 ${timeoutMs}ms 内完成自检\n${output.trim()}`)
  }
  if (result.code !== 0 || !output.includes('JINGXU_DESKTOP_SMOKE_OK')) {
    throw new Error(`桌面主程序自检失败（退出码 ${result.code}，信号 ${result.signal || '无'}）\n${output.trim()}`)
  }
  return { executable, output }
}

if (require.main === module) {
  smokePackagedDesktop({ releaseDir: join(__dirname, '..', 'release'), platform: process.platform })
    .then(({ executable }) => console.log(`✓ 桌面主程序启动与渲染正常：${executable}`))
    .catch((error) => {
      console.error(`✗ ${error.message}`)
      process.exit(1)
    })
}

module.exports = { findDesktopExecutable, smokePackagedDesktop }
