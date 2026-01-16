import { app } from 'electron';
import jetpack from 'fs-jetpack';

// Default serial configuration
const DEFAULT_CONFIG = {
  port: process.platform === 'win32' ? 'COM1' : '/dev/ttyUSB0', // Default for Windows vs Unix-like
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: 'none'
};

// Get user data directory path for storing serial config
const getUserDataPath = () => {
  return jetpack.cwd(app.getPath('userData'));
};

// Load serial configuration from file
const loadSerialConfig = () => {
  const userDataDir = getUserDataPath();
  const configPath = 'serial-config.json';
  
  try {
    const config = userDataDir.read(configPath, 'json');
    return config || DEFAULT_CONFIG;
  } catch (error) {
    // If config file doesn't exist, return defaults
    return DEFAULT_CONFIG;
  }
};

// Save serial configuration to file
const saveSerialConfig = (config) => {
  const userDataDir = getUserDataPath();
  const configPath = 'serial-config.json';
  
  try {
    userDataDir.write(configPath, config, { atomic: true });
    return { success: true, message: 'Configuration saved successfully' };
  } catch (error) {
    return { success: false, message: `Failed to save configuration: ${error.message}` };
  }
};

module.exports = { loadSerialConfig, saveSerialConfig };