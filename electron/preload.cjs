const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('jingxuDesktop', Object.freeze({
  copyText: (text) => ipcRenderer.invoke('desktop:copyText', text),
  openPublishUrl: (url) => ipcRenderer.invoke('desktop:openPublishUrl', url),
  showItemInFolder: (path) => ipcRenderer.invoke('desktop:showItemInFolder', path),
  platform: process.platform,
}))
