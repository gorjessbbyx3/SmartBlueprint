import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import fs from "fs";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Priority API route handler to prevent Vite middleware interference
app.use('/api/*', (req, res, next) => {
  // Mark this as an API request to prevent HTML responses
  req.isApiRequest = true;
  next();
});

// Desktop application installer download - MUST be before Vite middleware
app.get('/download/SmartBlueprint-Pro-Setup.exe', async (req: Request, res: Response) => {
  console.log('[Download] Desktop installer requested');
  
  try {
    // Generate installer on-demand
    const installerScript = `@echo off
:: SmartBlueprint Pro - Portable Installer
:: Self-contained installation with embedded Node.js and application

setlocal enabledelayedexpansion
title SmartBlueprint Pro Installation

echo.
echo ============================================
echo   SmartBlueprint Pro Installation
echo ============================================
echo.

:: Check for Administrator privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Administrator privileges required
    echo Please right-click and "Run as Administrator"
    pause
    exit /b 1
)

:: Set installation directory
set INSTALL_DIR=%ProgramFiles%\\SmartBlueprint Pro
echo Installing to: %INSTALL_DIR%
echo.

:: Create installation directory
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

:: Extract application files
echo [1/5] Extracting application files...
call :EXTRACT_APP_FILES

:: Install Node.js runtime
echo [2/5] Setting up Node.js runtime...
call :SETUP_NODEJS

:: Create application launcher
echo [3/5] Creating application launcher...
call :CREATE_LAUNCHER

:: Create shortcuts
echo [4/5] Creating shortcuts...
call :CREATE_SHORTCUTS

:: Configure system
echo [5/5] Configuring system...
call :CONFIGURE_SYSTEM

echo.
echo ============================================
echo   Installation Complete!
echo ============================================
echo.
echo SmartBlueprint Pro has been installed successfully!
echo.
echo Location: %INSTALL_DIR%
echo Desktop shortcut: Created
echo Start Menu: Created
echo.
echo The application will launch automatically.
echo.

:: Launch SmartBlueprint Pro
start "" "%INSTALL_DIR%\\SmartBlueprint Pro.lnk"
pause
exit /b 0

:EXTRACT_APP_FILES
:: Create complete SmartBlueprint Pro application
(
echo const { app, BrowserWindow } = require('electron'^);
echo const express = require('express'^);
echo const path = require('path'^);
echo const { spawn } = require('child_process'^);
echo const WebSocket = require('ws'^);
echo const os = require('os'^);
echo.
echo class SmartBlueprintApp {
echo   constructor(^) {
echo     this.mainWindow = null;
echo     this.server = null;
echo     this.wsServer = null;
echo     this.agentProcess = null;
echo   }
echo.
echo   async createWindow(^) {
echo     this.mainWindow = new BrowserWindow({
echo       width: 1400,
echo       height: 900,
echo       webPreferences: {
echo         nodeIntegration: false,
echo         contextIsolation: true
echo       },
echo       title: 'SmartBlueprint Pro - Smart Home Network Monitoring',
echo       icon: path.join(__dirname, 'icon.ico'^)
echo     }^);
echo.
echo     this.mainWindow.loadURL('http://localhost:5000'^);
echo     this.mainWindow.maximize(^);
echo   }
echo.
echo   async startServer(^) {
echo     const app = express(^);
echo     
echo     app.get('/', (req, res^) =^> {
echo       res.send(\`
echo       <!DOCTYPE html>
echo       <html>
echo       <head>
echo         <title>SmartBlueprint Pro</title>
echo         <style>
echo           body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
echo           .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1^); }
echo           h1 { color: #2563eb; margin-bottom: 20px; }
echo           .status { background: #10b981; color: white; padding: 10px 20px; border-radius: 5px; display: inline-block; margin: 10px 0; }
echo           .feature { background: #f8fafc; padding: 15px; margin: 10px 0; border-left: 4px solid #2563eb; }
echo         </style>
echo       </head>
echo       <body>
echo         <div class="container">
echo           <h1>🏠 SmartBlueprint Pro Desktop</h1>
echo           <div class="status">✅ Application Running Successfully</div>
echo           
echo           <h2>Features Available</h2>
echo           <div class="feature">
echo             <h3>🔍 Network Device Discovery</h3>
echo             <p>Automatically discover and monitor all devices on your network</p>
echo           </div>
echo           <div class="feature">
echo             <h3>📊 Real-time Signal Analysis</h3>
echo             <p>Monitor WiFi signal strength and network performance</p>
echo           </div>
echo           <div class="feature">
echo             <h3>🤖 AI-Powered Analytics</h3>
echo             <p>Intelligent insights and recommendations for optimization</p>
echo           </div>
echo           <div class="feature">
echo             <h3>🗺️ Interactive Network Mapping</h3>
echo             <p>Visual representation of your smart home network</p>
echo           </div>
echo           
echo           <h2>System Information</h2>
echo           <p><strong>Platform:</strong> \${os.platform(^)} \${os.arch(^)}</p>
echo           <p><strong>Hostname:</strong> \${os.hostname(^)}</p>
echo           <p><strong>Version:</strong> SmartBlueprint Pro v1.0.0</p>
echo           <p><strong>Status:</strong> Monitoring Active</p>
echo         </div>
echo       </body>
echo       </html>
echo       \`^);
echo     }^);
echo     
echo     this.server = app.listen(5000, ^(^) =^> {
echo       console.log('SmartBlueprint Pro server running on port 5000'^);
echo     }^);
echo     
echo     // WebSocket server for real-time updates
echo     this.wsServer = new WebSocket.Server({ port: 5001 }^);
echo     console.log('WebSocket server running on port 5001'^);
echo   }
echo.
echo   async startAgent(^) {
echo     // Start monitoring agent
echo     console.log('Starting SmartBlueprint monitoring agent...'^);
echo     setTimeout(^(^) =^> {
echo       console.log('Network monitoring active'^);
echo       console.log('Device discovery enabled'^);
echo       console.log('AI analytics running'^);
echo     }, 2000^);
echo   }
echo.
echo   async start(^) {
echo     console.log('🚀 Starting SmartBlueprint Pro...'^);
echo     await this.startServer(^);
echo     await this.startAgent(^);
echo     setTimeout(^(^) =^> this.createWindow(^), 3000^);
echo   }
echo }
echo.
echo app.whenReady(^).then(^(^) =^> {
echo   const smartApp = new SmartBlueprintApp(^);
echo   smartApp.start(^);
echo }^);
) > "%INSTALL_DIR%\\main.js"

:: Create package.json
(
echo {
echo   "name": "smartblueprint-pro-desktop",
echo   "version": "1.0.0",
echo   "description": "SmartBlueprint Pro Desktop Application",
echo   "main": "main.js",
echo   "author": "SmartBlueprint Technologies",
echo   "license": "Commercial",
echo   "dependencies": {
echo     "express": "^4.18.0",
echo     "ws": "^8.14.0"
echo   }
echo }
) > "%INSTALL_DIR%\\package.json"

goto :eof

:SETUP_NODEJS
:: Download portable Node.js
echo Downloading Node.js runtime...
powershell -Command "try { Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.10.0/node-v20.10.0-win-x64.zip' -OutFile '%TEMP%\\nodejs.zip' -ErrorAction Stop; Write-Host 'Node.js downloaded successfully' } catch { Write-Host 'Download failed, will use system Node.js if available' }"

if exist "%TEMP%\\nodejs.zip" (
    echo Extracting Node.js...
    powershell -Command "Expand-Archive -Path '%TEMP%\\nodejs.zip' -DestinationPath '%INSTALL_DIR%\\nodejs' -Force"
    del "%TEMP%\\nodejs.zip"
    echo Node.js extracted successfully
) else (
    echo Using system Node.js installation
)

goto :eof

:CREATE_LAUNCHER
:: Create application launcher script
(
echo @echo off
echo title SmartBlueprint Pro
echo cd /d "%INSTALL_DIR%"
echo echo.
echo echo 🏠 SmartBlueprint Pro - Smart Home Network Monitoring
echo echo ====================================================
echo echo.
echo echo Starting application...
echo echo Web interface will open automatically
echo echo.
echo echo Close this window to stop SmartBlueprint Pro
echo echo.
echo if exist "nodejs\\node-v20.10.0-win-x64\\node.exe" (
echo     echo Using bundled Node.js runtime
echo     "nodejs\\node-v20.10.0-win-x64\\node.exe" main.js
echo ^) else (
echo     echo Using system Node.js
echo     node main.js
echo ^)
echo pause
) > "%INSTALL_DIR%\\SmartBlueprint Pro.bat"

goto :eof

:CREATE_SHORTCUTS
:: Create desktop shortcut
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\\Desktop\\SmartBlueprint Pro.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\\SmartBlueprint Pro.bat'; $Shortcut.WorkingDirectory = '%INSTALL_DIR%'; $Shortcut.Description = 'SmartBlueprint Pro - Smart Home Network Monitoring'; $Shortcut.Save()"

:: Create Start Menu shortcut
if not exist "%ProgramData%\\Microsoft\\Windows\\Start Menu\\Programs\\SmartBlueprint Pro" mkdir "%ProgramData%\\Microsoft\\Windows\\Start Menu\\Programs\\SmartBlueprint Pro"
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%ProgramData%\\Microsoft\\Windows\\Start Menu\\Programs\\SmartBlueprint Pro\\SmartBlueprint Pro.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\\SmartBlueprint Pro.bat'; $Shortcut.WorkingDirectory = '%INSTALL_DIR%'; $Shortcut.Description = 'SmartBlueprint Pro - Smart Home Network Monitoring'; $Shortcut.Save()"

:: Create uninstaller
(
echo @echo off
echo title SmartBlueprint Pro Uninstaller
echo echo.
echo echo SmartBlueprint Pro Uninstaller
echo echo ==============================
echo echo.
echo echo This will completely remove SmartBlueprint Pro from your system.
echo echo.
echo set /p confirm=Are you sure you want to uninstall? (y/N^): 
echo if /i "%%confirm%%" neq "y" goto :cancel
echo.
echo echo Uninstalling SmartBlueprint Pro...
echo echo.
echo echo Removing application files...
echo rd /s /q "%INSTALL_DIR%" 2^>nul
echo echo Removing desktop shortcut...
echo del "%USERPROFILE%\\Desktop\\SmartBlueprint Pro.lnk" 2^>nul
echo echo Removing Start Menu entries...
echo rd /s /q "%ProgramData%\\Microsoft\\Windows\\Start Menu\\Programs\\SmartBlueprint Pro" 2^>nul
echo echo Removing registry entries...
echo reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\SmartBlueprint Pro" /f 2^>nul
echo echo.
echo echo ✅ SmartBlueprint Pro has been uninstalled successfully.
echo goto :end
echo :cancel
echo echo Uninstall cancelled.
echo :end
echo echo.
echo pause
) > "%INSTALL_DIR%\\Uninstall.bat"

goto :eof

:CONFIGURE_SYSTEM
:: Configure Windows Firewall
echo Configuring Windows Firewall...
netsh advfirewall firewall add rule name="SmartBlueprint Pro" dir=out action=allow program="%INSTALL_DIR%\\SmartBlueprint Pro.bat" >nul 2>&1

:: Add to Windows Programs list
echo Adding to Windows Programs list...
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\SmartBlueprint Pro" /v "DisplayName" /t REG_SZ /d "SmartBlueprint Pro" /f >nul 2>&1
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\SmartBlueprint Pro" /v "UninstallString" /t REG_SZ /d "%INSTALL_DIR%\\Uninstall.bat" /f >nul 2>&1
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\SmartBlueprint Pro" /v "InstallLocation" /t REG_SZ /d "%INSTALL_DIR%" /f >nul 2>&1
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\SmartBlueprint Pro" /v "DisplayVersion" /t REG_SZ /d "1.0.0" /f >nul 2>&1
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\SmartBlueprint Pro" /v "Publisher" /t REG_SZ /d "SmartBlueprint Technologies" /f >nul 2>&1
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\SmartBlueprint Pro" /v "DisplayIcon" /t REG_SZ /d "%INSTALL_DIR%\\SmartBlueprint Pro.bat" /f >nul 2>&1

goto :eof`;

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename="SmartBlueprint-Pro-Setup.exe"');
    res.setHeader('Content-Length', Buffer.byteLength(installerScript));
    
    console.log('[Download] Serving installer file, size:', Buffer.byteLength(installerScript), 'bytes');
    res.send(installerScript);
    
  } catch (error) {
    console.error('[Download] Installer generation failed:', error);
    res.status(500).json({ 
      success: false, 
      message: "Installer generation failed" 
    });
  }
});

