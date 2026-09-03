const { app, BrowserWindow, clipboard, dialog, ipcMain, shell } = require('electron')
const path = require('node:path')
const http = require('node:http')
const net = require('node:net')
const { spawn } = require('node:child_process')

const { isAllowedPublishUrl } = require('./security.cjs')

let backendProcess
let desktopUrl

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
  const allowedOrigin = new URL(appUrl).origin
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    title: '镜序工坊',
    backgroundColor: '#f6f8fa',
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
  window.loadURL(appUrl)
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

app.whenReady()
  .then(async () => {
    desktopUrl = process.env.JINGXU_DEV_URL || await startPackagedBackend()
    createWindow(desktopUrl)
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(desktopUrl) })
  })
  .catch((error) => {
    dialog.showErrorBox('镜序工坊启动失败', error instanceof Error ? error.message : String(error))
    app.quit()
  })
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('before-quit', () => { if (backendProcess && !backendProcess.killed) backendProcess.kill() })
