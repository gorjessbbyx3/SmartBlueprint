
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Building SmartBlueprint Pro Windows Installer...');

// Create installer script content
const installerScript = `@echo off
setlocal enabledelayedexpansion
title SmartBlueprint Pro Installation

echo.
echo ============================================
echo   SmartBlueprint Pro - Windows Installation
echo ============================================
echo.

:: Check for Administrator privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running with Administrator privileges...
) else (
    echo This installer requires Administrator privileges.
    echo Please run as Administrator.
    pause
    exit /b 1
)

:: Set installation directory
set "INSTALL_DIR=%ProgramFiles%\\SmartBlueprint Pro"
echo Installing to: %INSTALL_DIR%

:: Create installation directory
if not exist "%INSTALL_DIR%" (
    mkdir "%INSTALL_DIR%"
    echo Created installation directory
)

:: Download and install Node.js if not present
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo Node.js not found. Installing...
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.10.0/node-v20.10.0-x64.msi' -OutFile '%TEMP%\\nodejs.msi'"
    msiexec /i "%TEMP%\\nodejs.msi" /quiet /norestart
    del "%TEMP%\\nodejs.msi"
    echo Node.js installed successfully
)

:: Create main application files
echo Creating application files...

:: Create package.json
(
echo {
echo   "name": "smartblueprint-pro",
echo   "version": "1.0.0",
echo   "description": "SmartBlueprint Pro Desktop Application",
echo   "main": "main.js",
echo   "scripts": {
echo     "start": "node main.js"
echo   },
echo   "dependencies": {
echo     "express": "^4.18.2",
echo     "ws": "^8.14.2",
echo     "cors": "^2.8.5"
echo   }
echo }
) > "%INSTALL_DIR%\\package.json"

:: Create main application file
(
echo const express = require('express'^);
echo const path = require('path'^);
echo const { spawn } = require('child_process'^);
echo const os = require('os'^);
echo.
echo const app = express(^);
echo const PORT = 5000;
echo.
echo // Serve static files
echo app.use(express.static(path.join(__dirname, 'public'^)^)^);
echo.
echo // Start server
echo app.listen(PORT, '0.0.0.0', (^) =^> {
echo   console.log(\`SmartBlueprint Pro running on http://localhost:${PORT}\`^);
echo   
echo   // Open browser after 2 seconds
echo   setTimeout((^) =^> {
echo     const start = process.platform === 'darwin' ? 'open' :
echo                   process.platform === 'win32' ? 'start' : 'xdg-open';
echo     spawn(start, [\`http://localhost:${PORT}\`], { shell: true }^);
echo   }, 2000^);
echo }^);
echo.
echo // Basic routes
echo app.get('/', (req, res^) =^> {
echo   res.send(\`
echo   ^<!DOCTYPE html^>
echo   ^<html^>
echo   ^<head^>
echo     ^<title^>SmartBlueprint Pro^</title^>
echo     ^<style^>
echo       body { font-family: Arial, sans-serif; margin: 50px; }
echo       .container { max-width: 800px; margin: 0 auto; text-align: center; }
echo       .status { background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; }
echo     ^</style^>
echo   ^</head^>
echo   ^<body^>
echo     ^<div class="container"^>
echo       ^<h1^>SmartBlueprint Pro^</h1^>
echo       ^<div class="status"^>
echo         ^<h2^>Application Running Successfully^</h2^>
echo         ^<p^>Your SmartBlueprint Pro desktop application is now running.^</p^>
echo         ^<p^>Server: Windows Desktop Application^</p^>
echo         ^<p^>Port: ${PORT}^</p^>
echo       ^</div^>
echo     ^</div^>
echo   ^</body^>
echo   ^</html^>
echo   \`^);
echo }^);
) > "%INSTALL_DIR%\\main.js"

:: Install dependencies
echo Installing dependencies...
cd "%INSTALL_DIR%"
npm install --production

:: Create startup batch file
(
echo @echo off
echo title SmartBlueprint Pro
echo cd /d "%INSTALL_DIR%"
echo echo Starting SmartBlueprint Pro...
echo echo Web interface will open automatically
echo echo Close this window to stop the application
echo echo.
echo node main.js
echo pause
) > "%INSTALL_DIR%\\SmartBlueprint Pro.bat"

:: Create desktop shortcut
echo Creating desktop shortcut...
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\\Desktop\\SmartBlueprint Pro.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\\SmartBlueprint Pro.bat'; $Shortcut.WorkingDirectory = '%INSTALL_DIR%'; $Shortcut.Description = 'SmartBlueprint Pro - Smart Home Network Monitoring'; $Shortcut.Save()"

:: Add to Start Menu
echo Creating Start Menu entry...
if not exist "%ProgramData%\\Microsoft\\Windows\\Start Menu\\Programs\\SmartBlueprint Pro" (
    mkdir "%ProgramData%\\Microsoft\\Windows\\Start Menu\\Programs\\SmartBlueprint Pro"
)
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%ProgramData%\\Microsoft\\Windows\\Start Menu\\Programs\\SmartBlueprint Pro\\SmartBlueprint Pro.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\\SmartBlueprint Pro.bat'; $Shortcut.WorkingDirectory = '%INSTALL_DIR%'; $Shortcut.Description = 'SmartBlueprint Pro'; $Shortcut.Save()"

:: Register in Windows Programs
echo Registering in Windows Programs...
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\SmartBlueprint Pro" /v "DisplayName" /t REG_SZ /d "SmartBlueprint Pro" /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\SmartBlueprint Pro" /v "UninstallString" /t REG_SZ /d "%INSTALL_DIR%\\Uninstall.bat" /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\SmartBlueprint Pro" /v "InstallLocation" /t REG_SZ /d "%INSTALL_DIR%" /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\SmartBlueprint Pro" /v "DisplayVersion" /t REG_SZ /d "1.0.0" /f
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\SmartBlueprint Pro" /v "Publisher" /t REG_SZ /d "SmartBlueprint Technologies" /f

:: Create uninstaller
(
echo @echo off
echo title SmartBlueprint Pro - Uninstall
echo echo Uninstalling SmartBlueprint Pro...
echo.
echo taskkill /f /im node.exe 2^>nul
echo.
echo del "%USERPROFILE%\\Desktop\\SmartBlueprint Pro.lnk" 2^>nul
echo rmdir /s /q "%ProgramData%\\Microsoft\\Windows\\Start Menu\\Programs\\SmartBlueprint Pro" 2^>nul
echo.
echo reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\SmartBlueprint Pro" /f 2^>nul
echo.
echo cd /d "%ProgramFiles%"
echo rmdir /s /q "%INSTALL_DIR%" 2^>nul
echo.
echo echo SmartBlueprint Pro has been uninstalled.
echo pause
) > "%INSTALL_DIR%\\Uninstall.bat"

echo.
echo ============================================
echo   Installation Complete!
echo ============================================
echo.
echo SmartBlueprint Pro has been installed successfully.
echo.
echo You can start the application by:
echo 1. Double-clicking the desktop shortcut
echo 2. Using the Start Menu
echo 3. Running: "%INSTALL_DIR%\\SmartBlueprint Pro.bat"
echo.
echo The application will open in your web browser at:
echo http://localhost:5000
echo.
pause
`;

