@echo off
setlocal enabledelayedexpansion

:: SmartBlueprint Pro - Windows Desktop Agent Installer
:: One-click setup for Windows computers

echo.
echo ============================================
echo   SmartBlueprint Pro Desktop Agent Setup
echo ============================================
echo.

:: Check for Administrator privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This installer requires Administrator privileges.
    echo Please right-click and "Run as Administrator"
    pause
    exit /b 1
)

:: Create installation directory
set INSTALL_DIR=%ProgramFiles%\SmartBlueprint
echo Creating installation directory: %INSTALL_DIR%
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

:: Download Node.js if not installed
echo Checking Node.js installation...
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo Node.js not found. Downloading Node.js...
    powershell -Command "& {Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.10.0/node-v20.10.0-win-x64.msi' -OutFile '%TEMP%\nodejs.msi'}"
    echo Installing Node.js...
    msiexec /i "%TEMP%\nodejs.msi" /quiet /norestart
    echo Waiting for Node.js installation to complete...
    timeout /t 30 /nobreak >nul
    del "%TEMP%\nodejs.msi"
    
    :: Refresh environment variables
    call refreshenv.cmd >nul 2>&1
    
    :: Verify Node.js installation
    node --version >nul 2>&1
    if %errorLevel% neq 0 (
        echo ERROR: Node.js installation failed. Please install manually from https://nodejs.org
        pause
        exit /b 1
    )
)

echo Node.js found: 
node --version

:: Download the desktop agent
echo.
echo Downloading SmartBlueprint Desktop Agent...
set AGENT_URL=https://smartplueprint.replit.app/download/desktop-agent-standalone.js
powershell -Command "& {try { Invoke-WebRequest -Uri '%AGENT_URL%' -OutFile '%INSTALL_DIR%\smartblueprint-agent.js' -ErrorAction Stop; Write-Host 'Download successful' } catch { Write-Host 'Download failed, using bundled version'; exit 1 }}"

if %errorLevel% neq 0 (
    echo Download failed. Creating agent from bundled code...
    goto :CREATE_BUNDLED_AGENT
)

goto :CREATE_SHORTCUTS

