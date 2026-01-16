// preload.js (预加载脚本)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('serialAPI', {
    getPorts: () => ipcRenderer.invoke('serial:getPorts'),
    open: (config) => ipcRenderer.invoke('serial:open', config),
    send: (data) => ipcRenderer.invoke('serial:send', data),
    close: () => ipcRenderer.invoke('serial:close'),
    onData: (callback) => ipcRenderer.on('serial:data', (event, data) => callback(data)),
    onError: (callback) => ipcRenderer.on('serial:error', (event, error) => callback(error)),
    // 获取串口列表
    getSerialPorts: () => ipcRenderer.invoke('get-serial-ports'),

    // 连接串口
    connectSerial: (port, options) => ipcRenderer.invoke('connect-serial', { port, options }),

    // 断开连接
    disconnectSerial: () => ipcRenderer.invoke('disconnect-serial'),

    // 发送数据
    sendData: (data) => ipcRenderer.invoke('send-data', data),

    // 保存数据
    saveData: (filename, data) => ipcRenderer.invoke('save-data', { filename, data }),


    // 测试连接
    testConnection: (port, options) => ipcRenderer.invoke('test-connection', { port, options }),

    // 监听串口数据
    onSerialData: (callback) => ipcRenderer.on('serial-data', (event, data) => callback(data)),

    // 监听连接成功
    onSerialConnected: (callback) => ipcRenderer.on('serial-connected', (event, data) => callback(data)),

    // 监听断开连接
    onSerialDisconnected: (callback) => ipcRenderer.on('serial-disconnected', () => callback()),

    // 监听错误
    onSerialError: (callback) => ipcRenderer.on('serial-error', (event, error) => callback(error)),
    // 获取连接状态
    getConnectionStatus: () => ipcRenderer.invoke('get-connection-status'),
    // 监听配置数据
    onConfigData: (data) => ipcRenderer.on('config-data', data),
    // 发送配置数据
    sendConfigData: (data) => ipcRenderer.invoke('send_config', data),
    // 移除监听器
    removeAllListeners: () => {
        ipcRenderer.removeAllListeners('serial-data');
        ipcRenderer.removeAllListeners('serial-connected');
        ipcRenderer.removeAllListeners('serial-disconnected');
        ipcRenderer.removeAllListeners('serial-error');
    }
});

// 暴露 ipcRenderer 的基本功能（谨慎使用，仅用于开发目的）
contextBridge.exposeInMainWorld('ipcRenderer', {
    send: (channel, data) => {
        // 对于 send 类型的消息，使用 send 而不是 invoke
        ipcRenderer.send(channel, data);
    },
    on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(event, ...args)),
    invoke: (channel, data) => ipcRenderer.invoke(channel, data),
    removeListener: (channel, func) => ipcRenderer.removeListener(channel, func)
});

// 暴露 process 对象的必要信息
contextBridge.exposeInMainWorld('process', {
    platform: process.platform,
    versions: {
        electron: process.versions.electron,
        node: process.versions.node
    }
});