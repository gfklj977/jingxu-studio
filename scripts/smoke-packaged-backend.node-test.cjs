const { createServer } = require('node:http')
const { mkdirSync, mkdtempSync, writeFileSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
const test = require('node:test')
const assert = require('node:assert/strict')

const { findPackagedResources, terminationCommand, waitForHealth } = require('./smoke-packaged-backend.cjs')

test('terminates the complete PyInstaller process tree on Windows', () => {
  assert.deepEqual(terminationCommand('win32', 4321), {
    command: 'taskkill',
    args: ['/pid', '4321', '/T', '/F'],
  })
  assert.equal(terminationCommand('darwin', 4321), null)
})

test('finds Windows packaged backend and web resources', () => {
  const releaseDir = mkdtempSync(join(tmpdir(), 'jingxu-smoke-'))
  const resourcesDir = join(releaseDir, 'win-unpacked', 'resources')
  mkdirSync(join(resourcesDir, 'backend'), { recursive: true })
  mkdirSync(join(resourcesDir, 'web'), { recursive: true })
  writeFileSync(join(resourcesDir, 'backend', 'jingxu-api.exe'), 'binary')
  writeFileSync(join(resourcesDir, 'web', 'index.html'), '<html></html>')

  assert.deepEqual(findPackagedResources(releaseDir, 'win32'), {
    backend: join(resourcesDir, 'backend', 'jingxu-api.exe'),
    web: join(resourcesDir, 'web'),
  })
})

test('waits until the packaged backend reports healthy', async () => {
  let requests = 0
  const server = createServer((request, response) => {
    requests += 1
    response.setHeader('content-type', 'application/json')
    response.end(JSON.stringify(requests > 1 ? { service: 'jingxu-api' } : { service: 'starting' }))
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()

  try {
    const health = await waitForHealth(port, { timeoutMs: 1000, intervalMs: 10 })
    assert.equal(health.service, 'jingxu-api')
    assert.ok(requests >= 2)
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
})
