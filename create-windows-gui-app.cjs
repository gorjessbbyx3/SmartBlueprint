#!/usr/bin/env node

/**
 * SmartBlueprint Pro - Windows GUI Desktop Application Builder
 * Creates a proper Windows application with graphical interface using Electron
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🏗️  Building SmartBlueprint Pro Windows GUI Application...');

// Create Electron main process file
const electronMain = `
const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const express = require('express');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;
const SERVER_PORT = 3000;

// Enhanced application configuration
const APP_CONFIG = {
  name: 'SmartBlueprint Pro',
  version: '1.0.0',
  description: 'AI-Powered IoT Device Monitoring & Network Analysis',
  author: 'GorJess & Co.',
  features: [
    '7+ AI/ML Systems for Anomaly Detection',
    'Real-time Device Monitoring',
    'Advanced Signal Processing',
    'Network Mapping & Visualization',
    'Predictive Maintenance Alerts',
    'Complete Offline Operation'
  ]
};

function createWindow() {
  // Create the browser window with enhanced configuration
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    },
    titleBarStyle: 'default',
    show: false, // Don't show until ready
    backgroundColor: '#ffffff',
    titleBarOverlay: {
      color: '#2563eb',
      symbolColor: '#ffffff'
    }
  });

  // Load the app URL
  const startUrl = \`http://localhost:\${SERVER_PORT}\`;
  
  // Show loading screen while server starts
  mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(\`
    <!DOCTYPE html>
    <html>
      <head>
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
          .features {
            margin-top: 3rem;
            max-width: 600px;
          }
          .feature {
            margin: 0.5rem 0;
            opacity: 0.8;
            font-size: 0.9rem;
          }
        </style>
      </head>
      <body>
        <div class="logo">SmartBlueprint Pro</div>
        <div class="subtitle">AI-Powered IoT Device Monitoring</div>
        <div class="loading">
          <div class="spinner"></div>
          <span>Starting AI systems and web interface...</span>
        </div>
        <div class="features">
          <div class="feature">• 7+ AI/ML Systems for Anomaly Detection</div>
          <div class="feature">• Real-time Device Monitoring & Discovery</div>
          <div class="feature">• Advanced Signal Processing & Analysis</div>
          <div class="feature">• Network Mapping & Visualization</div>
          <div class="feature">• Predictive Maintenance Alerts</div>
          <div class="feature">• Complete Offline Operation</div>
        </div>
      </body>
    </html>
  \`));

  // Start the server and load the actual app
  setTimeout(() => {
    startServer(() => {
      mainWindow.loadURL(startUrl);
      
      // Show window when ready
      mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        console.log('SmartBlueprint Pro GUI launched successfully');
      });
    });
  }, 2000);

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Create application menu
  createMenu();
}

function startServer(callback) {
  console.log('Starting SmartBlueprint Pro server...');
  
  // Start the Express server as a child process
  const serverScript = path.join(__dirname, 'server.js');
  
  if (fs.existsSync(serverScript)) {
    serverProcess = spawn('node', [serverScript], {
      stdio: 'pipe',
      cwd: __dirname
    });
    
    serverProcess.stdout.on('data', (data) => {
      console.log(\`Server: \${data}\`);
    });
    
    serverProcess.stderr.on('data', (data) => {
      console.error(\`Server Error: \${data}\`);
    });
    
    // Wait for server to start
    setTimeout(callback, 3000);
  } else {
    console.error('Server script not found, starting basic server...');
    startBasicServer(callback);
  }
}

function startBasicServer(callback) {
  const express = require('express');
  const app = express();
  
  // Serve static files
  app.use(express.static(path.join(__dirname, 'dist')));
  
  // Basic API endpoints
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: APP_CONFIG.name });
  });
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
  
  app.listen(SERVER_PORT, () => {
    console.log(\`SmartBlueprint Pro server running on port \${SERVER_PORT}\`);
    callback();
  });
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Scan',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('action', 'new-scan');
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
              mainWindow.webContents.send('action', 'export-data', result.filePath);
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
            mainWindow.webContents.send('action', 'network-diagnostic');
          }
        },
        {
          label: 'AI Model Status',
          click: () => {
            mainWindow.webContents.send('action', 'ai-status');
          }
        },
        {
          label: 'Device Discovery',
          click: () => {
            mainWindow.webContents.send('action', 'device-discovery');
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
              message: APP_CONFIG.name,
              detail: \`Version: \${APP_CONFIG.version}\\n\\n\${APP_CONFIG.description}\\n\\nFeatures:\\n\${APP_CONFIG.features.map(f => '• ' + f).join('\\n')}\`
            });
          }
        },
        {
          label: 'Documentation',
          click: () => {
            shell.openExternal('https://github.com/smartblueprint/docs');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});
`;

// Create package.json for the Windows app
const packageJson = {
  name: "smartblueprint-pro-desktop",
  version: "1.0.0",
  description: "SmartBlueprint Pro Windows Desktop Application",
  main: "electron-main.js",
  scripts: {
    start: "electron .",
    build: "electron-builder",
    dist: "electron-builder --win"
  },
  dependencies: {
    express: "^4.18.0"
  },
  devDependencies: {
    electron: "^25.0.0",
    "electron-builder": "^24.0.0"
  },
  build: {
    appId: "com.gorjess.smartblueprint-pro",
    productName: "SmartBlueprint Pro",
    directories: {
      output: "dist-windows"
    },
    files: [
      "**/*",
      "!node_modules",
      "!src",
      "!tests"
    ],
    win: {
      target: "nsis",
      icon: "assets/icon.ico"
    },
    nsis: {
      oneClick: false,
      allowToChangeInstallationDirectory: true,
      createDesktopShortcut: true,
      createStartMenuShortcut: true
    }
  }
};

