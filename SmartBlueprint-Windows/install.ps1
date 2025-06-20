# SmartBlueprint Pro - Windows Installation Script
# PowerShell script for advanced installation and setup

Write-Host "SmartBlueprint Pro - Windows Desktop Installation" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check Windows version
$osVersion = [System.Environment]::OSVersion.Version
Write-Host "Detected Windows version: $($osVersion.Major).$($osVersion.Minor)" -ForegroundColor Yellow

if ($osVersion.Major -lt 10) {
    Write-Host "WARNING: Windows 10 or later recommended for optimal performance" -ForegroundColor Red
}

# Check available disk space
$drive = Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='C:'"
$freeSpaceGB = [math]::Round($drive.FreeSpace / 1GB, 2)
Write-Host "Available disk space: $freeSpaceGB GB" -ForegroundColor Green

if ($freeSpaceGB -lt 2) {
    Write-Host "ERROR: Insufficient disk space. Minimum 2GB required." -ForegroundColor Red
    exit 1
}

# Check memory
$totalRAM = [math]::Round((Get-WmiObject -Class Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)
Write-Host "Total system memory: $totalRAM GB" -ForegroundColor Green

if ($totalRAM -lt 4) {
    Write-Host "WARNING: 4GB RAM recommended for optimal performance" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Installing SmartBlueprint Pro..." -ForegroundColor Green

# Create application directory
$installPath = "$env:PROGRAMFILES\SmartBlueprint Pro"
if (!(Test-Path $installPath)) {
    New-Item -ItemType Directory -Path $installPath -Force | Out-Null
    Write-Host "Created installation directory: $installPath" -ForegroundColor Green
}

# Copy application files
Write-Host "Copying application files..." -ForegroundColor Yellow
Copy-Item "SmartBlueprint-Pro.exe" -Destination $installPath
Copy-Item "README.md" -Destination $installPath

# Create desktop shortcut
$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = "$desktopPath\SmartBlueprint Pro.lnk"
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "$installPath\SmartBlueprint-Pro.exe"
$shortcut.WorkingDirectory = $installPath
$shortcut.Description = "SmartBlueprint Pro - AI-Powered IoT Device Monitoring"
$shortcut.Save()
Write-Host "Created desktop shortcut" -ForegroundColor Green

# Create start menu entry
$startMenuPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs"
$startMenuShortcut = "$startMenuPath\SmartBlueprint Pro.lnk"
$shortcut2 = $shell.CreateShortcut($startMenuShortcut)
$shortcut2.TargetPath = "$installPath\SmartBlueprint-Pro.exe"
$shortcut2.WorkingDirectory = $installPath
$shortcut2.Description = "SmartBlueprint Pro - AI-Powered IoT Device Monitoring"
$shortcut2.Save()
Write-Host "Created Start Menu entry" -ForegroundColor Green

# Configure Windows Firewall (if needed)
Write-Host "Configuring Windows Firewall..." -ForegroundColor Yellow
try {
    New-NetFirewallRule -DisplayName "SmartBlueprint Pro" -Direction Inbound -Program "$installPath\SmartBlueprint-Pro.exe" -Action Allow -Protocol TCP -LocalPort 3000 -ErrorAction SilentlyContinue
    Write-Host "Firewall rule created successfully" -ForegroundColor Green
} catch {
    Write-Host "Note: Manual firewall configuration may be required" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Installation completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "SmartBlueprint Pro Features:" -ForegroundColor Cyan
Write-Host "  • Real-time device monitoring and discovery" -ForegroundColor White
Write-Host "  • AI-powered anomaly detection (7+ ML systems)" -ForegroundColor White
Write-Host "  • Interactive network mapping and visualization" -ForegroundColor White
Write-Host "  • Predictive maintenance alerts" -ForegroundColor White
Write-Host "  • Complete offline operation" -ForegroundColor White
Write-Host ""
Write-Host "Launch Options:" -ForegroundColor Cyan
Write-Host "  • Desktop shortcut: SmartBlueprint Pro" -ForegroundColor White
Write-Host "  • Start Menu: SmartBlueprint Pro" -ForegroundColor White
Write-Host "  • Direct execution: $installPath\SmartBlueprint-Pro.exe" -ForegroundColor White
Write-Host ""
Write-Host "The application will automatically:" -ForegroundColor Yellow
Write-Host "  - Start embedded server on localhost:3000" -ForegroundColor White
Write-Host "  - Begin network device discovery" -ForegroundColor White
Write-Host "  - Initialize ML anomaly detection" -ForegroundColor White
Write-Host "  - Open web interface in built-in browser" -ForegroundColor White
Write-Host ""

$launch = Read-Host "Launch SmartBlueprint Pro now? (Y/N)"
if ($launch -eq "Y" -or $launch -eq "y") {
    Write-Host "Starting SmartBlueprint Pro..." -ForegroundColor Green
    Start-Process "$installPath\SmartBlueprint-Pro.exe"
}

Write-Host ""
Write-Host "Installation complete. Enjoy SmartBlueprint Pro!" -ForegroundColor Green