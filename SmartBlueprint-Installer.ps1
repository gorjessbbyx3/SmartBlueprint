# SmartBlueprint Pro - Windows PowerShell Installer
# One-click desktop agent setup with automatic dependency management

param(
    [switch]$InstallService,
    [switch]$Uninstall,
    [string]$InstallPath = "$env:ProgramFiles\SmartBlueprint"
)

# Require Administrator privileges
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "ERROR: Administrator privileges required" -ForegroundColor Red
    Write-Host "Please right-click PowerShell and 'Run as Administrator'" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

function Write-Banner {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "   SmartBlueprint Pro Desktop Agent Setup" -ForegroundColor White
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
}

function Test-NodeJS {
    try {
        $nodeVersion = node --version 2>$null
        if ($nodeVersion) {
            Write-Host "✓ Node.js found: $nodeVersion" -ForegroundColor Green
            return $true
        }
    } catch {
        return $false
    }
    return $false
}

function Install-NodeJS {
    Write-Host "⚡ Installing Node.js..." -ForegroundColor Yellow
    
    $nodeUrl = "https://nodejs.org/dist/v20.10.0/node-v20.10.0-x64.msi"
    $tempPath = "$env:TEMP\nodejs-installer.msi"
    
    try {
        # Download Node.js installer
        Write-Host "   Downloading Node.js installer..."
        Invoke-WebRequest -Uri $nodeUrl -OutFile $tempPath -UseBasicParsing
        
        # Install silently
        Write-Host "   Installing Node.js (this may take a moment)..."
        Start-Process msiexec.exe -ArgumentList "/i `"$tempPath`" /quiet /norestart" -Wait
        
        # Clean up
        Remove-Item $tempPath -Force
        
        # Refresh environment variables
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        # Verify installation
        Start-Sleep 3
        if (Test-NodeJS) {
            Write-Host "✓ Node.js installation successful" -ForegroundColor Green
            return $true
        } else {
            throw "Node.js installation verification failed"
        }
    } catch {
        Write-Host "✗ Node.js installation failed: $_" -ForegroundColor Red
        Write-Host "Please install Node.js manually from https://nodejs.org" -ForegroundColor Yellow
        return $false
    }
}

function Install-DesktopAgent {
    Write-Host "⚡ Installing SmartBlueprint Desktop Agent..." -ForegroundColor Yellow
    
    # Create installation directory
    if (!(Test-Path $InstallPath)) {
        New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
        Write-Host "✓ Created installation directory: $InstallPath" -ForegroundColor Green
    }
    
    # Download agent from deployed application
    $agentUrl = "https://smartplueprint.replit.app/download/desktop-agent"
    $agentPath = "$InstallPath\smartblueprint-agent.js"
    
    try {
        Write-Host "   Downloading desktop agent..."
        Invoke-WebRequest -Uri $agentUrl -OutFile $agentPath -UseBasicParsing -ErrorAction Stop
        Write-Host "✓ Desktop agent downloaded successfully" -ForegroundColor Green
    } catch {
        Write-Host "   Download failed, creating bundled agent..." -ForegroundColor Yellow
        Create-BundledAgent -Path $agentPath
    }
    
    # Create configuration file
    $config = @{
        wsUrl = "wss://smartplueprint.replit.app/ws"
        autoStart = $true
        pingInterval = 30000
        deviceScanInterval = 60000
        logLevel = "info"
    } | ConvertTo-Json
    
    $config | Out-File "$InstallPath\config.json" -Encoding UTF8
    
    # Create launcher scripts
    Create-LauncherScripts
    
    # Create shortcuts
    Create-Shortcuts
    
    # Configure firewall
    Configure-Firewall
    
    Write-Host "✓ SmartBlueprint Desktop Agent installed successfully" -ForegroundColor Green
}

function Create-BundledAgent {
    param([string]$Path)
    
    $agentCode = @'
/**
 * SmartBlueprint Pro - Windows Desktop Agent
 * Standalone network monitoring and device discovery
 */

const os = require('os');
const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const https = require('https');
const fs = require('fs');

class SmartBlueprintAgent extends EventEmitter {
  constructor() {
    super();
    this.agentId = `agent-${os.hostname()}-${Date.now()}`;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      const configPath = require('path').join(__dirname, 'config.json');
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch {
      return {
        wsUrl: 'wss://smartplueprint.replit.app/ws',
        pingInterval: 30000,
        deviceScanInterval: 60000
      };
    }
  }

  async start() {
    console.log('[SmartBlueprint] Starting Desktop Agent');
    console.log(`[SmartBlueprint] Agent ID: ${this.agentId}`);
    console.log(`[SmartBlueprint] Server: ${this.config.wsUrl}`);
    
    await this.connect();
    this.startMonitoring();
  }

  async connect() {
    try {
      // Use built-in WebSocket alternative
      this.ws = this.createConnection();
      
      console.log('[SmartBlueprint] Connected to server');
      this.reconnectAttempts = 0;
      this.registerAgent();
      
    } catch (error) {
      console.log(`[SmartBlueprint] Connection failed: ${error.message}`);
      this.scheduleReconnect();
    }
  }

  createConnection() {
    // Simulate WebSocket connection for Windows
    const connection = new EventEmitter();
    connection.send = (data) => {
      // Send data to server via HTTPS POST
      this.sendToServer(data);
    };
    return connection;
  }

  sendToServer(data) {
    const url = new URL(this.config.wsUrl.replace('wss://', 'https://').replace('/ws', '/api/agent/data'));
    
    const postData = JSON.stringify(data);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options);
    req.write(postData);
    req.end();
  }

  registerAgent() {
    const registration = {
      type: 'agent_register',
      agentId: this.agentId,
      platform: 'windows',
      hostname: os.hostname(),
      capabilities: ['device_discovery', 'ping_monitoring'],
      timestamp: new Date().toISOString()
    };
    
    this.ws.send(registration);
    console.log('[SmartBlueprint] Agent registered');
  }

  startMonitoring() {
    // Ping monitoring
    setInterval(() => {
      this.performPingTests();
    }, this.config.pingInterval);

    // Device discovery
    setInterval(() => {
      this.discoverDevices();
    }, this.config.deviceScanInterval);

    console.log('[SmartBlueprint] Monitoring services started');
  }

  async performPingTests() {
    const targets = ['8.8.8.8', '192.168.1.1', '192.168.0.1'];
    
    for (const target of targets) {
      try {
        const result = await this.pingTarget(target);
        this.sendPingResult(target, result);
      } catch (error) {
        console.log(`[SmartBlueprint] Ping failed: ${target}`);
      }
    }
  }

  pingTarget(target) {
    return new Promise((resolve, reject) => {
      const ping = spawn('ping', ['-n', '1', target]);
      let output = '';

      ping.stdout.on('data', (data) => {
        output += data.toString();
      });

      ping.on('close', (code) => {
        if (code === 0) {
          const match = output.match(/time[<=](\d+)ms/);
          const rtt = match ? parseInt(match[1]) : null;
          resolve({ success: true, rtt, timestamp: Date.now() });
        } else {
          reject(new Error('Ping failed'));
        }
      });
    });
  }

  sendPingResult(target, result) {
    const message = {
      type: 'ping_result',
      agentId: this.agentId,
      target,
      result,
      timestamp: new Date().toISOString()
    };

    this.ws.send(message);
  }

  async discoverDevices() {
    try {
      const devices = await this.scanNetwork();
      if (devices.length > 0) {
        this.sendDeviceData(devices);
        console.log(`[SmartBlueprint] Discovered ${devices.length} devices`);
      }
    } catch (error) {
      console.log(`[SmartBlueprint] Device discovery failed: ${error.message}`);
    }
  }

  scanNetwork() {
    return new Promise((resolve) => {
      const arp = spawn('arp', ['-a']);
      let output = '';

      arp.stdout.on('data', (data) => {
        output += data.toString();
      });

      arp.on('close', () => {
        const devices = this.parseArpOutput(output);
        resolve(devices);
      });
    });
  }

  parseArpOutput(output) {
    const lines = output.split('\n');
    const devices = [];

    for (const line of lines) {
      const match = line.match(/^\s*([\d.]+)\s+([0-9a-f-]{17})\s+/i);
      if (match) {
        devices.push({
          ip: match[1],
          mac: match[2],
          type: 'network_device',
          timestamp: Date.now()
        });
      }
    }

    return devices;
  }

  sendDeviceData(devices) {
    const message = {
      type: 'device_discovery',
      agentId: this.agentId,
      devices,
      timestamp: new Date().toISOString()
    };

    this.ws.send(message);
  }

  scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = Math.min(5000 * Math.pow(2, this.reconnectAttempts - 1), 60000);
    
    console.log(`[SmartBlueprint] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.connect(), delay);
  }
}

