// 控制应用生命周期和创建原生浏览器窗口的模组
const { app, BrowserWindow, ipcMain, dialog, shell, Menu, MenuItem } = require('electron')
const path = require('path')
const { statSync } = require('fs')

const NODE_ENV = process.env.NODE_ENV

function createWindow() {
  // 创建浏览器窗口
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // 加载 index.html
  mainWindow.loadURL(
    NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../vue/dist/index.html')}`
  );

  // 打开开发工具
  if (NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }
}

// 这段程序将会在 Electron 结束初始化
// 和创建浏览器窗口的时候调用
// 部分 API 在 ready 事件触发后才能使用。
app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // 通常在 macOS 上，当点击 dock 中的应用程序图标时，如果没有其他
    // 打开的窗口，那么程序会重新创建一个窗口。
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// 除了 macOS 外，当所有窗口都被关闭的时候退出程序。 因此，通常对程序和它们在
// 任务栏上的图标来说，应当保持活跃状态，直到用户使用 Cmd + Q 退出。
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// 在这个文件中，你可以包含应用程序剩余的所有部分的代码，
// 也可以拆分成几个文件，然后用 require 导入。

// 【选择文件夹】对话框
ipcMain.handle('choose-dir-dialog', function () {
  var dirs = dialog.showOpenDialogSync(BrowserWindow.getFocusedWindow(), {
    title: '选择目标文件夹',
    properties: ['openDirectory']
  })
  if (dirs && dirs[0]) {
    return dirs[0]
  }
  return null
})

// 弹出 context menu
ipcMain.on('show-context-menu', function (evt, ctx) {
  const aOptions = {
    label: 'N/A',
    enabled: false,
  }
  try {
    const aPath = path.normalize(path.join(ctx.a, ...ctx.abspath))
    const aStat = statSync(aPath)
    aOptions.label = '在资源管理器中打开 ' + aPath
    aOptions.icon = path.join(__dirname, aStat.isDirectory() ? 'dir.png' : 'file.png')
    aOptions.enabled = true
    aOptions.click = () => {
      shell.showItemInFolder(aPath)
    }
  } catch {}

  const bOptions = {
    label: 'N/A',
    enabled: false,
  }
  try {
    const bPath = path.normalize(path.join(ctx.b, ...ctx.abspath))
    const bStat = statSync(bPath)
    bOptions.label = '在资源管理器中打开 ' + bPath
    bOptions.icon = path.join(__dirname, bStat.isDirectory() ? 'dir.png' : 'file.png')
    bOptions.enabled = true
    bOptions.click = () => {
      shell.showItemInFolder(bPath)
    }
  } catch {}

  const window = BrowserWindow.fromWebContents(evt.sender)
  const menu = new Menu()
  menu.append(new MenuItem(aOptions))
  menu.append(new MenuItem(bOptions))
  menu.popup({ window })
})
