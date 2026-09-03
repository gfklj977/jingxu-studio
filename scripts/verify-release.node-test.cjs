const { createHash } = require('node:crypto')
const { mkdirSync, mkdtempSync, writeFileSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
const test = require('node:test')
const assert = require('node:assert/strict')

const { verifyRelease } = require('./verify-release.cjs')

function fixture({ checksum = true, backend = true, manifestFile = 'jingxu-studio-0.1.0-x64-win.exe' } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'jingxu-release-'))
  const releaseDir = join(root, 'release')
  const backendPath = join(releaseDir, 'win-unpacked', 'resources', 'backend', 'jingxu-api.exe')
  const installerName = 'jingxu-studio-0.1.0-x64-win.exe'
  const installer = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(1024 * 1024)])

  mkdirSync(releaseDir, { recursive: true })
  writeFileSync(join(releaseDir, installerName), installer)
  writeFileSync(
    join(releaseDir, 'latest.yml'),
    `version: 0.1.0\npath: ${manifestFile}\nsize: ${installer.length}\n`,
  )
  const digest = createHash('sha256').update(installer).digest('hex')
  writeFileSync(join(releaseDir, 'SHA256SUMS.txt'), `${checksum ? digest : '0'.repeat(64)}  ${installerName}\n`)
  if (backend) {
    mkdirSync(join(backendPath, '..'), { recursive: true })
    writeFileSync(backendPath, Buffer.from('MZbackend'))
  }
  return { root, releaseDir }
}

test('accepts a complete Windows x64 release', () => {
  const { releaseDir } = fixture()
  assert.deepEqual(verifyRelease({ releaseDir, platform: 'win32', version: '0.1.0', minimumBytes: 1024 }), {
    installers: ['jingxu-studio-0.1.0-x64-win.exe'],
    manifest: 'latest.yml',
  })
})

test('rejects a checksum mismatch', () => {
  const { releaseDir } = fixture({ checksum: false })
  assert.throws(
    () => verifyRelease({ releaseDir, platform: 'win32', version: '0.1.0', minimumBytes: 1024 }),
    /SHA-256 校验失败/,
  )
})

test('rejects a manifest that points at another installer', () => {
  const { releaseDir } = fixture({ manifestFile: 'other.exe' })
  assert.throws(
    () => verifyRelease({ releaseDir, platform: 'win32', version: '0.1.0', minimumBytes: 1024 }),
    /更新清单未引用安装包/,
  )
})

test('rejects a package without the embedded backend', () => {
  const { releaseDir } = fixture({ backend: false })
  assert.throws(
    () => verifyRelease({ releaseDir, platform: 'win32', version: '0.1.0', minimumBytes: 1024 }),
    /未找到内置后端/,
  )
})

test('accepts the uppercase Resources directory used by macOS apps', () => {
  const root = mkdtempSync(join(tmpdir(), 'jingxu-release-'))
  const releaseDir = join(root, 'release')
  const dmgName = 'jingxu-studio-0.1.0-arm64-mac.dmg'
  const zipName = 'jingxu-studio-0.1.0-arm64-mac.zip'
  const dmg = Buffer.alloc(1024 * 1024)
  dmg.write('koly', dmg.length - 512)
  const zip = Buffer.concat([Buffer.from('PK'), Buffer.alloc(1024 * 1024)])
  mkdirSync(join(releaseDir, 'mac-arm64', '镜序工坊.app', 'Contents', 'Resources', 'backend'), { recursive: true })
  writeFileSync(join(releaseDir, dmgName), dmg)
  writeFileSync(join(releaseDir, zipName), zip)
  writeFileSync(join(releaseDir, 'latest-mac.yml'), `version: 0.1.0\npath: ${zipName}\n`)
  writeFileSync(
    join(releaseDir, 'SHA256SUMS.txt'),
    `${createHash('sha256').update(dmg).digest('hex')}  ${dmgName}\n${createHash('sha256').update(zip).digest('hex')}  ${zipName}\n`,
  )
  writeFileSync(join(releaseDir, 'mac-arm64', '镜序工坊.app', 'Contents', 'Resources', 'backend', 'jingxu-api'), 'backend')

  assert.doesNotThrow(() =>
    verifyRelease({ releaseDir, platform: 'darwin', version: '0.1.0', minimumBytes: 1024 }),
  )
})
