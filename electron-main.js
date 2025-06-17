const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const os = require('os');

/**
 * SmartBlueprint Pro - Desktop Application
 * Complete standalone desktop version with integrated local agent
 */

class SmartBlueprintDesktop {
  constructor() {
    this.mainWindow = null;
    this.serverProcess = null;
    this.agentProcess = null;
    this.isQuitting = false;
    this.serverPort = 5000;
    this.agentId = `desktop-${os.hostname()}-${Date.now()}`;
  }

  async initialize() {
    await app.whenReady();
    
    // Create application menu
    this.createMenu();
    
    // Start local server
    await this.startLocalServer();
    
    // Start monitoring agent
    await this.startMonitoringAgent();
    
    // Create main window
    this.createMainWindow();
    
    // Handle app events
    this.setupEventHandlers();
  }

  createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 700,
      icon: path.join(__dirname, 'assets', 'icon.png'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'electron-preload.js')
      },
      titleBarStyle: 'default',
      show: false
    });

    // Load the local application
    this.mainWindow.loadURL(`http://localhost:${this.serverPort}`);

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      
      // Open DevTools in development
      if (process.env.NODE_ENV === 'development') {
        this.mainWindow.webContents.openDevTools();
      }
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Handle external links
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });
  }

  async startLocalServer() {
    return new Promise((resolve, reject) => {
      console.log('[Desktop] Starting local SmartBlueprint server...');
      
      // Start the Express server
      this.serverProcess = spawn('node', [
        path.join(__dirname, 'server', 'index.js')
      ], {
        env: {
          ...process.env,
          NODE_ENV: 'desktop',
          PORT: this.serverPort,
          DESKTOP_MODE: 'true'
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.serverProcess.stdout.on('data', (data) => {
        console.log(`[Server] ${data.toString().trim()}`);
      });

      this.serverProcess.stderr.on('data', (data) => {
        console.error(`[Server Error] ${data.toString().trim()}`);
      });

      this.serverProcess.on('error', (error) => {
        console.error('[Desktop] Failed to start server:', error);
        reject(error);
      });

      // Wait for server to be ready
      setTimeout(() => {
        console.log('[Desktop] Server started successfully');
        resolve();
      }, 3000);
    });
  }

  async startMonitoringAgent() {
    console.log('[Desktop] Starting integrated monitoring agent...');
    
    // Create embedded agent configuration
    const agentConfig = {
      wsUrl: `ws://localhost:${this.serverPort}/ws`,
      agentId: this.agentId,
      mode: 'desktop',
      pingInterval: 30000,
      deviceScanInterval: 60000
    };

    // Start the monitoring agent as integrated process
    this.agentProcess = spawn('node', [
      path.join(__dirname, 'desktop-agent-embedded.js')
    ], {
      env: {
        ...process.env,
        AGENT_CONFIG: JSON.stringify(agentConfig)
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.agentProcess.stdout.on('data', (data) => {
      console.log(`[Agent] ${data.toString().trim()}`);
    });

    this.agentProcess.stderr.on('data', (data) => {
      console.error(`[Agent Error] ${data.toString().trim()}`);
    });

    this.agentProcess.on('error', (error) => {
      console.error('[Desktop] Agent error:', error);
    });

    console.log('[Desktop] Monitoring agent started');
  }

  createMenu() {
    const template = [
      {
        label: 'SmartBlueprint',
        submenu: [
          {
            label: 'About SmartBlueprint Pro',
            click: () => {
              dialog.showMessageBox(this.mainWindow, {
                type: 'info',
                title: 'About SmartBlueprint Pro',
                message: 'SmartBlueprint Pro Desktop',
                detail: 'Smart Home Device Mapping and Network Optimization Platform\n\nVersion: 1.0.0\nDesktop Edition'
              });
            }
          },
          { type: 'separator' },
          {
            label: 'Preferences',
            accelerator: 'CmdOrCtrl+,',
            click: () => {
              // Open preferences in main window
              this.mainWindow.webContents.executeJavaScript(`
                window.location.hash = '/settings';
              `);
            }
          },
          { type: 'separator' },
          {
            label: 'Quit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              this.isQuitting = true;
              app.quit();
            }
          }
        ]
      },
      {
        label: 'View',
        submenu: [
          {
            label: 'Dashboard',
            accelerator: 'CmdOrCtrl+1',
            click: () => {
              this.mainWindow.webContents.executeJavaScript(`
                window.location.hash = '/';
              `);
            }
          },
          {
            label: 'Device Discovery',
            accelerator: 'CmdOrCtrl+2',
            click: () => {
              this.mainWindow.webContents.executeJavaScript(`
                window.location.hash = '/device-discovery';
              `);
            }
          },
          {
            label: 'Network Analysis',
            accelerator: 'CmdOrCtrl+3',
            click: () => {
              this.mainWindow.webContents.executeJavaScript(`
                window.location.hash = '/analytics';
              `);
            }
          },
          {
            label: 'AI Insights',
            accelerator: 'CmdOrCtrl+4',
            click: () => {
              this.mainWindow.webContents.executeJavaScript(`
                window.location.hash = '/ai-insights';
              `);
            }
          },
          { type: 'separator' },
          {
            label: 'Reload',
            accelerator: 'CmdOrCtrl+R',
            click: () => {
              this.mainWindow.reload();
            }
          },
          {
            label: 'Force Reload',
            accelerator: 'CmdOrCtrl+Shift+R',
            click: () => {
              this.mainWindow.webContents.reloadIgnoringCache();
            }
          },
          {
            label: 'Toggle Developer Tools',
            accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
            click: () => {
              this.mainWindow.webContents.toggleDevTools();
            }
          }
        ]
      },
      {
        label: 'Network',
        submenu: [
          {
            label: 'Scan Network Now',
            accelerator: 'CmdOrCtrl+S',
            click: () => {
              // Trigger network scan
              this.triggerNetworkScan();
            }
          },
          {
            label: 'Ping Test',
            accelerator: 'CmdOrCtrl+P',
            click: () => {
              this.mainWindow.webContents.executeJavaScript(`
                window.location.hash = '/ping-monitoring';
              `);
            }
          },
          { type: 'separator' },
          {
            label: 'Agent Status',
            click: () => {
              this.showAgentStatus();
            }
          }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'User Guide',
            click: () => {
              shell.openExternal('https://smartplueprint.replit.app/help');
            }
          },
          {
            label: 'Report Issue',
            click: () => {
              shell.openExternal('https://github.com/smartblueprint/issues');
            }
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  setupEventHandlers() {
    // Handle all windows closed
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.cleanup();
        app.quit();
      }
    });

    // Handle app activate (macOS)
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });

    // Handle before quit
    app.on('before-quit', () => {
      this.isQuitting = true;
      this.cleanup();
    });

    // IPC handlers
    ipcMain.handle('get-agent-status', () => {
      return {
        agentId: this.agentId,
        connected: this.agentProcess && !this.agentProcess.killed,
        serverRunning: this.serverProcess && !this.serverProcess.killed
      };
    });

    ipcMain.handle('trigger-network-scan', () => {
      this.triggerNetworkScan();
    });
  }

  triggerNetworkScan() {
    if (this.agentProcess && !this.agentProcess.killed) {
      // Send scan command to agent
      this.agentProcess.stdin.write('SCAN_NOW\n');
      console.log('[Desktop] Network scan triggered');
    }
  }

  showAgentStatus() {
    const status = {
      agentId: this.agentId,
      serverRunning: this.serverProcess && !this.serverProcess.killed,
      agentRunning: this.agentProcess && !this.agentProcess.killed,
      platform: os.platform(),
      hostname: os.hostname()
    };

    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Agent Status',
      message: 'SmartBlueprint Desktop Agent Status',
      detail: `Agent ID: ${status.agentId}\nServer: ${status.serverRunning ? 'Running' : 'Stopped'}\nAgent: ${status.agentRunning ? 'Running' : 'Stopped'}\nPlatform: ${status.platform}\nHostname: ${status.hostname}`
    });
  }

  cleanup() {
    console.log('[Desktop] Cleaning up processes...');
    
    if (this.serverProcess && !this.serverProcess.killed) {
      this.serverProcess.kill();
      console.log('[Desktop] Server process terminated');
    }
    
    if (this.agentProcess && !this.agentProcess.killed) {
      this.agentProcess.kill();
      console.log('[Desktop] Agent process terminated');
    }
  }
}

// Create and initialize the desktop application
const smartBlueprintDesktop = new SmartBlueprintDesktop();

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window instead
    if (smartBlueprintDesktop.mainWindow) {
      if (smartBlueprintDesktop.mainWindow.isMinimized()) {
        smartBlueprintDesktop.mainWindow.restore();
      }
      smartBlueprintDesktop.mainWindow.focus();
    }
  });

  // Initialize when ready
  smartBlueprintDesktop.initialize().catch(console.error);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[Desktop] Uncaught exception:', error);
  dialog.showErrorBox('Application Error', `An unexpected error occurred: ${error.message}`);
});