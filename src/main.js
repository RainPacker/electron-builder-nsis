// This is main process of Electron, started as first thing when your
// app starts. It runs through entire life of your application.
// It doesn't have any windows which you can see on screen, but we can open
// window from here.

import path from "path";
import url from "url";
import {app, Menu, ipcMain, shell, BrowserWindow,globalShortcut } from "electron";
import appMenuTemplate from "./menu/app_menu_template";
import editMenuTemplate from "./menu/edit_menu_template";
import devMenuTemplate from "./menu/dev_menu_template";
import createWindow from "./helpers/window";

// Special module holding environment variables which you declared
// in config/env_xxx.json file.
import env from "env";

// Save userData in separate folders for each environment.
// Thanks to this you can use production and development versions of the app
// on same machine like those are two separate apps.
if (env.name !== "production") {
  const userDataPath = app.getPath("userData");
  app.setPath("userData", `${userDataPath} (${env.name})`);
}

let mainWindowRef = null; // 用于在函数间共享主窗口引用

let configWin = null;

const PAGE_URL = "http://10.213.10.57:32264/";

const setApplicationMenu = () => {
  const menus = [appMenuTemplate, editMenuTemplate];
  if (env.name !== "production") {
    menus.push(devMenuTemplate);
  }
  Menu.setApplicationMenu(Menu.buildFromTemplate(menus));
};

// We can communicate with our window (the renderer process) via messages.
const initIpc = () => {
  ipcMain.handle("need-app-path", async (event, arg) => {
    const appPath = app.getAppPath();
    const fs = require('fs');
    const path = require('path');
    const packagePath = path.join(appPath, 'package.json');
    
    try {
      const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      return { appPath, author: packageData.author };
    } catch (error) {
      console.error('读取 package.json 失败:', error);
      return { appPath, author: '无法获取' };
    }
  });
  
  ipcMain.on("open-external-link", (event, href) => {
    shell.openExternal(href);
  });
};


// IPC 通信
import { SerialPort } from 'serialport';

let serialPort = null;
let parser = null;

// 初始化解析器
let ReadlineParser;
try {
  const parserModule = require('@serialport/parser-readline');
  ReadlineParser = parserModule.ReadlineParser;
} catch (err) {
  console.error('无法导入 @serialport/parser-readline:', err.message);
  console.log('请运行: npm install @serialport/parser-readline');
  // 如果没有解析器，定义一个简单的替代方案
  ReadlineParser = class {
    constructor(options) {
      this.delimiter = options ? options.delimiter : '\n';
    }
    pipe(stream) {
      // 简单的替代实现
      return stream;
    }
  };
}