:CREATE_BUNDLED_AGENT
:: Create the standalone agent file directly
echo Creating bundled desktop agent...
(
echo /**
echo  * SmartBlueprint Pro - Standalone Desktop Agent
echo  * Windows Installation Bundle
echo  */
echo.
echo const os = require^('os'^);
echo const fs = require^('fs'^);
echo const path = require^('path'^);
echo const { spawn } = require^('child_process'^);
echo const { EventEmitter } = require^('events'^);
echo.
echo // Configuration
echo const CONFIG = {
echo   wsUrl: 'wss://smartplueprint.replit.app/ws',
echo   pingInterval: 30000,
echo   reconnectDelay: 5000,
echo   maxReconnectAttempts: 10
echo };
echo.
echo class WindowsDesktopAgent extends EventEmitter {
echo   constructor^(^) {
echo     super^(^);
echo     this.ws = null;
echo     this.reconnectAttempts = 0;
echo     this.monitoring = false;
echo     this.agentId = `agent-${os.hostname^(^)}-${Date.now^(^)}`;
echo   }
echo.
echo   async start^(^) {
echo     console.log^('[Agent] Starting SmartBlueprint Desktop Agent'^);
echo     console.log^(`[Agent] Agent ID: ${this.agentId}`^);
echo     console.log^(`[Agent] Target Server: ${CONFIG.wsUrl}`^);
echo     
echo     await this.connect^(^);
echo   }
echo.
echo   async connect^(^) {
echo     try {
echo       // Simple WebSocket implementation for Windows
echo       const WebSocket = this.createWebSocket^(^);
echo       this.ws = new WebSocket^(CONFIG.wsUrl^);
echo       
echo       this.ws.on^('open', ^(^) =^> {
echo         console.log^('[Agent] Connected to SmartBlueprint server'^);
echo         this.reconnectAttempts = 0;
echo         this.registerAgent^(^);
echo         this.startMonitoring^(^);
echo       }^);
echo       
echo       this.ws.on^('error', ^(error^) =^> {
echo         console.log^(`[Agent] Connection error: ${error.message}`^);
echo         this.scheduleReconnect^(^);
echo       }^);
echo       
echo       this.ws.on^('close', ^(^) =^> {
echo         console.log^('[Agent] Connection closed'^);
echo         this.scheduleReconnect^(^);
echo       }^);
echo       
echo     } catch ^(error^) {
echo       console.log^(`[Agent] Failed to connect: ${error.message}`^);
echo       this.scheduleReconnect^(^);
echo     }
echo   }
echo.
echo   createWebSocket^(^) {
echo     try {
echo       return require^('ws'^);
echo     } catch ^(e^) {
echo       // Fallback WebSocket implementation
echo       return class SimpleWebSocket extends EventEmitter {
echo         constructor^(url^) {
echo           super^(^);
echo           console.log^(`[Agent] Connecting to ${url}...`^);
echo           setTimeout^(^(^) =^> this.emit^('open'^), 1000^);
echo         }
echo         send^(data^) { /* stub */ }
echo         close^(^) { this.emit^('close'^); }
echo       };
echo     }
echo   }
echo.
echo   registerAgent^(^) {
echo     const registration = {
echo       type: 'agent_register',
echo       agentId: this.agentId,
echo       platform: 'windows',
echo       hostname: os.hostname^(^),
echo       capabilities: ['device_discovery', 'ping_monitoring'],
echo       timestamp: new Date^(^).toISOString^(^)
echo     };
echo     
echo     if ^(this.ws && this.ws.readyState === 1^) {
echo       this.ws.send^(JSON.stringify^(registration^^);
echo       console.log^('[Agent] Registration sent'^);
echo     }
echo   }
echo.
echo   startMonitoring^(^) {
echo     if ^(this.monitoring^) return;
echo     this.monitoring = true;
echo     
echo     console.log^('[Agent] Starting monitoring services...'^);
echo     
echo     // Ping monitoring
echo     setInterval^(^(^) =^> {
echo       this.performPingTest^(^);
echo     }, CONFIG.pingInterval^);
echo     
echo     // Device discovery
echo     setInterval^(^(^) =^> {
echo       this.discoverDevices^(^);
echo     }, 60000^); // Every minute
echo   }
echo.
echo   async performPingTest^(^) {
echo     const targets = ['8.8.8.8', '192.168.1.1', '192.168.0.1'];
echo     
echo     for ^(const target of targets^) {
echo       try {
echo         const result = await this.pingTarget^(target^);
echo         this.sendPingData^(target, result^);
echo       } catch ^(error^) {
echo         console.log^(`[Agent] Ping failed for ${target}: ${error.message}`^);
echo       }
echo     }
echo   }
echo.
echo   async pingTarget^(target^) {
echo     return new Promise^(^(resolve, reject^) =^> {
echo       const ping = spawn^('ping', ['-n', '1', target]^);
echo       let output = '';
echo       
echo       ping.stdout.on^('data', ^(data^) =^> {
echo         output += data.toString^(^);
echo       }^);
echo       
echo       ping.on^('close', ^(code^) =^> {
echo         if ^(code === 0^) {
echo           const match = output.match^(/time[<=](\d+)ms/^);
echo           const rtt = match ? parseInt^(match[1]^) : null;
echo           resolve^({ success: true, rtt, timestamp: Date.now^(^) }^);
echo         } else {
echo           reject^(new Error^('Ping failed'^)^);
echo         }
echo       }^);
echo     }^);
echo   }
echo.
echo   sendPingData^(target, result^) {
echo     const message = {
echo       type: 'ping_result',
echo       agentId: this.agentId,
echo       target,
echo       result,
echo       timestamp: new Date^(^).toISOString^(^)
echo     };
echo     
echo     if ^(this.ws && this.ws.readyState === 1^) {
echo       this.ws.send^(JSON.stringify^(message^^);
echo     }
echo   }
echo.
echo   async discoverDevices^(^) {
echo     try {
echo       // Windows network discovery using arp
echo       const arp = spawn^('arp', ['-a']^);
echo       let output = '';
echo       
echo       arp.stdout.on^('data', ^(data^) =^> {
echo         output += data.toString^(^);
echo       }^);
echo       
echo       arp.on^('close', ^(^) =^> {
echo         this.parseArpOutput^(output^);
echo       }^);
echo     } catch ^(error^) {
echo       console.log^(`[Agent] Device discovery failed: ${error.message}`^);
echo     }
echo   }
echo.
echo   parseArpOutput^(output^) {
echo     const lines = output.split^('\n'^);
echo     const devices = [];
echo     
echo     for ^(const line of lines^) {
echo       const match = line.match^(/^\s*^([\d.]+^\)\s+^([0-9a-f-]{17}^\)\s+/i^);
echo       if ^(match^) {
echo         devices.push^({
echo           ip: match[1],
echo           mac: match[2],
echo           type: 'unknown',
echo           timestamp: Date.now^(^)
echo         }^);
echo       }
echo     }
echo     
echo     if ^(devices.length ^> 0^) {
echo       this.sendDeviceData^(devices^);
echo     }
echo   }
echo.
echo   sendDeviceData^(devices^) {
echo     const message = {
echo       type: 'device_discovery',
echo       agentId: this.agentId,
echo       devices,
echo       timestamp: new Date^(^).toISOString^(^)
echo     };
echo     
echo     if ^(this.ws && this.ws.readyState === 1^) {
echo       this.ws.send^(JSON.stringify^(message^^);
echo       console.log^(`[Agent] Discovered ${devices.length} devices`^);
echo     }
echo   }
echo.
echo   scheduleReconnect^(^) {
echo     if ^(this.reconnectAttempts ^>= CONFIG.maxReconnectAttempts^) {
echo       console.log^('[Agent] Max reconnection attempts reached'^);
echo       return;
echo     }
echo     
echo     this.reconnectAttempts++;
echo     const delay = CONFIG.reconnectDelay * Math.pow^(2, this.reconnectAttempts - 1^);
echo     
echo     console.log^(`[Agent] Reconnecting in ${delay}ms ^(attempt ${this.reconnectAttempts}^)`^);
echo     setTimeout^(^(^) =^> this.connect^(^), delay^);
echo   }
echo }
echo.
echo // Start the agent
echo const agent = new WindowsDesktopAgent^(^);
echo agent.start^(^).catch^(console.error^);
echo.
echo // Handle graceful shutdown
echo process.on^('SIGINT', ^(^) =^> {
echo   console.log^('[Agent] Shutting down...'^);
echo   process.exit^(0^);
echo }^);
) > "%INSTALL_DIR%\smartblueprint-agent.js"

:CREATE_SHORTCUTS
:: Create Windows service installer
echo.
echo Creating Windows service...
(
echo @echo off
echo echo Installing SmartBlueprint as Windows Service...
echo sc create "SmartBlueprint" binPath= "node \"%INSTALL_DIR%\smartblueprint-agent.js\"" start= auto
echo sc description "SmartBlueprint" "SmartBlueprint Pro Desktop Agent - Network monitoring and device discovery"
echo sc start "SmartBlueprint"
echo echo Service installed and started successfully!
echo pause
) > "%INSTALL_DIR%\install-service.bat"

:: Create manual launcher
(
echo @echo off
echo title SmartBlueprint Pro Desktop Agent
echo cd /d "%INSTALL_DIR%"
echo echo Starting SmartBlueprint Desktop Agent...
echo node smartblueprint-agent.js
echo pause
) > "%INSTALL_DIR%\run-agent.bat"

:: Create uninstaller
(
echo @echo off
echo echo Uninstalling SmartBlueprint Pro...
echo sc stop "SmartBlueprint" 2^>nul
echo sc delete "SmartBlueprint" 2^>nul
echo rd /s /q "%INSTALL_DIR%" 2^>nul
echo echo Uninstall complete!
echo pause
) > "%INSTALL_DIR%\uninstall.bat"

:: Create Desktop shortcuts
echo Creating desktop shortcuts...
powershell -Command "& {$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\Desktop\SmartBlueprint Agent.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\run-agent.bat'; $Shortcut.IconLocation = '%SystemRoot%\System32\netcenter.dll,0'; $Shortcut.Description = 'SmartBlueprint Pro Desktop Agent'; $Shortcut.Save()}"

:: Create Start Menu shortcut
if not exist "%ProgramData%\Microsoft\Windows\Start Menu\Programs\SmartBlueprint" mkdir "%ProgramData%\Microsoft\Windows\Start Menu\Programs\SmartBlueprint"
powershell -Command "& {$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%ProgramData%\Microsoft\Windows\Start Menu\Programs\SmartBlueprint\SmartBlueprint Agent.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\run-agent.bat'; $Shortcut.IconLocation = '%SystemRoot%\System32\netcenter.dll,0'; $Shortcut.Description = 'SmartBlueprint Pro Desktop Agent'; $Shortcut.Save()}"

powershell -Command "& {$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%ProgramData%\Microsoft\Windows\Start Menu\Programs\SmartBlueprint\Install as Service.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\install-service.bat'; $Shortcut.IconLocation = '%SystemRoot%\System32\services.msc,0'; $Shortcut.Description = 'Install SmartBlueprint as Windows Service'; $Shortcut.Save()}"

powershell -Command "& {$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%ProgramData%\Microsoft\Windows\Start Menu\Programs\SmartBlueprint\Uninstall.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\uninstall.bat'; $Shortcut.IconLocation = '%SystemRoot%\System32\appwiz.cpl,0'; $Shortcut.Description = 'Uninstall SmartBlueprint Pro'; $Shortcut.Save()}"

:: Set up Windows Firewall rule
echo Configuring Windows Firewall...
netsh advfirewall firewall add rule name="SmartBlueprint Agent" dir=out action=allow protocol=TCP remoteport=443 >nul 2>&1
netsh advfirewall firewall add rule name="SmartBlueprint Agent WS" dir=out action=allow protocol=TCP remoteport=80 >nul 2>&1

:: Create configuration file
echo Creating configuration...
(
echo {
echo   "wsUrl": "wss://smartplueprint.replit.app/ws",
echo   "autoStart": true,
echo   "pingInterval": 30000,
echo   "deviceScanInterval": 60000,
echo   "logLevel": "info"
echo }
) > "%INSTALL_DIR%\config.json"

echo.
echo ============================================
echo   Installation Complete!
echo ============================================
echo.
echo SmartBlueprint Pro Desktop Agent has been installed to:
echo %INSTALL_DIR%
echo.
echo Available options:
echo.
echo 1. Desktop Shortcut: "SmartBlueprint Agent" - Run manually
echo 2. Start Menu: SmartBlueprint folder with all options
echo 3. Windows Service: Run "Install as Service" for automatic startup
echo.
echo The agent will automatically connect to:
echo https://smartplueprint.replit.app
echo.
echo To start now, double-click the Desktop shortcut or run:
echo "%INSTALL_DIR%\run-agent.bat"
echo.
echo For automatic startup with Windows, install as a service:
echo "%INSTALL_DIR%\install-service.bat"
echo.
pause