// Create the Windows GUI application structure
const windowsAppDir = 'SmartBlueprint-Windows-GUI';

try {
  // Create directory structure
  if (!fs.existsSync(windowsAppDir)) {
    fs.mkdirSync(windowsAppDir, { recursive: true });
  }

  // Create subdirectories
  fs.mkdirSync(path.join(windowsAppDir, 'assets'), { recursive: true });
  fs.mkdirSync(path.join(windowsAppDir, 'dist'), { recursive: true });

  // Write main Electron file
  fs.writeFileSync(path.join(windowsAppDir, 'electron-main.js'), electronMain);

  // Write package.json
  fs.writeFileSync(
    path.join(windowsAppDir, 'package.json'), 
    JSON.stringify(packageJson, null, 2)
  );

  // Copy web application files
  if (fs.existsSync('dist')) {
    console.log('Copying web application files...');
    execSync(`cp -r dist/* ${windowsAppDir}/dist/`, { stdio: 'inherit' });
  }

  // Create a simple server.js for the embedded server
  const serverJs = `
const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// API endpoints
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    app: 'SmartBlueprint Pro',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Serve the main app for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log('SmartBlueprint Pro server started on port', PORT);
});
`;

  fs.writeFileSync(path.join(windowsAppDir, 'server.js'), serverJs);

  // Create application icon (simple SVG to ICO conversion placeholder)
  const iconSvg = `<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
    <rect width="256" height="256" fill="#2563eb"/>
    <text x="128" y="140" text-anchor="middle" fill="white" font-family="Arial" font-size="48" font-weight="bold">SBP</text>
    <text x="128" y="180" text-anchor="middle" fill="white" font-family="Arial" font-size="16">AI IoT Monitor</text>
  </svg>`;
  
  fs.writeFileSync(path.join(windowsAppDir, 'assets', 'icon.svg'), iconSvg);

  // Create launcher script
  const launcherScript = `@echo off
title SmartBlueprint Pro - AI IoT Monitoring
echo Starting SmartBlueprint Pro Desktop Application...
echo.
echo Features:
echo • 7+ AI/ML Systems for Anomaly Detection
echo • Real-time Device Monitoring
echo • Advanced Signal Processing
echo • Network Mapping and Visualization
echo • Predictive Maintenance Alerts
echo.
echo Starting GUI application...
cd /d "%~dp0"
npm start
`;

  fs.writeFileSync(path.join(windowsAppDir, 'launch.bat'), launcherScript);

  // Create installation instructions
  const installInstructions = `# SmartBlueprint Pro - Windows GUI Application

## Quick Start
1. Double-click 'launch.bat' to start the application
2. The GUI will open automatically with the full interface

## Manual Installation
1. Install Node.js from https://nodejs.org (if not already installed)
2. Open Command Prompt in this directory
3. Run: npm install
4. Run: npm start

## Features
- Complete graphical user interface
- Embedded web application with full functionality
- Native Windows integration
- 7+ AI/ML systems for device monitoring
- Real-time network analysis
- Offline operation capability

## System Requirements
- Windows 10/11 (64-bit)
- 4GB RAM minimum
- Node.js 16+ (automatically bundled in distributed version)

The application will start a local server and open in a native Windows window.
`;

  fs.writeFileSync(path.join(windowsAppDir, 'README.md'), installInstructions);

  console.log('✅ Windows GUI Application created successfully!');
  console.log(`📁 Location: ${windowsAppDir}/`);
  console.log('🚀 To run: cd ' + windowsAppDir + ' && npm install && npm start');
  
  // Try to install dependencies and build
  process.chdir(windowsAppDir);
  
  console.log('📦 Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  
  console.log('🏗️  Building Windows executable...');
  try {
    execSync('npm run dist', { stdio: 'inherit' });
    console.log('✅ Windows executable built successfully!');
  } catch (buildError) {
    console.log('⚠️  Executable build failed, but GUI app is ready to run with npm start');
  }

} catch (error) {
  console.error('❌ Error creating Windows GUI application:', error.message);
  process.exit(1);
}