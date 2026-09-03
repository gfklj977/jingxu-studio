const { mkdirSync, mkdtempSync, writeFileSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
const test = require('node:test')
const assert = require('node:assert/strict')

const { findDesktopExecutable } = require('./smoke-packaged-desktop.cjs')

test('finds the packaged Windows desktop executable', () => {
  const releaseDir = mkdtempSync(join(tmpdir(), 'jingxu-desktop-'))
  const executable = join(releaseDir, 'win-unpacked', '镜序工坊.exe')
  mkdirSync(join(executable, '..'), { recursive: true })
  writeFileSync(executable, 'binary')
  assert.equal(findDesktopExecutable(releaseDir, 'win32'), executable)
})

test('finds the packaged macOS desktop executable', () => {
  const releaseDir = mkdtempSync(join(tmpdir(), 'jingxu-desktop-'))
  const executable = join(releaseDir, 'mac-arm64', '镜序工坊.app', 'Contents', 'MacOS', '镜序工坊')
  mkdirSync(join(executable, '..'), { recursive: true })
  writeFileSync(executable, 'binary')
  assert.equal(findDesktopExecutable(releaseDir, 'darwin'), executable)
})
