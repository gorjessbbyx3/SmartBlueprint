# SmartBlueprint Pro - Windows Executable Build Guide

## Complete Solution for Windows Compatibility Issues

This guide addresses all common Windows executable compatibility problems including architecture mismatches, missing dependencies, and blocked executables.

## Prerequisites

### Required Tools
- **Visual Studio 2019 or 2022** with C++ tools
- **CMake 3.16+** 
- **Git** (for source control)

### Quick Installation
```batch
# Install via winget (Windows Package Manager)
winget install Microsoft.VisualStudio.2022.Community
winget install Kitware.CMake
winget install Git.Git
```

## Build Process

### 1. Architecture Detection & Targeting

The build system automatically detects your system architecture and creates the correct executable:

```batch
# Run the automated build script
build-windows-executable.bat
```

**What it does:**
- Detects x64 vs x86 architecture automatically
- Configures CMake with correct platform targeting
- Links all dependencies statically (no external DLLs required)
- Creates architecture-specific executable name

### 2. Build Configuration

The CMakeLists.txt is configured for:
- **Static linking**: No runtime dependencies
- **Console subsystem**: Proper CLI behavior
- **Windows manifest**: Compatibility with all Windows versions
- **Architecture targeting**: Builds for your specific system

### 3. Common Issues & Solutions

#### Issue 1: Architecture Mismatch
**Problem**: Built for ARM/64-bit but running on 32-bit (or vice versa)

**Solution**: Build script auto-detects and targets correctly
```batch
echo %PROCESSOR_ARCHITECTURE%  # Check your architecture
build-windows-executable.bat   # Builds for detected architecture
```

#### Issue 2: Missing Dependencies
**Problem**: DLLs or runtime libraries not found

**Solution**: Static linking includes everything
- All dependencies bundled into single .exe
- No Visual C++ Redistributable required
- No external DLL files needed

#### Issue 3: Windows Blocking Executable
**Problem**: SmartScreen or UAC blocking execution

**Solutions**:
1. **Right-click → Properties → Unblock**
2. **Run as Administrator** (recommended for network access)
3. **Add to Windows Defender exclusions**

#### Issue 4: Corrupted Build
**Problem**: Incomplete or corrupted executable

**Solution**: Clean rebuild process
```batch
# Clean previous builds
rmdir /s /q build

# Fresh build
build-windows-executable.bat
```

## Architecture Compatibility

### x64 (64-bit) Systems
- Creates: `SmartBlueprint-x64.exe`
- Compatible with: Windows 10/11 64-bit
- Memory limit: Unlimited

### x86 (32-bit) Systems  
- Creates: `SmartBlueprint-x86.exe`
- Compatible with: Windows 7/8/10/11 32-bit
- Memory limit: 4GB

## Network Permissions

SmartBlueprint Pro requires network access for device discovery:

### Administrator Mode (Recommended)
```batch
# Run Command Prompt as Administrator
# Navigate to SmartBlueprint folder
cd C:\path\to\SmartBlueprint
SmartBlueprint-x64.exe
```

### Firewall Configuration
Windows may prompt for firewall access:
1. Allow "Private networks" access
2. Allow "Public networks" if scanning public WiFi
3. Create firewall rule for permanent access

## Troubleshooting

### Build Fails
1. **Check Visual Studio installation**
   ```batch
   where cl  # Should find MSVC compiler
   ```

2. **Run from Developer Command Prompt**
   - Start Menu → Visual Studio → Developer Command Prompt
   - Navigate to project folder
   - Run build script

3. **CMake not found**
   ```batch
   where cmake  # Should find CMake
   # Add to PATH if missing
   ```

### Executable Won't Run
1. **Check file integrity**
   ```batch
   dir SmartBlueprint-*.exe  # Verify file exists and size > 0
   ```

2. **Test basic execution**
   ```batch
   SmartBlueprint-x64.exe --help  # Should show help text
   ```

3. **Check Windows Event Viewer**
   - Windows Logs → Application
   - Look for SmartBlueprint errors

### No Devices Found
1. **Check network connection**
   ```batch
   ipconfig  # Verify network adapter active
   ```

2. **Run as Administrator**
   - Required for ARP table access
   - Enables raw socket operations

3. **Disable VPN temporarily**
   - VPNs can interfere with local scanning
   - Test with VPN disconnected

## Production Deployment

### Single File Distribution
The built executable is completely self-contained:
- No installation required
- No registry entries
- No external dependencies
- Portable across Windows systems

### System Requirements
- **OS**: Windows 7 SP1 or later
- **RAM**: 256 MB minimum, 512 MB recommended  
- **Disk**: 50 MB free space
- **Network**: Active network adapter

### Performance Optimization
- **CPU**: Multi-core recommended for ML processing
- **Network**: Gigabit Ethernet for large networks
- **Memory**: More RAM enables larger device tracking

## Security Considerations

### Network Access
- Scans local network only
- No internet connectivity required
- No data transmitted externally
- All processing local to machine

### Data Storage
- Device data stored in memory only
- Optional CSV export for analysis
- No persistent data collection
- Privacy-focused design

## Support

### Common Error Messages

**"Application cannot start correctly"**
- Architecture mismatch - rebuild for correct platform
- Missing Visual C++ runtime - use static build

**"Windows cannot access device"**  
- Insufficient permissions - run as Administrator
- Network adapter disabled - check network settings

**"No devices detected"**
- Network scanning blocked - check firewall
- Wrong network adapter - verify connection

### Build Verification
After successful build, verify:
```batch
# Check executable exists and is correct architecture
SmartBlueprint-x64.exe --version

# Test basic functionality
SmartBlueprint-x64.exe --scan-test

# Verify dependencies (should show none)
dumpbin /dependents SmartBlueprint-x64.exe
```

This build system ensures reliable Windows executable creation that addresses all common compatibility issues while providing enterprise-grade network monitoring capabilities.