const { contextBridge, ipcRenderer } = require('electron');

/**
 * SmartBlueprint Pro - Electron Preload Script
 * Secure bridge between main process and renderer
 */

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Agent status and control
  getAgentStatus: () => ipcRenderer.invoke('get-agent-status'),
  triggerNetworkScan: () => ipcRenderer.invoke('trigger-network-scan'),
  
  // Platform information
  platform: process.platform,
  isDesktop: true,
  
  // Version information
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },
  
  // Event listeners
  onMenuCommand: (callback) => {
    ipcRenderer.on('menu-command', callback);
  },
  
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// Desktop-specific globals
contextBridge.exposeInMainWorld('DESKTOP_MODE', true);
contextBridge.exposeInMainWorld('LOCAL_AGENT', true);