// 获取可用的串口列表
ipcMain.handle('get-serial-ports', async () => {
    try {
        const ports = await SerialPort.list();
        return { success: true, ports };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 连接串口
ipcMain.handle('connect-serial', async (event, { port, options }) => {
    try {
        // 如果已有连接，先关闭
        if (serialPort && serialPort.isOpen) {
            serialPort.close();
        }

        // 创建新的串口连接
        serialPort = new SerialPort({
            path: port,
            baudRate: options.baudRate,
            dataBits: options.dataBits,
            stopBits: options.stopBits,
            parity: options.parity,
            autoOpen: false
        });

        // 创建数据解析器
        parser = serialPort.pipe(new ReadlineParser({ delimiter: '\n' }));

        // 监听数据
        parser.on('data', (data) => {
            if (mainWindowRef) {
                BrowserWindow.getAllWindows().forEach((win=>{
                    win.webContents.send('serial-data', {
                        data: data.toString(),
                        timestamp: new Date().toISOString(),
                        type: 'received'
                    });
                }))

            }
        });

        // 监听错误
        serialPort.on('error', (error) => {
            console.error('Serial port error:', error);
            if (mainWindowRef) {
                mainWindowRef.webContents.send('serial-error', error.message);
            }
        });

        // 监听连接状态变化
        serialPort.on('open', () => {
            if (mainWindowRef) {
                mainWindowRef.webContents.send('serial-connected', { port, options });
            }
        });

        serialPort.on('close', () => {
            if (mainWindowRef) {
                console.log('disconnected...')
                mainWindowRef.webContents.send('serial-disconnected');
            }
        });

        // 打开串口
        await new Promise((resolve, reject) => {
            serialPort.open((error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });

        return { success: true };
    } catch (error) {
        console.error('Connection error:', error);
        return { success: false, error: error.message };
    }
});

// 断开串口连接
ipcMain.handle('disconnect-serial', async () => {
    try {
        if (serialPort && serialPort.isOpen) {
            await new Promise((resolve) => {
                serialPort.close((error) => {
                    if (error) {
                        console.error('Disconnect error:', error);
                    }
                    resolve();
                });
            });
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 发送数据
ipcMain.handle('send-data', async (event, data) => {
    try {
        if (!serialPort || !serialPort.isOpen) {
            return { success: false, error: '串口未连接' };
        }

        await new Promise((resolve, reject) => {
            serialPort.write(data, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });

        // 发送回显
        if (mainWindowRef) {
            mainWindowRef.webContents.send('serial-data', {
                data: data,
                timestamp: new Date().toISOString(),
                type: 'sent'
            });
        }

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 保存数据到文件
ipcMain.handle('save-data', async (event, { filename, data }) => {
    try {
        const { filePath } = await dialog.showSaveDialog(mainWindow, {
            defaultPath: filename || 'serial_data.txt',
            filters: [
                { name: 'Text Files', extensions: ['txt'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (filePath) {
            fs.writeFileSync(filePath, data, 'utf8');
            return { success: true, filePath };
        } else {
            return { success: false, error: '用户取消' };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 获取当前连接状态
ipcMain.handle('get-connection-status', () => {
    return {
        isConnected: serialPort ? serialPort.isOpen : false,
        port: serialPort ? serialPort.path : null
    };
});

// 测试串口连接
ipcMain.handle('test-connection', async (event, { port, options }) => {
    let testPort = null;
    try {
        testPort = new SerialPort({
            path: port,
            baudRate: options.baudRate,
            dataBits: options.dataBits,
            stopBits: options.stopBits,
            parity: options.parity,
            autoOpen: false
        });

        await new Promise((resolve, reject) => {
            testPort.open((error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });

        return { success: true, message: '连接测试成功' };
    } catch (error) {
        return { success: false, error: error.message };
    } finally {
        if (testPort && testPort.isOpen) {
            testPort.close();
        }
    }
});

// 发送数据
ipcMain.handle('send_config', async (event, data) => {
    console.log('configData', data);
        BrowserWindow.getAllWindows().forEach((win=>{
            win.webContents.send('config-data', data);
        }))
});



app.on("ready", () => {
  setApplicationMenu();
  initIpc();

  const mainWindow = createWindow("main", {
    width: 1000,
    height: 800,
    icon: path.join(__dirname, '../app/icon.ico'),
    webPreferences: {
      // Two properties below are here for demo purposes, and are
      // security hazard. Make sure you know what you're doing
      // in your production app.
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // 允许预加载脚本访问必要的 Node.js 功能
      enableRemoteModule: true, // 现代 Electron 版本中已弃用
      sandbox: true, // 允许预加载脚本正常运行
      disableBlinkFeatures: 'AutomationControlled',
      webSecurity: false // 禁用 web 安全限制，如 CSP
    }
  });
    console.log(path.join(__dirname, '../app/icon.ico'))

  // 保存主窗口引用供串口通信使用
  mainWindowRef = mainWindow;
    mainWindow.setMenuBarVisibility(false)

    mainWindow.loadURL(
        PAGE_URL
  );
   // let  appIcon = new Tray(path.join(__dirname, '../app/icon.ico'))
    // 注册 F5 快捷键
    globalShortcut.register('F5', () => {
        // 获取所有窗口并刷新它们
        BrowserWindow.getAllWindows().forEach(win => {
            if (win.webContents) {
                win.webContents.reload(); // 刷新窗口
            }
        });
    });

  if (env.name === "development") {
    mainWindow.openDevTools();
  }
  //  mainWindow.openDevTools();
    mainWindowRef.on("close",(event)=>{
        console.log("close...")
        event.preventDefault();
        showWindowsConfirm(event);
    });
    // 执行Ctrl+J






});


function createPopupWindow(options) {
    const popup = new BrowserWindow({
        width: options.width || 800,
        height: options.height || 500,
        modal: options.modal || false,
        show: false,
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
function showWindowsConfirm(event) {
    const { dialog } = require('electron');

    dialog.showMessageBox(mainWindowRef, {
        type: 'question',
        buttons: ['确定', '取消'],
        defaultId: 0,
        cancelId: 1,
        title: '确认退出',
        message: '确定要退出应用吗？',
        detail: '所有未保存的更改将会丢失。',
        noLink: true
    }).then((result) => {
        console.log("result",result)
        if (result.response === 0) {

          mainWindowRef.destroy();
          app.quit();
        }
    });
}

app.on("window-all-closed", () => {
    console.log("window-all-closed...")
    app.quit();
});
app.on("before-quit", (event) => {
    console.log("before-quit...")
})


setTimeout(()=>{
    configWin = createPopupWindow({
        url: "./app/index.html",
        modal: false,
        title: "串口配置",
        parent: null,
    });
    console.log(configWin)
    configWin.show();
},1000);