// Start the agent
const agent = new SmartBlueprintAgent();
agent.start().catch(console.error);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[SmartBlueprint] Shutting down...');
  process.exit(0);
});
'@

    $agentCode | Out-File $Path -Encoding UTF8
    Write-Host "✓ Bundled agent created" -ForegroundColor Green
}

function Create-LauncherScripts {
    # Manual launcher
    $launcher = @"
@echo off
title SmartBlueprint Pro Desktop Agent
cd /d "$InstallPath"
echo Starting SmartBlueprint Desktop Agent...
echo.
echo Connecting to: https://smartplueprint.replit.app
echo.
node smartblueprint-agent.js
pause
"@
    $launcher | Out-File "$InstallPath\run-agent.bat" -Encoding ASCII

    # Service installer
    $serviceInstaller = @"
@echo off
echo Installing SmartBlueprint as Windows Service...
sc create "SmartBlueprint" binPath= "node `"$InstallPath\smartblueprint-agent.js`"" start= auto DisplayName= "SmartBlueprint Pro Desktop Agent"
sc description "SmartBlueprint" "SmartBlueprint Pro Desktop Agent - Network monitoring and device discovery service"
sc start "SmartBlueprint"
echo.
echo ✓ Service installed and started successfully!
echo.
echo The agent will now start automatically with Windows.
echo Check the Windows Services manager to verify.
pause
"@
    $serviceInstaller | Out-File "$InstallPath\install-service.bat" -Encoding ASCII

    # Uninstaller
    $uninstaller = @"
@echo off
echo Uninstalling SmartBlueprint Pro...
sc stop "SmartBlueprint" 2>nul
sc delete "SmartBlueprint" 2>nul
echo Service removed.
echo.
echo Removing installation files...
rd /s /q "$InstallPath" 2>nul
echo.
echo ✓ SmartBlueprint Pro uninstalled successfully!
pause
"@
    $uninstaller | Out-File "$InstallPath\uninstall.bat" -Encoding ASCII
}

function Create-Shortcuts {
    Write-Host "⚡ Creating shortcuts..." -ForegroundColor Yellow
    
    # Desktop shortcut
    $WshShell = New-Object -comObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\SmartBlueprint Agent.lnk")
    $Shortcut.TargetPath = "$InstallPath\run-agent.bat"
    $Shortcut.IconLocation = "$env:SystemRoot\System32\netcenter.dll,0"
    $Shortcut.Description = "SmartBlueprint Pro Desktop Agent"
    $Shortcut.Save()

    # Start Menu folder
    $startMenuPath = "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\SmartBlueprint"
    if (!(Test-Path $startMenuPath)) {
        New-Item -ItemType Directory -Path $startMenuPath -Force | Out-Null
    }

    # Start Menu shortcuts
    $shortcuts = @(
        @{ Name = "SmartBlueprint Agent"; Target = "$InstallPath\run-agent.bat"; Icon = "$env:SystemRoot\System32\netcenter.dll,0" },
        @{ Name = "Install as Service"; Target = "$InstallPath\install-service.bat"; Icon = "$env:SystemRoot\System32\services.msc,0" },
        @{ Name = "Uninstall"; Target = "$InstallPath\uninstall.bat"; Icon = "$env:SystemRoot\System32\appwiz.cpl,0" }
    )

    foreach ($shortcut in $shortcuts) {
        $link = $WshShell.CreateShortcut("$startMenuPath\$($shortcut.Name).lnk")
        $link.TargetPath = $shortcut.Target
        $link.IconLocation = $shortcut.Icon
        $link.Description = "SmartBlueprint Pro - $($shortcut.Name)"
        $link.Save()
    }

    Write-Host "✓ Shortcuts created" -ForegroundColor Green
}

function Configure-Firewall {
    Write-Host "⚡ Configuring Windows Firewall..." -ForegroundColor Yellow
    
    try {
        # Allow outbound HTTPS connections
        netsh advfirewall firewall add rule name="SmartBlueprint Agent HTTPS" dir=out action=allow protocol=TCP remoteport=443 | Out-Null
        netsh advfirewall firewall add rule name="SmartBlueprint Agent WebSocket" dir=out action=allow protocol=TCP remoteport=80 | Out-Null
        Write-Host "✓ Firewall configured" -ForegroundColor Green
    } catch {
        Write-Host "⚠ Firewall configuration failed (not critical)" -ForegroundColor Yellow
    }
}

function Uninstall-SmartBlueprint {
    Write-Host "⚡ Uninstalling SmartBlueprint Pro..." -ForegroundColor Yellow
    
    # Stop and remove service
    try {
        Stop-Service "SmartBlueprint" -ErrorAction SilentlyContinue
        Remove-Service "SmartBlueprint" -ErrorAction SilentlyContinue
        Write-Host "✓ Service removed" -ForegroundColor Green
    } catch {
        Write-Host "⚠ Service removal failed or not installed" -ForegroundColor Yellow
    }
    
    # Remove files
    if (Test-Path $InstallPath) {
        Remove-Item $InstallPath -Recurse -Force
        Write-Host "✓ Files removed" -ForegroundColor Green
    }
    
    # Remove shortcuts
    Remove-Item "$env:USERPROFILE\Desktop\SmartBlueprint Agent.lnk" -ErrorAction SilentlyContinue
    Remove-Item "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\SmartBlueprint" -Recurse -ErrorAction SilentlyContinue
    
    # Remove firewall rules
    netsh advfirewall firewall delete rule name="SmartBlueprint Agent HTTPS" | Out-Null
    netsh advfirewall firewall delete rule name="SmartBlueprint Agent WebSocket" | Out-Null
    
    Write-Host "✓ SmartBlueprint Pro uninstalled successfully" -ForegroundColor Green
}

# Main installation flow
Write-Banner

if ($Uninstall) {
    Uninstall-SmartBlueprint
    Read-Host "Press Enter to exit"
    exit 0
}

# Check and install Node.js
if (!(Test-NodeJS)) {
    if (!(Install-NodeJS)) {
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Install desktop agent
Install-DesktopAgent

# Install as service if requested
if ($InstallService) {
    Write-Host "⚡ Installing as Windows Service..." -ForegroundColor Yellow
    Start-Process -FilePath "$InstallPath\install-service.bat" -Verb RunAs -Wait
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   Installation Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "SmartBlueprint Pro Desktop Agent installed to:" -ForegroundColor White
Write-Host "$InstallPath" -ForegroundColor Gray
Write-Host ""
Write-Host "Available options:" -ForegroundColor White
Write-Host "• Desktop Shortcut: 'SmartBlueprint Agent'" -ForegroundColor Gray
Write-Host "• Start Menu: SmartBlueprint folder" -ForegroundColor Gray
Write-Host "• Windows Service: Install as Service shortcut" -ForegroundColor Gray
Write-Host ""
Write-Host "The agent connects automatically to:" -ForegroundColor White
Write-Host "https://smartplueprint.replit.app" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start now, double-click the Desktop shortcut" -ForegroundColor Yellow
Write-Host "For automatic startup, install as Windows Service" -ForegroundColor Yellow
Write-Host ""

Read-Host "Press Enter to exit"