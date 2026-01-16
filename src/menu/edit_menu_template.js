import { BrowserWindow } from "electron";
import path from "path";
function createPopupWindow(options) {
  const popup = new BrowserWindow({
    width: options.width || 800,
    height: options.height || 500,
    modal: options.modal || false,
    menuBarVisible : true,
    parent: options.parent || null,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // 允许预加载脚本访问必要的 Node.js 功能
      enableRemoteModule: true, // 现代 Electron 版本中已弃用
      sandbox: true, // 允许预加载脚本正常运行
      disableBlinkFeatures: 'AutomationControlled',
      webSecurity: false // 禁用 web 安全限制，如 CSP
    }
  })
  popup.setTitle(options.title || "")
  popup.loadFile(options.url)
  return popup
}
let configWin = null;

export default {
  label: "串口",
  submenu: [
    {
      label: "配置/测试", accelerator: "CmdOrCtrl+J",
      click: () => {
        // 获取主窗口
        // 打开一个串口配置对话窗
        configWin = createPopupWindow({
          url: "./app/index.html",
          modal: true,
          title: "串口配置"
        })

       
        
        
      }

     },

  ]
};
