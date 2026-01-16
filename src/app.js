import "./stylesheets/main.css";

// Everything below is just a demo. You can delete all of it.

// 由于 nodeIntegration: false, contextIsolation: true，我们不能直接使用 require 或 import
// 需要通过预加载脚本暴露的 API 来访问 Electron 功能
import { greet } from "./hello_world/hello_world";
import env from "env";

// 检查是否在浏览器环境中（开发模式）或 Electron 环境中
const isElectron = typeof window !== 'undefined' && window.process && window.process.type;

// 确保 process 对象存在
// 在 Electron 环境中，process 会通过 preload.js 暴露
const safeProcess = (typeof window !== 'undefined' && window.process) || { platform: 'unknown', versions: { electron: 'N/A' } };

// 检查是否在 Electron 环境中运行
const isElectronEnv = () => {
  return typeof window !== 'undefined' && 
         window.process && 
         window.process.type && 
         window.process.versions && 
         window.process.versions.electron;
};

// 在渲染进程中使用通过 contextBridge 暴露的 API
const ipcRenderer = window.ipcRenderer || {
  send: () => {},
  on: () => {},
  removeListener: () => {}
};

// 串口 API 通过预加载脚本暴露
const serialAPI = window.serialAPI || {
  getPorts: () => Promise.resolve([]),
  open: () => Promise.resolve(),
  send: () => Promise.resolve(),
  close: () => Promise.resolve(),
  onData: () => {},
  onError: () => {}
};

// 确保页面元素存在后再操作
if (document.querySelector("#app")) {
  document.querySelector("#app").style.display = "block";
}
if (document.querySelector("#greet")) {
  document.querySelector("#greet").innerHTML = greet();
}
if (document.querySelector("#env")) {
  document.querySelector("#env").innerHTML = env.name;
}
if (document.querySelector("#electron-version")) {
  // 通过预加载脚本暴露的 API 或检查 window 对象来获取版本信息
  let electronVersion = 'N/A';
  if (safeProcess && safeProcess.versions) {
    electronVersion = safeProcess.versions.electron || 'N/A';
  } else if (window && window.navigator && window.navigator.userAgent) {
    // 从 userAgent 尝试获取 Electron 版本
    const userAgent = window.navigator.userAgent;
    const match = userAgent.match(/Electron\/([\d\.]+)/);
    electronVersion = match ? match[1] : 'N/A';
  }
  document.querySelector("#electron-version").innerHTML = electronVersion;
}

const osMap = {
  win32: "Windows",
  darwin: "macOS",
  linux: "Linux"
};

if (document.querySelector("#os")) {
  // 通过预加载脚本获取平台信息
  let platform = 'unknown';
  if (safeProcess && safeProcess.platform) {
    platform = safeProcess.platform;
  } else {
    // 根据浏览器 userAgent 推断操作系统
    const userAgent = window.navigator.userAgent;
    if (userAgent.indexOf('Win') !== -1) platform = 'win32';
    else if (userAgent.indexOf('Mac') !== -1) platform = 'darwin';
    else if (userAgent.indexOf('Linux') !== -1) platform = 'linux';
    else platform = 'unknown';
  }
  document.querySelector("#os").innerHTML = osMap[platform];
}

// 串口数据展示相关
const serialDataDisplay = document.getElementById('serial-data-display');

// 监听串口数据
if (serialAPI && serialAPI.onData) {
  serialAPI.onData((data) => {
    if (serialDataDisplay) {
      serialDataDisplay.innerHTML += `<div>${data}</div>`;
      // 自动滚动到底部
      serialDataDisplay.scrollTop = serialDataDisplay.scrollHeight;
    }
  });
}

// 监听串口错误
if (serialAPI && serialAPI.onError) {
  serialAPI.onError((error) => {
    if (serialDataDisplay) {
      serialDataDisplay.innerHTML += `<div style="color: red;">错误: ${error}</div>`;
      serialDataDisplay.scrollTop = serialDataDisplay.scrollHeight;
    }
  });
}

// We can communicate with main process through messages.
window.addEventListener('DOMContentLoaded', async () => {
  if (ipcRenderer && ipcRenderer.invoke) {
    try {
      const result = await ipcRenderer.invoke("need-app-path");
      // 处理返回的结果
      console.log('App directory path:', result.appPath);
      if (document.querySelector("#author")) {
        document.querySelector("#author").innerHTML = result.author;
      }
    } catch (error) {
      console.error('获取应用路径失败:', error);
    }
  }
});

// 监听 app-path 事件 (如果通过 send 方式发送)
if (ipcRenderer && ipcRenderer.on) {
  ipcRenderer.on("app-path", (event, appDirPath) => {
    // 由于 fs-jetpack 无法在渲染进程中使用（除非通过预加载脚本暴露），
    // 我们使用 window.fs 或其他通过预加载脚本暴露的 API
    // 这里只是示例，实际实现需要在 preload.js 中暴露 fs API
    console.log('App directory path:', appDirPath);
    // 为了获取 package.json 中的作者信息，我们需要在主进程中完成，然后发送到渲染进程
    // 这里暂时显示一个默认值
    // document.querySelector("#author").innerHTML = '待获取...';
  });
  
  // 监听作者信息事件
  ipcRenderer.on("author-info", (event, author) => {
    if (document.querySelector("#author")) {
      document.querySelector("#author").innerHTML = author;
    }
  });
}

document.addEventListener('click', (event) => {
  if (event.target.classList.contains('electron-external-link')) {
    if (ipcRenderer && ipcRenderer.send) {
      ipcRenderer.send("open-external-link", event.target.href);
      event.preventDefault();
    }
  }
}, true);
