// 心跳相关方法类
class HeartbeatManager {
    constructor(api, state, addLog, showNotification, updateUI) {
        this.api = api;
        this.state = state;
        this.addLog = addLog;
        this.showNotification = showNotification;
        this.updateUI = updateUI;
    }

    getHeartbeatConfig() {
        return {
            enabled: document.getElementById('heartbeatEnabled')?.checked || false,
            interval: parseInt(document.getElementById('heartbeatInterval')?.value || '30') * 1000,
            message: document.getElementById('heartbeatMessage')?.value || 'AT',
            maxReconnectAttempts: parseInt(document.getElementById('maxReconnectAttempts')?.value || '10')
        };
    }

    async startHeartbeatMonitoring(config) {
        try {
            if (!config.enabled) return;
            await this.api.startHeartbeat(config);
            this.addLog({ type: 'system', data: `心跳检查已启动，间隔: ${config.interval/1000}秒` });
        } catch (error) {
            this.showNotification(`启动心跳检查失败: ${error.message}`, 'error');
        }
    }

    async stopHeartbeatMonitoring() {
        try {
            await this.api.stopHeartbeat();
            this.addLog({ type: 'system', data: '心跳检查已停止' });
        } catch (error) {
            console.error('停止心跳检查失败:', error);
        }
    }

    setupHeartbeatListeners() {
        this.api.onHeartbeatSent((data) => {
            this.addLog({ type: 'system', data: `心跳已发送: ${data.message}` });
        });

        this.api.onHeartbeatResponse((data) => {
            const timestamp = new Date().toLocaleTimeString();
            const statusElement = document.getElementById('heartbeatStatus');
            const timeElement = document.getElementById('lastHeartbeatTime');
            
            if (statusElement) {
                statusElement.textContent = '正常';
                statusElement.className = 'status-value heartbeat-active';
            }
            if (timeElement) {
                timeElement.textContent = timestamp;
            }
            this.addLog({ type: 'system', data: `心跳响应正常` });
        });

        this.api.onHeartbeatFailed((data) => {
            const statusElement = document.getElementById('heartbeatStatus');
            if (statusElement) {
                statusElement.textContent = '失败';
                statusElement.className = 'status-value heartbeat-warning';
            }
            this.addLog({ type: 'system', data: `心跳检查失败: ${data.error}` });
        });

        this.api.onReconnectAttempt((data) => {
            const attemptCount = data.attempt || '未知';
            const attemptsElement = document.getElementById('reconnectAttempts');
            if (attemptsElement) {
                attemptsElement.textContent = attemptCount;
            }
            this.addLog({ type: 'system', data: `正在尝试重连 (第${attemptCount}次)...` });
        });

        this.api.onReconnectSuccess((data) => {
            const statusElement = document.getElementById('heartbeatStatus');
            if (statusElement) {
                statusElement.textContent = '重连成功';
                statusElement.className = 'status-value heartbeat-active';
            }
            this.addLog({ type: 'system', data: '重连成功！' });
        });

        this.api.onReconnectFailed((data) => {
            const statusElement = document.getElementById('heartbeatStatus');
            if (statusElement) {
                statusElement.textContent = '重连失败';
                statusElement.className = 'status-value heartbeat-inactive';
            }
            this.addLog({ type: 'system', data: `重连失败: ${data.error}` });
            this.showNotification('已达到最大重连次数，请检查设备连接', 'error');
        });
    }

    async checkConnectionStatus() {
        try {
            const status = await this.api.getConnectionStatus();
            this.state.isConnected = status.isConnected;
            
            if (status.isConnected && status.port) {
                this.state.selectedDevice = { path: status.port };
                this.updateUI();
                
                const heartbeatConfig = this.getHeartbeatConfig();
                if (heartbeatConfig.enabled) {
                    await this.startHeartbeatMonitoring(heartbeatConfig);
                }
            }
        } catch (error) {
            console.error('检查连接状态失败:', error);
        }
    }

    async attemptAutoReconnect() {
        try {
            const saved = localStorage.getItem('serialAppState');
            if (saved) {
                const state = JSON.parse(saved);
                const lastDevice = state.state?.selectedDevice;
                const connectionOptions = state.state?.connectionOptions || this.state.connectionOptions;
                
                if (lastDevice && !this.state.isConnected) {
                    this.addLog({ type: 'system', data: '尝试自动重连到最后一个设备...' });
                    
                    try {
                        this.state.selectedDevice = lastDevice;
                        this.state.connectionOptions = connectionOptions;
                        
                        const result = await this.api.connectSerial({
                            port: lastDevice.path,
                            options: connectionOptions,
                            heartbeatConfig: this.getHeartbeatConfig()
                        });

                        if (result.success) {
                            this.addLog({ type: 'system', data: '自动重连成功！' });
                            this.showNotification('自动重连成功', 'success');
                        }
                    } catch (error) {
                        this.addLog({ type: 'system', data: `自动重连失败: ${error.message}` });
                    }
                }
            }
        } catch (error) {
            console.error('自动重连失败:', error);
        }
    }
}