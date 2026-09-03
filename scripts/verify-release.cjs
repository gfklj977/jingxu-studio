const { createHash } = require('node:crypto')
const { existsSync, readFileSync, readdirSync, statSync } = require('node:fs')
const { basename, join } = require('node:path')

function walk(directory) {
  if (!existsSync(directory)) return []
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? walk(path) : [path]
  })
}

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex')
}

function verifyMagic(filePath, expected) {
  const content = readFileSync(filePath)
  if (expected === 'MZ' && content.subarray(0, 2).toString() !== 'MZ') throw new Error(`${basename(filePath)} 不是有效的 PE 安装包`)
  if (expected === 'PK' && content.subarray(0, 2).toString() !== 'PK') throw new Error(`${basename(filePath)} 不是有效的 ZIP 安装包`)
  if (expected === 'koly' && content.subarray(-512, -508).toString() !== 'koly') throw new Error(`${basename(filePath)} 不是有效的 DMG 安装包`)
}

function verifyRelease({ releaseDir, platform, version, minimumBytes = 10 * 1024 * 1024 }) {
  const isWindows = platform === 'win32'
  const expected = isWindows
    ? [`jingxu-studio-${version}-x64-win.exe`]
    : [`jingxu-studio-${version}-arm64-mac.dmg`, `jingxu-studio-${version}-arm64-mac.zip`]
  const manifest = isWindows ? 'latest.yml' : 'latest-mac.yml'
  const manifestPath = join(releaseDir, manifest)
  const checksumPath = join(releaseDir, 'SHA256SUMS.txt')

  if (!existsSync(manifestPath)) throw new Error(`缺少更新清单：${manifest}`)
  if (!existsSync(checksumPath)) throw new Error('缺少 SHA256SUMS.txt')

  const manifestText = readFileSync(manifestPath, 'utf8')
  const checksumText = readFileSync(checksumPath, 'utf8')
  if (!manifestText.includes(`version: ${version}`)) throw new Error('更新清单版本不匹配')

  for (const name of expected) {
    const filePath = join(releaseDir, name)
    if (!existsSync(filePath)) throw new Error(`缺少安装包：${name}`)
    if (statSync(filePath).size < minimumBytes) throw new Error(`安装包体积异常：${name}`)
    if (!checksumText.includes(`${sha256(filePath)}  ${name}`)) throw new Error(`SHA-256 校验失败：${name}`)
    verifyMagic(filePath, name.endsWith('.exe') ? 'MZ' : name.endsWith('.zip') ? 'PK' : 'koly')
  }

  const updateInstaller = isWindows ? expected[0] : expected.find((name) => name.endsWith('.zip'))
  if (!manifestText.includes(updateInstaller)) throw new Error(`更新清单未引用安装包：${updateInstaller}`)

  const backend = walk(releaseDir).find((filePath) => {
    const normalized = filePath.replaceAll('\\', '/').toLowerCase()
    return /\/resources\/backend\/jingxu-api(?:\.exe)?$/.test(normalized)
  })
  if (!backend || statSync(backend).size === 0) throw new Error('未找到内置后端 jingxu-api')
  if (isWindows && readFileSync(backend).subarray(0, 2).toString() !== 'MZ') throw new Error('内置 Windows 后端格式无效')

  return { installers: expected, manifest }
}

if (require.main === module) {
  const packageJson = require('../package.json')
  try {
    const result = verifyRelease({
      releaseDir: join(__dirname, '..', 'release'),
      platform: process.platform,
      version: packageJson.version,
    })
    console.log(`✓ 已验收 ${result.installers.length} 个安装包、${result.manifest} 和内置后端`)
  } catch (error) {
    console.error(`✗ ${error.message}`)
    process.exit(1)
  }
}

module.exports = { verifyRelease }