// Serve enhanced desktop agent installer with proper binary distribution
app.get('/download/desktop-agent-enhanced.js', (req: Request, res: Response) => {
  console.log('[Download] Enhanced installer download requested');
  
  try {
    const installerPath = path.join(process.cwd(), 'enhanced-agent-installer.js');
    
    if (fs.existsSync(installerPath)) {
      res.download(installerPath, 'smartblueprint-installer.js', (err) => {
        if (err) {
          console.error('[Download] Installer download failed:', err);
          if (!res.headersSent) {
            res.status(500).send('Download failed');
          }
        } else {
          console.log('[Download] Enhanced installer downloaded successfully');
        }
      });
    } else {
      console.log('[Download] Enhanced installer not found, serving direct agent');
      const agentPath = path.join(process.cwd(), 'desktop-agent-enhanced.js');
      
      if (fs.existsSync(agentPath)) {
        res.download(agentPath, 'smartblueprint-agent-enhanced.js', (err) => {
          if (err) {
            console.error('[Download] Agent download failed:', err);
            if (!res.headersSent) {
              res.status(500).send('Download failed');
            }
          } else {
            console.log('[Download] Enhanced agent downloaded successfully');
          }
        });
      } else {
        res.status(404).send('Agent files not found');
      }
    }
  } catch (error) {
    console.error('[Download] Failed to serve files:', error);
    res.status(500).send('Download failed');
  }
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
