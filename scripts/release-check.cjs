const { existsSync, readFileSync } = require('node:fs')
const { join } = require('node:path')

const root = join(__dirname, '..')
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const failures = []

if (!/^\d+\.\d+\.\d+$/.test(packageJson.version)) failures.push('package.json version 必须使用 x.y.z 格式')
for (const relativePath of [
  'build-resources/icon.icns',
  'build-resources/icon.ico',
  'backend/desktop_entry.py',
  'electron/main.cjs',
]) {
  if (!existsSync(join(root, relativePath))) failures.push(`缺少发布文件：${relativePath}`)
}
if (packageJson.build?.productName !== '镜序工坊') failures.push('桌面产品名称不是“镜序工坊”')
if (packageJson.build?.appId !== 'com.jingxu.studio') failures.push('桌面 Bundle ID 不正确')
if (process.env.GITHUB_REF_TYPE === 'tag' && process.env.GITHUB_REF_NAME !== `v${packageJson.version}`) {
  failures.push(`发布标签 ${process.env.GITHUB_REF_NAME} 与版本 v${packageJson.version} 不一致`)
}

if (failures.length) {
  for (const failure of failures) console.error(`✗ ${failure}`)
  process.exit(1)
}
console.log(`✓ 镜序工坊 ${packageJson.version} 发布配置完整`)
