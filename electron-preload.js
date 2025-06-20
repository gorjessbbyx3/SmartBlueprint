const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  showSaveDialog: () => ipcRenderer.invoke('show-save-dialog'),
  showOpenDialog: () => ipcRenderer.invoke('show-open-dialog'),
  
  // Platform detection
  platform: process.platform,
  
  // Node.js version info
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
});

// Expose a safe way to send data to main process
contextBridge.exposeInMainWorld('smartBlueprint', {
  isElectron: true,
  environment: 'desktop',
  
  // Safe IPC communication
  sendMessage: (channel, data) => {
    const validChannels = ['device-scan', 'export-data', 'import-data'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  
  // Listen for messages from main process
  onMessage: (channel, callback) => {
    const validChannels = ['scan-complete', 'data-exported', 'data-imported'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    }
  },
  
  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});