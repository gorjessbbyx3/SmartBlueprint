# SmartBlueprint Pro - Windows GUI Application

## Quick Start Guide

### Option 1: One-Click Launch (Recommended)
1. **Double-click `SmartBlueprint-Pro-GUI.bat`**
2. Wait for the GUI window to open (10-15 seconds)
3. The application will show a loading screen while starting all services
4. Your full SmartBlueprint Pro interface will appear in a native Windows window

### Option 2: Manual Launch
1. Install Node.js from https://nodejs.org (if not installed)
2. Open Command Prompt in this directory
3. Run: `npm install`
4. Run: `npm start`

## What You Get

### Native Windows Application
- **True GUI Interface**: Opens in a proper Windows application window
- **No Terminal Windows**: Everything runs behind the scenes
- **Native Integration**: Works like any other Windows desktop application
- **Menu System**: File, View, Tools, and Help menus with keyboard shortcuts

### Complete SmartBlueprint Pro Features
- **React Web Interface**: Full responsive web application embedded in Electron
- **7+ AI/ML Systems**: Anomaly detection, predictive maintenance, signal analysis
- **Real-time Monitoring**: Live device discovery and network analysis
- **Advanced Signal Processing**: Kalman filtering, RSSI analysis, triangulation
- **Network Mapping**: Visual device positioning and floor plan integration
- **Background Services**: Python ML services run automatically without user interaction

### Technical Architecture
```
┌─────────────────────────────────────────┐
│           Electron Window               │
│  ┌─────────────────────────────────┐    │
│  │      React Frontend             │    │
│  │   (SmartBlueprint Pro Web UI)   │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│        Express.js Server                │
│       (Backend API Services)            │
└─────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│       Python ML Services               │
│  • Device Scanner                       │
│  • ML Inference Engine                  │
│  • Centralized Logging                  │
└─────────────────────────────────────────┘
```

## System Requirements

### Minimum Requirements
- Windows 10 (64-bit) or Windows 11
- 4GB RAM
- 2GB free disk space
- Internet connection for initial setup

### Recommended Requirements
- Windows 11 (64-bit)
- 8GB RAM or more
- 4GB free disk space
- Dedicated network adapter

### Software Dependencies
- **Node.js 16+**: Automatically installed via the launcher script
- **Python 3.8+**: Optional, for advanced ML features
- **Windows Defender**: Ensure SmartBlueprint Pro is allowed through firewall

## Features Overview

### Device Discovery & Monitoring
- **Multi-Protocol Scanning**: SSDP, mDNS, UPnP, ARP table analysis
- **Real-time Discovery**: Continuous monitoring for new devices
- **Device Classification**: Automatic identification of device types
- **Signal Strength Analysis**: RSSI monitoring and signal quality metrics

### AI & Machine Learning
- **Anomaly Detection**: Isolation Forest and advanced pattern recognition
- **Predictive Maintenance**: Early warning system for device failures
- **Signal Processing**: Advanced algorithms for location estimation
- **Behavior Analysis**: Learning normal device interaction patterns

### User Interface
- **Dashboard**: Overview of network health and device status
- **Device Control**: Direct interaction with smart home devices
- **Network Map**: Visual representation of device locations
- **Real-time Charts**: Live data visualization and analytics
- **Alert System**: Notifications for network issues and anomalies

## Menu System

### File Menu
- **New Scan (Ctrl+N)**: Start a new network discovery scan
- **Export Data (Ctrl+E)**: Save current data to JSON file
- **Quit**: Close the application

### View Menu
- **Reload (F5)**: Refresh the interface
- **Toggle Developer Tools (F12)**: Debug interface (advanced users)
- **Zoom Controls**: Adjust interface size
- **Full Screen (F11)**: Toggle full-screen mode

### Tools Menu
- **Network Diagnostic**: Run comprehensive network health check
- **AI Model Status**: View ML model performance and statistics
- **Device Discovery**: Force immediate device scan

### Help Menu
- **About**: Application information and version details
- **Documentation**: Link to online help resources

## Data Storage

### Local Storage
- Device information and scan history
- User preferences and settings
- ML model training data
- Network topology cache

### Privacy & Security
- All data remains on your local machine
- No cloud synchronization without explicit consent
- Encrypted storage for sensitive device information
- Network traffic analysis stays local

## Troubleshooting

### Application Won't Start
1. **Run as Administrator**: Right-click the .bat file and select "Run as administrator"
2. **Check Node.js**: Ensure Node.js is properly installed
3. **Firewall Settings**: Allow SmartBlueprint Pro through Windows Firewall
4. **Antivirus**: Add the application folder to antivirus exclusions

### No Devices Found
1. **Network Connection**: Ensure you're connected to your local network
2. **Router Settings**: Check if device discovery is enabled on your router
3. **VPN/Proxy**: Disable VPN or proxy connections temporarily
4. **Network Profile**: Ensure Windows network profile is set to "Private"

### Performance Issues
1. **Close Other Applications**: Free up system resources
2. **Update Drivers**: Ensure network adapter drivers are current
3. **Restart Router**: Refresh network device tables
4. **Check RAM Usage**: Monitor system memory consumption

### Python Services Not Starting
1. **Install Python**: Download from https://python.org
2. **Check PATH**: Ensure Python is in system PATH
3. **Install Dependencies**: Run `pip install -r requirements.txt`
4. **Manual Start**: Run Python services individually for debugging

## Advanced Configuration

### Custom Port Configuration
The application uses port 5000 by default. To change:
1. Edit `electron-main.js`
2. Modify the `SERVER_PORT` constant
3. Restart the application

### ML Model Tuning
- Access AI Model Status from Tools menu
- Adjust sensitivity settings for anomaly detection
- Configure alert thresholds
- Enable/disable specific ML algorithms

### Network Scanner Settings
- Customize scan intervals
- Set device trust levels
- Configure discovery protocols
- Adjust signal processing parameters

## Support & Updates

### Getting Help
- Use the built-in Help menu for quick reference
- Check the Tools > Network Diagnostic for connectivity issues
- Review console output in Developer Tools for technical issues

### Version Information
- Current Version: 1.0.0
- Release Date: June 2025
- Platform: Windows 10/11 x64
- Architecture: Electron + Express.js + Python ML

### Known Limitations
- Windows only (macOS and Linux versions planned)
- Requires administrator privileges for some network operations
- Some routers may block device discovery protocols
- Python ML services require additional installation for full functionality

## File Structure
```
SmartBlueprint-Windows-GUI/
├── SmartBlueprint-Pro-GUI.bat    # Main launcher
├── electron-main.js               # Electron main process
├── electron-preload.js            # Electron preload script
├── package.json                   # Node.js dependencies
├── dist/                          # React frontend build
├── server/                        # Express.js backend
├── shared/                        # Shared type definitions
├── *.py                          # Python ML services
└── README.md                      # This documentation
```

The application provides a complete IoT monitoring solution with enterprise-grade features in a user-friendly desktop interface.