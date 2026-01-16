import { BrowserWindow } from "electron";

export default {
  label: "Serial",
  submenu: [
    {
      label: "Configure Serial Port",
      click: () => {
        // 发送事件到渲染进程打开串口配置对话框
        const mainWindow = BrowserWindow.getAllWindows()[0]; // 获取主窗口
        if (mainWindow) {
          mainWindow.webContents.send('open-serial-config-dialog');
        }
      }
    },
    {
      type: "separator"
    },
    {
      label: "Test Serial Connection",
      click: () => {
        // 发送事件到渲染进程测试串口连接
        const mainWindow = BrowserWindow.getAllWindows()[0]; // 获取主窗口
        if (mainWindow) {
          mainWindow.webContents.send('test-serial-connection');
        }
      }
    }
  ]
};