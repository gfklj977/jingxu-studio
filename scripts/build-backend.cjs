const { existsSync } = require('node:fs')
const { spawnSync } = require('node:child_process')
const { join } = require('node:path')

const root = join(__dirname, '..')
const candidates = process.platform === 'win32'
  ? [join(root, '.venv', 'Scripts', 'pyinstaller.exe'), 'pyinstaller']
  : [join(root, '.venv', 'bin', 'pyinstaller'), 'pyinstaller']
const executable = candidates.find((candidate) => candidate === 'pyinstaller' || existsSync(candidate))

const result = spawnSync(executable, [
  '--clean',
  '--noconfirm',
  '--onefile',
  '--name', 'jingxu-api',
  '--paths', 'backend',
  '--collect-all', 'imageio_ffmpeg',
  '--collect-all', 'keyring',
  'backend/desktop_entry.py',
  '--distpath', 'backend-dist',
], {
  cwd: root,
  stdio: 'inherit',
  shell: executable === 'pyinstaller',
})

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}
process.exit(result.status ?? 1)
