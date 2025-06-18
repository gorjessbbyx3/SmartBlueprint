# SmartBlueprint Pro - Desktop Application Instructions

## Quick Start - One-Click Build

### Option 1: Complete Desktop App (Recommended)
```bash
create-windows-desktop-app.bat
```
- Creates standalone Windows executable with complete web interface
- Embeds Express server, WebSocket support, and all features
- Generates professional installer with shortcuts
- Result: `SmartBlueprint-Pro.exe` ready to run

### Option 2: Professional Console Version
```bash
compile-professional.bat
```
- Creates console applications with all modern improvements
- Builds both x64 and x86 versions for compatibility
- Result: `SmartBlueprint-Professional-x64.exe` and `SmartBlueprint-Professional-x86.exe`

## System Requirements

**Windows 10/11** (64-bit or 32-bit)
- Visual Studio Build Tools (for compilation)
- Administrator privileges (for network scanning)
- 100MB free disk space

## Build Methods

### Method 1: Automated Batch Scripts
**For complete desktop app:**
1. Double-click `create-windows-desktop-app.bat`
2. Wait for build completion (2-3 minutes)
3. Run `SmartBlueprint-Pro.exe`

**For professional console:**
1. Open "Developer Command Prompt for VS"
2. Run `compile-professional.bat`
3. Run `SmartBlueprint-Professional-x64.exe`

### Method 2: Visual Studio
1. Open `SmartBlueprintPro.sln`
2. Select Release configuration
3. Build Solution (Ctrl+Shift+B)
4. Find executables in `bin\x64\Release\`

### Method 3: CMake Build System
```bash
mkdir build
cd build
cmake .. -DBUILD_GUI=ON -DENABLE_IPV6=ON
cmake --build . --config Release
```

## Application Types

### Desktop App (`SmartBlueprint-Pro.exe`)
**What it includes:**
- Complete web interface in native Windows window
- Dashboard, analytics, device management, settings
- Embedded server running on localhost:3000
- Professional menus, shortcuts, and system integration

**How to use:**
- Double-click to launch
- No browser needed - everything runs locally
- Use File menu for manual scans and exports
- Settings persist between sessions

### Professional Console (`SmartBlueprint-Professional-x64.exe`)
**What it includes:**
- Real-time network device scanning
- IPv6 and IPv4 support
- CSV/JSON/XLSX export options
- Windows Toast Notifications
- Thread-safe operations

**How to use:**
- Run as Administrator for full network access
- Press 'R' for manual scan
- Press 'F' to cycle filter modes
- Press 'E' to export network topology
- Press 'Q' to exit (with confirmation)

### GUI Version (`SmartBlueprint-GUI.exe`)
**What it includes:**
- Visual interface with Dear ImGui
- Real-time device tables and filters
- Progress indicators for scans
- Settings panel with advanced options

**How to use:**
- Click "Scan Now" for immediate scan
- Use filters to find specific devices
- Configure IPv6 and notifications in Settings
- Export data through File menu

## Configuration

### Settings File (`settings.ini`)
```ini
[General]
AutoRefresh=true
RefreshInterval=30
EnableIPv6=true
EnableNotifications=true
ExportFormat=csv
MACWhitelist=aa:bb:cc,11:22:33
```

### Permission Requirements
**For full functionality:**
- Run as Administrator (recommended)
- Allow through Windows Firewall
- Enable ICMP in network settings

**Without Administrator:**
- Limited to basic network discovery
- Some WiFi features unavailable
- Ping measurements may fail

## Troubleshooting

### Build Issues
**"cl.exe not found"**
- Open "Developer Command Prompt for VS"
- Install Visual Studio Build Tools

**"Access denied" during build**
- Run command prompt as Administrator
- Check antivirus software blocking

### Runtime Issues
**"Can't run on this PC"**
- Download x86 version for 32-bit systems
- Install Visual C++ Redistributable

**"Network scan fails"**
- Run as Administrator
- Check Windows Firewall settings
- Verify network adapter enabled

**"No devices found"**
- Ensure connected to network
- Check network adapter status
- Try manual scan with 'R' key

### Permission Issues
**"ICMP permission denied"**
- Run as Administrator
- Enable ICMP in Windows Firewall
- Check Group Policy settings

**"WiFi API unavailable"**
- Verify WiFi adapter present
- Update network drivers
- Check Windows version compatibility

## Features Available

### Network Discovery
- IPv4 and IPv6 device scanning
- Real WiFi signal strength (RSSI)
- Device type classification
- Hostname resolution with timeout

### Data Management
- Per-device timestamped logging
- Multiple export formats
- Persistent configuration
- Scan history tracking

### Security Features
- MAC address whitelist
- Unauthorized device alerts
- Windows Toast Notifications
- Device change monitoring

### Professional Tools
- Network topology export
- Thread-safe operations
- Visual scan feedback
- Error recovery systems

## Usage Examples

### Basic Monitoring
1. Launch application
2. Enable auto-refresh (30-second intervals)
3. Monitor device list for changes
4. Review alerts for new devices

### Security Auditing
1. Configure MAC whitelist in settings
2. Enable security notifications
3. Monitor for unauthorized devices
4. Export reports for analysis

### Network Analysis
1. Enable IPv6 scanning
2. Export data in JSON format
3. Use network topology visualization
4. Track signal strength trends

### Troubleshooting Networks
1. Use manual scans to test connectivity
2. Monitor RSSI values for weak signals
3. Check device classification accuracy
4. Verify hostname resolution

The desktop applications provide professional network monitoring with authentic data collection and comprehensive Windows integration.