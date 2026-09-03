function focusExistingWindow(window) {
  if (!window) return
  if (window.isMinimized()) window.restore()
  window.show()
  window.focus()
}

function configureSingleInstance(app, getWindow) {
  if (!app.requestSingleInstanceLock()) {
    app.quit()
    return false
  }
  app.on('second-instance', () => focusExistingWindow(getWindow()))
  return true
}

module.exports = { configureSingleInstance, focusExistingWindow }
