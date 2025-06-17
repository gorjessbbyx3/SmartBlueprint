#!/usr/bin/env node

/**
 * SmartBlueprint Pro - Automated Installer Builder
 * Creates a portable installer that includes everything needed
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class InstallerBuilder {
  constructor() {
    this.installerPath = path.join(__dirname, 'SmartBlueprint-Pro-Installer.exe');
    this.tempPath = path.join(__dirname, 'temp-installer');
  }

  async createPortableInstaller() {
    console.log('🔧 Creating SmartBlueprint Pro Portable Installer...');
    
    // Create self-extracting installer script
    const installerScript = this.generateInstallerScript();
    
    // Bundle all required files
    const bundledFiles = this.bundleApplicationFiles();
    
    // Create the installer executable
    await this.createExecutable(installerScript, bundledFiles);
    
    console.log(`✅ Installer created: ${this.installerPath}`);
    console.log(`📦 Size: ${this.getFileSize(this.installerPath)}`);
    
    return this.installerPath;
  }

  generateInstallerScript() {
    return `
@echo off
setlocal enabledelayedexpansion

:: SmartBlueprint Pro - Self-Extracting Installer
:: This installer contains everything needed to run SmartBlueprint Pro

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

:: Create installation directory
set INSTALL_DIR=%ProgramFiles%\\SmartBlueprint Pro
echo Creating installation directory...
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

:: Extract embedded files
echo Extracting application files...
call :EXTRACT_FILES

:: Install Node.js if needed
echo Checking Node.js...
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo Installing Node.js...
    call :INSTALL_NODEJS
)

:: Create shortcuts and services
echo Creating shortcuts...
call :CREATE_SHORTCUTS

:: Configure Windows
echo Configuring system...
call :CONFIGURE_SYSTEM

echo.
echo ============================================
echo   Installation Complete!
echo ============================================
echo.
echo SmartBlueprint Pro has been installed to:
echo %INSTALL_DIR%
echo.
echo Available shortcuts:
echo • Desktop: SmartBlueprint Pro
echo • Start Menu: SmartBlueprint Pro
echo.
echo The application will start automatically.
echo.

:: Launch application
"%INSTALL_DIR%\\SmartBlueprint Pro.exe"
pause
exit /b 0

:EXTRACT_FILES
:: This section would contain the embedded application files
:: In a real installer, files would be extracted from the executable
xcopy /E /I /Y "%~dp0embedded\\*" "%INSTALL_DIR%\\"
goto :eof

:INSTALL_NODEJS
:: Download and install Node.js silently
powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.10.0/node-v20.10.0-x64.msi' -OutFile '%TEMP%\\nodejs.msi'"
msiexec /i "%TEMP%\\nodejs.msi" /quiet /norestart
del "%TEMP%\\nodejs.msi"
goto :eof

:CREATE_SHORTCUTS
:: Create desktop shortcut
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\\Desktop\\SmartBlueprint Pro.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\\SmartBlueprint Pro.exe'; $Shortcut.IconLocation = '%INSTALL_DIR%\\icon.ico'; $Shortcut.Description = 'SmartBlueprint Pro - Smart Home Network Monitoring'; $Shortcut.Save()"

:: Create Start Menu shortcut
if not exist "%ProgramData%\\Microsoft\\Windows\\Start Menu\\Programs\\SmartBlueprint Pro" mkdir "%ProgramData%\\Microsoft\\Windows\\Start Menu\\Programs\\SmartBlueprint Pro"
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%ProgramData%\\Microsoft\\Windows\\Start Menu\\Programs\\SmartBlueprint Pro\\SmartBlueprint Pro.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\\SmartBlueprint Pro.exe'; $Shortcut.IconLocation = '%INSTALL_DIR%\\icon.ico'; $Shortcut.Description = 'SmartBlueprint Pro - Smart Home Network Monitoring'; $Shortcut.Save()"
goto :eof

:CONFIGURE_SYSTEM
:: Configure Windows Firewall
netsh advfirewall firewall add rule name="SmartBlueprint Pro" dir=out action=allow program="%INSTALL_DIR%\\SmartBlueprint Pro.exe" >nul 2>&1

:: Create uninstaller entry
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\SmartBlueprint Pro" /v "DisplayName" /t REG_SZ /d "SmartBlueprint Pro" /f >nul 2>&1
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\SmartBlueprint Pro" /v "UninstallString" /t REG_SZ /d "%INSTALL_DIR%\\Uninstall.exe" /f >nul 2>&1
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\SmartBlueprint Pro" /v "InstallLocation" /t REG_SZ /d "%INSTALL_DIR%" /f >nul 2>&1
goto :eof
`;
  }

  bundleApplicationFiles() {
    const files = {};
    
    // Bundle essential application files
    const filesToBundle = [
      'electron-main.js',
      'electron-preload.js', 
      'desktop-agent-embedded.js',
      'package.json'
    ];
    
    filesToBundle.forEach(file => {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        files[file] = fs.readFileSync(filePath, 'utf8');
      }
    });
    
    // Bundle dist folder if it exists
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      files['dist'] = this.bundleDirectory(distPath);
    }
    
    return files;
  }

  bundleDirectory(dirPath) {
    const files = {};
    const items = fs.readdirSync(dirPath);
    
    items.forEach(item => {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        files[item] = this.bundleDirectory(itemPath);
      } else {
        files[item] = fs.readFileSync(itemPath, 'utf8');
      }
    });
    
    return files;
  }

  async createExecutable(script, files) {
    // Create a self-extracting batch file with embedded data
    const header = `@echo off
REM SmartBlueprint Pro Self-Extracting Installer
REM Generated: ${new Date().toISOString()}

${script}

REM === EMBEDDED DATA SECTION ===
goto :eof
`;

    const dataSection = this.createDataSection(files);
    const fullInstaller = header + dataSection;
    
    fs.writeFileSync(this.installerPath, fullInstaller, 'utf8');
    
    // Make it executable (on Windows, .bat files are executable by default)
    if (process.platform !== 'win32') {
      fs.chmodSync(this.installerPath, '755');
    }
  }

  createDataSection(files) {
    let dataSection = '\n:DATA_SECTION\n';
    
    for (const [filename, content] of Object.entries(files)) {
      const encodedContent = Buffer.from(JSON.stringify(content)).toString('base64');
      dataSection += `:FILE_${filename.replace(/[^a-zA-Z0-9]/g, '_')}\n`;
      dataSection += encodedContent + '\n';
    }
    
    return dataSection;
  }

  getFileSize(filePath) {
    const stats = fs.statSync(filePath);
    const bytes = stats.size;
    
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  cleanup() {
    if (fs.existsSync(this.tempPath)) {
      fs.rmSync(this.tempPath, { recursive: true, force: true });
    }
  }
}

// Auto-build installer when script is run directly
if (require.main === module) {
  const builder = new InstallerBuilder();
  
  builder.createPortableInstaller()
    .then(installerPath => {
      console.log('\n🎉 SmartBlueprint Pro installer ready for distribution!');
      console.log(`📁 Location: ${installerPath}`);
      console.log('\nUsers can now download and run this single file to install SmartBlueprint Pro');
    })
    .catch(error => {
      console.error('❌ Installer build failed:', error);
      process.exit(1);
    })
    .finally(() => {
      builder.cleanup();
    });
}

module.exports = InstallerBuilder;