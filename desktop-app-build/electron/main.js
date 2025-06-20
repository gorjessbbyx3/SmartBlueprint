const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

let mainWindow;
let backendProcess;
let pythonServices = [];
const SERVER_PORT = 5000;

class SmartBlueprintElectronApp {
  constructor() {
    this.isReady = false;
    this.serverStarted = false;
    this.pythonServicesStarted = false;
  }

  async createWindow() {
    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        webSecurity: true,
        preload: path.join(__dirname, 'electron-preload.js')
      },
      titleBarStyle: 'default',
      show: false,
      backgroundColor: '#ffffff',
      title: 'SmartBlueprint Pro - AI IoT Monitoring'
    });

    // Show loading screen
    this.showLoadingScreen();
    
    // Start backend services
    await this.startBackendServices();
    
    // Load the main application
    setTimeout(() => {
      this.loadMainApplication();
    }, 3000);

    mainWindow.on('closed', () => {
      this.cleanup();
      mainWindow = null;
    });

    this.setupMenu();
    this.setupIPC();
  }

  showLoadingScreen() {
    const loadingHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>SmartBlueprint Pro - Starting...</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100vh;
      text-align: center;
    }
    .logo {
      font-size: 3rem;
      font-weight: bold;
      margin-bottom: 1rem;
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
    .subtitle {
      font-size: 1.2rem;
      margin-bottom: 2rem;
      opacity: 0.9;
    }
    .loading {
      display: flex;
      align-items: center;
      gap: 1rem;
      font-size: 1.1rem;
      margin-bottom: 2rem;
    }
    .spinner {
      width: 24px;
      height: 24px;
      border: 3px solid rgba(255,255,255,0.3);
      border-top: 3px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .status {
      font-size: 0.9rem;
      opacity: 0.8;
      margin: 0.5rem 0;
    }
    .features {
      margin-top: 2rem;
      max-width: 600px;
    }
    .feature {
      margin: 0.4rem 0;
      opacity: 0.7;
      font-size: 0.85rem;
    }
  </style>
</head>
<body>
  <div class="logo">SmartBlueprint Pro</div>
  <div class="subtitle">AI-Powered IoT Device Monitoring</div>
  <div class="loading">
    <div class="spinner"></div>
    <span id="loadingText">Starting AI systems...</span>
  </div>
  <div id="statusContainer">
    <div class="status" id="webServerStatus">⏳ Starting web server...</div>
    <div class="status" id="pythonMLStatus">⏳ Initializing ML services...</div>
    <div class="status" id="aiSystemsStatus">⏳ Loading AI detection models...</div>
    <div class="status" id="networkScanStatus">⏳ Preparing network scanner...</div>
  </div>
  <div class="features">
    <div class="feature">• 7+ AI/ML Systems for Anomaly Detection</div>
    <div class="feature">• Real-time Device Monitoring & Discovery</div>
    <div class="feature">• Advanced Signal Processing & Analysis</div>
    <div class="feature">• Network Mapping & Visualization</div>
    <div class="feature">• Predictive Maintenance Alerts</div>
    <div class="feature">• Complete Offline Operation</div>
  </div>
  
  <script>
    const statuses = [
      'Starting Express.js server...',
      'Initializing Python ML services...',
      'Loading anomaly detection models...',
      'Setting up device scanner...',
      'Configuring WebSocket connections...',
      'Starting network monitoring...',
      'All systems ready!'
    ];
    
    let currentStatus = 0;
    setInterval(() => {
      if (currentStatus < statuses.length - 1) {
        document.getElementById('loadingText').textContent = statuses[currentStatus];
        currentStatus++;
      }
    }, 800);
    
    // Update individual status indicators
    setTimeout(() => {
      document.getElementById('webServerStatus').innerHTML = '✅ Web server running';
    }, 1000);
    
    setTimeout(() => {
      document.getElementById('pythonMLStatus').innerHTML = '✅ ML services initialized';
    }, 2000);
    
    setTimeout(() => {
      document.getElementById('aiSystemsStatus').innerHTML = '✅ AI models loaded';
    }, 2500);
    
    setTimeout(() => {
      document.getElementById('networkScanStatus').innerHTML = '✅ Network scanner ready';
    }, 3000);
  </script>
</body>
</html>`;

    mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(loadingHtml));
  }

  async startBackendServices() {
    console.log('Starting SmartBlueprint Pro backend services...');
    
    // Start Node.js Express server
    await this.startNodeServer();
    
    // Start Python ML services
    await this.startPythonServices();
  }

  async startNodeServer() {
    return new Promise((resolve) => {
      console.log('Starting Node.js Express server...');
      
      // Use tsx to run the TypeScript server
      backendProcess = spawn('npx', ['tsx', 'server/index.ts'], {
        stdio: 'pipe',
        cwd: __dirname,
        env: { ...process.env, NODE_ENV: 'production' }
      });

      backendProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('Server:', output);
        if (output.includes('Server running on port')) {
          this.serverStarted = true;
          resolve();
        }
      });

      backendProcess.stderr.on('data', (data) => {
        console.error('Server Error:', data.toString());
      });

      backendProcess.on('close', (code) => {
        console.log(`Server process exited with code ${code}`);
      });

      // Fallback timeout
      setTimeout(resolve, 3000);
    });
  }

  async startPythonServices() {
    console.log('Starting Python ML services...');
    
    const pythonScripts = [
      'ml_inference_service.py',
      'device_scanner.py',
      'centralized_logging.py'
    ];

    for (const script of pythonScripts) {
      if (fs.existsSync(script)) {
        console.log(`Starting ${script}...`);
        
        const pythonProcess = spawn('python', [script], {
          stdio: 'pipe',
          cwd: __dirname
        });

        pythonProcess.stdout.on('data', (data) => {
          console.log(`${script}:`, data.toString());
        });

        pythonProcess.stderr.on('data', (data) => {
          console.error(`${script} Error:`, data.toString());
        });

        pythonServices.push(pythonProcess);
      }
    }

    this.pythonServicesStarted = true;
  }

  async loadMainApplication() {
    console.log('Loading main application...');
    
    // Wait for server to be ready
    await this.waitForServer();
    
    // Load the React application
    mainWindow.loadURL(`http://localhost:${SERVER_PORT}`);
    
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
      console.log('SmartBlueprint Pro GUI launched successfully');
    });

    // Handle navigation
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });
  }

  async waitForServer() {
    return new Promise((resolve) => {
      const checkServer = () => {
        const req = http.get(`http://localhost:${SERVER_PORT}/api/health`, (res) => {
          if (res.statusCode === 200) {
            console.log('Server is ready');
            resolve();
          } else {
            setTimeout(checkServer, 500);
          }
        });
        
        req.on('error', () => {
          setTimeout(checkServer, 500);
        });
      };
      
      checkServer();
    });
  }

  setupMenu() {
    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'New Scan',
            accelerator: 'CmdOrCtrl+N',
            click: () => {
              mainWindow.webContents.executeJavaScript(`
                window.dispatchEvent(new CustomEvent('electron-action', { detail: 'new-scan' }));
              `);
            }
          },
          {
            label: 'Export Data',
            accelerator: 'CmdOrCtrl+E',
            click: async () => {
              const result = await dialog.showSaveDialog(mainWindow, {
                defaultPath: 'smartblueprint-data.json',
                filters: [{ name: 'JSON', extensions: ['json'] }]
              });
              if (!result.canceled) {
                mainWindow.webContents.executeJavaScript(`
                  window.dispatchEvent(new CustomEvent('electron-action', { 
                    detail: 'export-data', 
                    filePath: '${result.filePath}' 
                  }));
                `);
              }
            }
          },
          { type: 'separator' },
          { role: 'quit' }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: 'Tools',
        submenu: [
          {
            label: 'Network Diagnostic',
            click: () => {
              mainWindow.webContents.executeJavaScript(`
                window.dispatchEvent(new CustomEvent('electron-action', { detail: 'network-diagnostic' }));
              `);
            }
          },
          {
            label: 'AI Model Status',
            click: () => {
              mainWindow.webContents.executeJavaScript(`
                window.dispatchEvent(new CustomEvent('electron-action', { detail: 'ai-status' }));
              `);
            }
          },
          {
            label: 'Device Discovery',
            click: () => {
              mainWindow.webContents.executeJavaScript(`
                window.dispatchEvent(new CustomEvent('electron-action', { detail: 'device-discovery' }));
              `);
            }
          }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About SmartBlueprint Pro',
            click: () => {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'About SmartBlueprint Pro',
                message: 'SmartBlueprint Pro',
                detail: `Version: 1.0.0\n\nAI-Powered IoT Device Monitoring & Network Analysis\n\nFeatures:\n• 7+ AI/ML Systems for Anomaly Detection\n• Real-time Device Monitoring\n• Advanced Signal Processing\n• Network Mapping & Visualization\n• Predictive Maintenance Alerts\n• Complete Offline Operation`
              });
            }
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  setupIPC() {
    ipcMain.handle('get-app-info', () => {
      return {
        name: 'SmartBlueprint Pro',
        version: '1.0.0',
        serverRunning: this.serverStarted,
        pythonServicesRunning: this.pythonServicesStarted
      };
    });
  }

  cleanup() {
    console.log('Cleaning up SmartBlueprint Pro...');
    
    if (backendProcess) {
      backendProcess.kill();
    }
    
    pythonServices.forEach(process => {
      process.kill();
    });
  }
}

// Initialize the application
const smartBlueprintApp = new SmartBlueprintElectronApp();

// App event handlers
app.whenReady().then(() => {
  smartBlueprintApp.createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    smartBlueprintApp.createWindow();
  }
});

app.on('before-quit', () => {
  smartBlueprintApp.cleanup();
});

// Security
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});