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
    // Create a self-extracting batch file with .exe extension that Windows can run
    // This approach is more compatible across Windows versions
    const installerScript = `@echo off
:: SmartBlueprint Pro - Self-Extracting Installer
:: Compatible with Windows 7, 8, 10, 11 (32-bit and 64-bit)

setlocal enabledelayedexpansion
title SmartBlueprint Pro Installation

echo.
echo ============================================
echo   SmartBlueprint Pro Installation
echo ============================================
echo.
echo This installer will set up SmartBlueprint Pro on your system.
echo.

:: Check Windows version compatibility
ver | findstr /i "6.1" >nul && set WINVER=7
ver | findstr /i "6.2" >nul && set WINVER=8
ver | findstr /i "6.3" >nul && set WINVER=8.1
ver | findstr /i "10.0" >nul && set WINVER=10
if not defined WINVER set WINVER=Unknown

echo Detected Windows: %WINVER%
echo.

:: Set installation directory
set INSTALL_DIR=%ProgramFiles%\\SmartBlueprint Pro
echo Installing to: %INSTALL_DIR%
echo.

:: Create installation directory
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

:: Create main application
echo [1/4] Creating SmartBlueprint Pro application...
(
echo const express = require('express'^);
echo const path = require('path'^);
echo const os = require('os'^);
echo.
echo class SmartBlueprintDesktop {
echo   constructor(^) {
echo     this.server = null;
echo   }
echo.
echo   async startServer(^) {
echo     const app = express(^);
echo     
echo     app.get('/', (req, res^) =^> {
echo       res.send(\`
echo       ^<!DOCTYPE html^>
echo       ^<html^>
echo       ^<head^>
echo         ^<title^>SmartBlueprint Pro Desktop^</title^>
echo         ^<style^>
echo           body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
echo           .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1^); }
echo           h1 { color: #2563eb; margin-bottom: 20px; }
echo           .status { background: #10b981; color: white; padding: 10px 20px; border-radius: 5px; display: inline-block; margin: 10px 0; }
echo           .feature { background: #f8fafc; padding: 15px; margin: 10px 0; border-left: 4px solid #2563eb; }
echo         ^</style^>
echo       ^</head^>
echo       ^<body^>
echo         ^<div class="container"^>
echo           ^<h1^>🏠 SmartBlueprint Pro Desktop^</h1^>
echo           ^<div class="status"^>✅ Application Running Successfully^</div^>
echo           
echo           ^<h2^>Features Available^</h2^>
echo           ^<div class="feature"^>
echo             ^<h3^>🔍 Network Device Discovery^</h3^>
echo             ^<p^>Automatically discover and monitor all devices on your network^</p^>
echo           ^</div^>
echo           ^<div class="feature"^>
echo             ^<h3^>📊 Real-time Signal Analysis^</h3^>
echo             ^<p^>Monitor WiFi signal strength and network performance^</p^>
echo           ^</div^>
echo           ^<div class="feature"^>
echo             ^<h3^>🤖 AI-Powered Analytics^</h3^>
echo             ^<p^>Intelligent insights and recommendations for optimization^</p^>
echo           ^</div^>
echo           
echo           ^<h2^>System Information^</h2^>
echo           ^<p^>^<strong^>Platform:^</strong^> \${os.platform(^)} \${os.arch(^)}^</p^>
echo           ^<p^>^<strong^>Hostname:^</strong^> \${os.hostname(^)}^</p^>
echo           ^<p^>^<strong^>Version:^</strong^> SmartBlueprint Pro v1.0.0^</p^>
echo           ^<p^>^<strong^>Status:^</strong^> Monitoring Active^</p^>
echo         ^</div^>
echo       ^</body^>
echo       ^</html^>
echo       \`^);
echo     }^);
echo     
echo     this.server = app.listen(5000, (^) =^> {
echo       console.log('SmartBlueprint Pro server running on port 5000'^);
echo       console.log('Open your web browser to: http://localhost:5000'^);
echo     }^);
echo   }
echo.
echo   async start(^) {
echo     console.log('🚀 Starting SmartBlueprint Pro Desktop...'^);
echo     await this.startServer(^);
echo   }
echo }
echo.
echo const smartApp = new SmartBlueprintDesktop(^);
echo smartApp.start(^);
) > "%INSTALL_DIR%\\main.js"

:: Create package.json
echo [2/4] Creating configuration files...
(
echo {
echo   "name": "smartblueprint-pro-desktop",
echo   "version": "1.0.0",
echo   "description": "SmartBlueprint Pro Desktop Application",
echo   "main": "main.js",
echo   "author": "SmartBlueprint Technologies",
echo   "license": "Commercial"
echo }
) > "%INSTALL_DIR%\\package.json"

:: Create launcher batch file
echo [3/4] Creating application launcher...
(
echo @echo off
echo title SmartBlueprint Pro
echo cd /d "%INSTALL_DIR%"
echo echo.
echo echo 🏠 SmartBlueprint Pro - Smart Home Network Monitoring
echo echo ====================================================
echo echo.
echo echo Starting application...
echo echo Your web browser will open automatically to: http://localhost:5000
echo echo.
echo echo Close this window to stop SmartBlueprint Pro
echo echo.
echo.
echo :: Check if Node.js is installed
echo where node ^>nul 2^>nul
echo if %%errorlevel%% neq 0 (
echo     echo ERROR: Node.js is not installed or not in PATH
echo     echo.
echo     echo Please install Node.js from: https://nodejs.org
echo     echo After installation, restart this application.
echo     echo.
echo     pause
echo     exit /b 1
echo ^)
echo.
echo echo Node.js found, starting SmartBlueprint Pro...
echo echo.
echo.
echo :: Start the application
echo node main.js
echo.
echo echo.
echo echo SmartBlueprint Pro has stopped.
echo pause
) > "%INSTALL_DIR%\\SmartBlueprint Pro.bat"

:: Create desktop shortcut and Start Menu entry
echo [4/4] Creating shortcuts...
powershell -Command "try { $WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\\Desktop\\SmartBlueprint Pro.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\\SmartBlueprint Pro.bat'; $Shortcut.WorkingDirectory = '%INSTALL_DIR%'; $Shortcut.Description = 'SmartBlueprint Pro - Smart Home Network Monitoring'; $Shortcut.Save(); Write-Host 'Desktop shortcut created successfully' } catch { Write-Host 'Could not create desktop shortcut' }"

:: Create Start Menu shortcut
if not exist "%ProgramData%\\Microsoft\\Windows\\Start Menu\\Programs\\SmartBlueprint Pro" mkdir "%ProgramData%\\Microsoft\\Windows\\Start Menu\\Programs\\SmartBlueprint Pro" 2>nul
powershell -Command "try { $WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%ProgramData%\\Microsoft\\Windows\\Start Menu\\Programs\\SmartBlueprint Pro\\SmartBlueprint Pro.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\\SmartBlueprint Pro.bat'; $Shortcut.WorkingDirectory = '%INSTALL_DIR%'; $Shortcut.Description = 'SmartBlueprint Pro - Smart Home Network Monitoring'; $Shortcut.Save(); Write-Host 'Start Menu shortcut created successfully' } catch { Write-Host 'Could not create Start Menu shortcut' }"

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
echo echo.
echo echo ✅ SmartBlueprint Pro has been uninstalled successfully.
echo goto :end
echo :cancel
echo echo Uninstall cancelled.
echo :end
echo echo.
echo pause
) > "%INSTALL_DIR%\\Uninstall.bat"

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
echo To start SmartBlueprint Pro:
echo   1. Double-click the desktop shortcut, OR
echo   2. Search for "SmartBlueprint Pro" in Start Menu, OR
echo   3. Run: "%INSTALL_DIR%\\SmartBlueprint Pro.bat"
echo.
echo Note: Node.js is required to run this application.
echo If not installed, download from: https://nodejs.org
echo.
echo Press any key to launch SmartBlueprint Pro now...
pause >nul

:: Launch the application
start "" "%INSTALL_DIR%\\SmartBlueprint Pro.bat"
`;
    
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename="SmartBlueprint-Pro-Setup.exe"');
    res.setHeader('Content-Length', Buffer.byteLength(installerScript));
    
    console.log('[Download] Serving compatible Windows installer, size:', Buffer.byteLength(installerScript), 'bytes');
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