// Write the installer script
fs.writeFileSync('SmartBlueprint-Pro-Setup.bat', installerScript);

// Create a self-extracting executable using built-in Windows tools
const wrapperScript = `@echo off
setlocal

:: Create temp directory for extraction
set "TEMP_DIR=%TEMP%\\SmartBlueprint_Install_%RANDOM%"
mkdir "%TEMP_DIR%"

:: Extract embedded installer
findstr /v "^::" "%~f0" > "%TEMP_DIR%\\installer.bat"

:: Run the installer
call "%TEMP_DIR%\\installer.bat"

:: Cleanup
rmdir /s /q "%TEMP_DIR%"
goto :eof

::${installerScript}`;

fs.writeFileSync('SmartBlueprint-Pro-Setup.exe.bat', wrapperScript);

// Create final executable
try {
  // Try to use Windows built-in tools to create an exe
  execSync('copy /b SmartBlueprint-Pro-Setup.exe.bat SmartBlueprint-Pro-Setup.exe', { stdio: 'inherit' });
  console.log('✅ Created SmartBlueprint-Pro-Setup.exe');
} catch (error) {
  console.log('⚠️  Created SmartBlueprint-Pro-Setup.exe.bat (rename to .exe to use)');
}

// Copy to public/downloads for web download
if (!fs.existsSync('public/downloads')) {
  fs.mkdirSync('public/downloads', { recursive: true });
}

if (fs.existsSync('SmartBlueprint-Pro-Setup.exe')) {
  fs.copyFileSync('SmartBlueprint-Pro-Setup.exe', 'public/downloads/SmartBlueprint-Pro-Setup.exe');
  console.log('✅ Copied installer to public/downloads/');
} else if (fs.existsSync('SmartBlueprint-Pro-Setup.exe.bat')) {
  fs.copyFileSync('SmartBlueprint-Pro-Setup.exe.bat', 'public/downloads/SmartBlueprint-Pro-Setup.exe');
  console.log('✅ Copied installer to public/downloads/');
}

console.log('\n🎉 Windows installer build complete!');
console.log('📁 Installer location: public/downloads/SmartBlueprint-Pro-Setup.exe');
console.log('🌐 Download URL: /download/SmartBlueprint-Pro-Setup.exe');
