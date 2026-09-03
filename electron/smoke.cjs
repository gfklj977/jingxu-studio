function attachDesktopSmokeTest({ window, quit, fail, report, timeoutMs = 30_000 }) {
  let settled = false
  const finish = (callback) => {
    if (settled) return
    settled = true
    clearTimeout(timeout)
    callback()
  }
  const timeout = setTimeout(() => finish(() => fail(new Error('桌面页面加载超时'))), timeoutMs)

  window.webContents.once('did-fail-load', (_event, code, description) => {
    finish(() => fail(new Error(`桌面页面加载失败：${code} ${description}`)))
  })
  window.webContents.once('did-finish-load', async () => {
    try {
      const result = await window.webContents.executeJavaScript(`({
        title: document.title,
        hasRoot: Boolean(document.querySelector('#root')),
        bodyTextLength: document.body?.innerText?.trim().length || 0
      })`)
      if (!result.hasRoot || !result.title.includes('镜序工坊') || result.bodyTextLength === 0) {
        throw new Error(`桌面渲染结果异常：${JSON.stringify(result)}`)
      }
      finish(() => { report(result); quit() })
    } catch (error) {
      finish(() => fail(error))
    }
  })
}

module.exports = { attachDesktopSmokeTest }
