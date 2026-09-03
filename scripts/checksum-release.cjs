const { createHash } = require('node:crypto')
const { createReadStream, existsSync, readdirSync, writeFileSync } = require('node:fs')
const { basename, join } = require('node:path')

const releaseDir = join(__dirname, '..', 'release')
const installers = existsSync(releaseDir)
  ? readdirSync(releaseDir).filter((name) => /\.(dmg|exe|msi|zip)$/i.test(name)).sort()
  : []

if (!installers.length) {
  console.error('✗ release 目录中没有可校验的安装包')
  process.exit(1)
}

async function digest(filePath) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(filePath)) hash.update(chunk)
  return hash.digest('hex')
}

Promise.all(installers.map(async (name) => `${await digest(join(releaseDir, name))}  ${basename(name)}`))
  .then((lines) => {
    writeFileSync(join(releaseDir, 'SHA256SUMS.txt'), `${lines.join('\n')}\n`, 'utf8')
    console.log(`✓ 已校验 ${installers.length} 个安装包`)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
