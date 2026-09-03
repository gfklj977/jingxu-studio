const { app, BrowserWindow, clipboard, dialog, ipcMain, Menu, shell } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('node:path')
const http = require('node:http')
const net = require('node:net')
const { spawn } = require('node:child_process')

const { isAllowedPublishUrl } = require('./security.cjs')
const { attachDesktopSmokeTest } = require('./smoke.cjs')
const { terminateBackendProcess } = require('./process-tree.cjs')
const { configureSingleInstance } = require('./single-instance.cjs')

let backendProcess
let desktopUrl
let mainWindow
const isPrimaryInstance = configureSingleInstance(app, () => mainWindow)

function installApplicationMenu() {
  const checkForUpdates = async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      if (!result?.updateInfo || result.updateInfo.version === app.getVersion()) {
        await dialog.showMessageBox({ type: 'info', title: '检查更新', message: '当前已是最新版本。' })
      }
    } catch (error) {
      await dialog.showMessageBox({ type: 'error', title: '检查更新失败', message: error instanceof Error ? error.message : String(error) })
    }
  }
  const template = [
    ...(process.platform === 'darwin' ? [{ label: app.name, submenu: [
      { role: 'about' },
      { label: '检查更新…', click: checkForUpdates, enabled: app.isPackaged },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' },
      { type: 'separator' }, { role: 'quit' },
    ] }] : []),
    { label: '文件', submenu: [{ role: process.platform === 'darwin' ? 'close' : 'quit' }] },
    { label: '编辑', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: '窗口', submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'front' }] },
    ...(process.platform === 'darwin' ? [] : [{ label: '帮助', submenu: [
      { label: '检查更新…', click: checkForUpdates, enabled: app.isPackaged },
      { label: `关于镜序工坊 ${app.getVersion()}`, enabled: false },
    ] }]),
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function startAutomaticUpdates() {
  if (!app.isPackaged) return
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on('error', (error) => console.error('自动更新失败', error))
  autoUpdater.on('update-downloaded', async ({ version }) => {
    const result = await dialog.showMessageBox({
      type: 'info',
      title: '镜序工坊更新已就绪',
      message: `新版本 ${version} 已下载完成。`,
      detail: '现在重启即可完成安装；也可以退出应用时自动安装。',
      buttons: ['立即重启', '稍后'],
      defaultId: 0,
      cancelId: 1,
    })
    if (result.response === 0) autoUpdater.quitAndInstall()
  })
  setTimeout(() => autoUpdater.checkForUpdates().catch((error) => console.error('自动更新检查失败', error)), 10000)
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)) })
  })
}

function waitForBackend(port, attempts = 80) {
  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get(`http://127.0.0.1:${port}/api/health`, (response) => {
        let body = ''; response.on('data', (chunk) => { body += chunk }); response.on('end', () => {
          if (response.statusCode === 200 && body.includes('jingxu-api')) resolve()
          else retry()
        })
      })
      request.on('error', retry); request.setTimeout(1000, () => request.destroy())
    }
    const retry = () => { if (attempts-- <= 0) reject(new Error('本地 API 启动超时')); else setTimeout(check, 250) }
    check()
  })
}

async function startPackagedBackend() {
  const port = await getFreePort()
  const executable = path.join(process.resourcesPath, 'backend', process.platform === 'win32' ? 'jingxu-api.exe' : 'jingxu-api')
  backendProcess = spawn(executable, [], { env: { ...process.env, JINGXU_PORT: String(port), JINGXU_DATA_DIR: app.getPath('userData'), JINGXU_WEB_DIR: path.join(process.resourcesPath, 'web') }, stdio: 'ignore' })
  await waitForBackend(port)
  return `http://127.0.0.1:${port}`
}

function createWindow(appUrl) {
  const smokeMode = process.env.JINGXU_DESKTOP_SMOKE === '1'
  const allowedOrigin = new URL(appUrl).origin
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    title: '镜序工坊',
    backgroundColor: '#f6f8fa',
    show: !smokeMode,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedPublishUrl(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  window.webContents.on('will-navigate', (event, url) => {
    try {
      if (new URL(url).origin !== allowedOrigin) event.preventDefault()
    } catch {
      event.preventDefault()
    }
  })
  if (smokeMode) {
    attachDesktopSmokeTest({
      window,
      report: (result) => console.log(`JINGXU_DESKTOP_SMOKE_OK ${JSON.stringify(result)}`),
      quit: () => app.quit(),
      fail: (error) => { console.error('JINGXU_DESKTOP_SMOKE_FAILED', error); app.exit(1) },
    })
  }
  mainWindow = window
  window.on('closed', () => { if (mainWindow === window) mainWindow = undefined })
  window.loadURL(appUrl)
  return window
}

ipcMain.handle('desktop:copyText', (_event, text) => {
  if (typeof text !== 'string' || text.length > 100000) throw new Error('无效的剪贴板内容')
  clipboard.writeText(text)
})
ipcMain.handle('desktop:openPublishUrl', (_event, url) => {
  if (!isAllowedPublishUrl(url)) throw new Error('不允许打开该网址')
  return shell.openExternal(url)
})
ipcMain.handle('desktop:showItemInFolder', (_event, filePath) => {
  if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) throw new Error('无效的文件路径')
  shell.showItemInFolder(filePath)
})

if (isPrimaryInstance) {
  app.whenReady()
    .then(async () => {
      desktopUrl = process.env.JINGXU_DEV_URL || await startPackagedBackend()
      installApplicationMenu()
      createWindow(desktopUrl)
      startAutomaticUpdates()
      app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(desktopUrl) })
    })
    .catch((error) => {
      dialog.showErrorBox('镜序工坊启动失败', error instanceof Error ? error.message : String(error))
      app.quit()
    })
}
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('before-quit', () => terminateBackendProcess(backendProcess))
