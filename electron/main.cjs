const { app, BrowserWindow, clipboard, ipcMain, shell } = require('electron')
const path = require('node:path')

const { isAllowedPublishUrl } = require('./security.cjs')

function createWindow() {
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
    const origin = process.env.JINGXU_DEV_URL || `file://${path.join(__dirname, '../dist/index.html')}`
    if (!url.startsWith(origin)) event.preventDefault()
  })
  if (process.env.JINGXU_DEV_URL) window.loadURL(process.env.JINGXU_DEV_URL)
  else window.loadFile(path.join(__dirname, '../dist/index.html'))
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

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
