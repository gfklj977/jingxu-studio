const { spawn } = require('node:child_process')
const { existsSync, mkdtempSync, readdirSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { basename, dirname, join } = require('node:path')

function walk(directory) {
  if (!existsSync(directory)) return []
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? walk(path) : [path]
  })
}

function findPackagedResources(releaseDir, platform) {
  const executableName = platform === 'win32' ? 'jingxu-api.exe' : 'jingxu-api'
  const backend = walk(releaseDir).find((filePath) =>
    basename(filePath).toLowerCase() === executableName,
  )
  if (!backend) throw new Error(`未找到可运行后端：${executableName}`)

  const resources = dirname(dirname(backend))
  const web = join(resources, 'web')
  if (!existsSync(join(web, 'index.html'))) throw new Error('未找到内置 Web 资源 index.html')
  return { backend, web }
}

async function waitForHealth(port, { timeoutMs = 20_000, intervalMs = 200, child } = {}) {
  const deadline = Date.now() + timeoutMs
  let lastError
  while (Date.now() < deadline) {
    if (child && child.exitCode !== null) throw new Error(`内置后端提前退出，退出码：${child.exitCode}`)
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`)
      const payload = await response.json()
      if (response.ok && payload.service === 'jingxu-api') return payload
      lastError = new Error(`健康接口响应异常：${JSON.stringify(payload)}`)
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  throw new Error(`内置后端未在 ${timeoutMs}ms 内就绪：${lastError?.message || '无响应'}`)
}

function terminationCommand(platform, pid) {
  if (platform !== 'win32') return null
  return { command: 'taskkill', args: ['/pid', String(pid), '/T', '/F'] }
}

async function terminateChild(child, platform) {
  if (child.exitCode !== null) return
  const command = terminationCommand(platform, child.pid)
  if (!command) {
    child.kill()
    return
  }
  await new Promise((resolve) => {
    const killer = spawn(command.command, command.args, { stdio: 'ignore' })
    killer.once('error', resolve)
    killer.once('exit', resolve)
  })
}

async function smokePackagedBackend({ releaseDir, platform, port = 18765 }) {
  const { backend, web } = findPackagedResources(releaseDir, platform)
  const dataDir = mkdtempSync(join(tmpdir(), 'jingxu-smoke-data-'))
  const child = spawn(backend, [], {
    env: {
      ...process.env,
      JINGXU_PORT: String(port),
      JINGXU_DATA_DIR: dataDir,
      JINGXU_WEB_DIR: web,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stderr = ''
  child.stderr.on('data', (chunk) => { stderr += chunk.toString() })

  try {
    await waitForHealth(port, { child })
    return { backend, port }
  } catch (error) {
    throw new Error(`${error.message}${stderr ? `\n${stderr.trim()}` : ''}`)
  } finally {
    await terminateChild(child, platform)
    await Promise.race([
      new Promise((resolve) => child.once('exit', resolve)),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ])
    rmSync(dataDir, { recursive: true, force: true })
  }
}

if (require.main === module) {
  smokePackagedBackend({
    releaseDir: join(__dirname, '..', 'release'),
    platform: process.platform,
    port: Number(process.env.JINGXU_SMOKE_PORT || 18765),
  })
    .then(({ backend, port }) => console.log(`✓ 内置后端运行正常：${backend}（端口 ${port}）`))
    .catch((error) => {
      console.error(`✗ ${error.message}`)
      process.exit(1)
    })
}

module.exports = { findPackagedResources, smokePackagedBackend, terminationCommand, waitForHealth }
