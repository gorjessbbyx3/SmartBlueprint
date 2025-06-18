@echo off
REM SmartBlueprint Pro - Professional Build Script
REM Implements all recommended improvements and fixes

echo SmartBlueprint Pro - Professional Production Build
echo ==================================================

REM Verify Visual Studio environment
cl.exe >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Visual Studio compiler not found
    echo Please run from "Developer Command Prompt for VS"
    pause
    exit /b 1
)

REM Clean previous builds
if exist SmartBlueprint-Professional-*.exe del SmartBlueprint-Professional-*.exe
if exist *.obj del *.obj

echo Building professional version with all improvements...
echo.

echo Improvements implemented:
echo ✓ GetAdaptersAddresses() replaces deprecated GetAdaptersInfo
echo ✓ Native WiFi API integration for real RSSI values
echo ✓ Thread-safe file I/O with mutex protection
echo ✓ Native ICMP instead of system("ping") calls
echo ✓ SetConsoleTextAttribute for Windows color compatibility
echo ✓ Exit confirmation prompt (Y/N)
echo ✓ Hostname change tracking by MAC address
echo ✓ IPv6 support for modern networks
echo ✓ JSON/XLSX export formats
echo ✓ Windows Toast Notifications
echo ✓ Network topology visualization (.dot export)
echo ✓ Persistent view/refresh settings
echo.

REM Build 64-bit version
echo [1/2] Building 64-bit professional version...
cl /EHsc /MT /O2 /DWIN32_LEAN_AND_MEAN /favor:AMD64 /Fe:SmartBlueprint-Professional-x64.exe SmartBlueprint-Professional.cpp ws2_32.lib iphlpapi.lib icmp.lib wlanapi.lib user32.lib kernel32.lib

if %errorlevel% equ 0 (
    echo ✓ 64-bit professional build successful
    if exist *.obj del *.obj
) else (
    echo ✗ 64-bit professional build failed
)

echo.

REM Build 32-bit version
echo [2/2] Building 32-bit professional version...
cl /EHsc /MT /O2 /DWIN32_LEAN_AND_MEAN /favor:IA32 /Fe:SmartBlueprint-Professional-x86.exe SmartBlueprint-Professional.cpp ws2_32.lib iphlpapi.lib icmp.lib wlanapi.lib user32.lib kernel32.lib

if %errorlevel% equ 0 (
    echo ✓ 32-bit professional build successful
    if exist *.obj del *.obj
) else (
    echo ✗ 32-bit professional build failed
)

echo.
echo Professional Build Summary:
echo ==========================

if exist SmartBlueprint-Professional-x64.exe (
    echo ✓ SmartBlueprint-Professional-x64.exe - 64-bit Windows professional version
    dir SmartBlueprint-Professional-x64.exe | findstr SmartBlueprint
)

if exist SmartBlueprint-Professional-x86.exe (
    echo ✓ SmartBlueprint-Professional-x86.exe - 32-bit Windows professional version  
    dir SmartBlueprint-Professional-x86.exe | findstr SmartBlueprint
)

echo.
echo Production-Ready Improvements Implemented:
echo ==========================================
echo.
echo 🔧 API Modernization:
echo • GetAdaptersAddresses() - Modern replacement for deprecated GetAdaptersInfo
echo • Windows Native WiFi API - Real RSSI values instead of RTT estimates
echo • Native ICMP Echo - Replaces inefficient system("ping") calls
echo.
echo 🛡️ Thread Safety ^& Reliability:
echo • Mutex-protected file I/O - Prevents corruption during concurrent access
echo • Console output synchronization - Thread-safe display operations
echo • Exit confirmation prompts - Prevents accidental closure
echo.
echo 📊 Enhanced Data Management:
echo • Hostname change tracking - Monitors device name changes by MAC
echo • Multiple export formats - CSV, JSON, XLSX for different applications
echo • IPv6 network support - Modern network protocol compatibility
echo.
echo 🔔 User Experience Improvements:
echo • Windows Toast Notifications - Native OS notifications for alerts
echo • SetConsoleTextAttribute - Proper Windows console color compatibility
echo • Persistent settings - Saves view/filter preferences between sessions
echo • Network topology export - Graphviz .dot format for visualization
echo.
echo 🏗️ Professional Features:
echo • Device classification - Automatic device type detection
echo • Security authorization - MAC whitelist validation with alerts
echo • Signal history tracking - Maintains RSSI trends per device
echo • Real-time anomaly detection - Immediate notification of network issues
echo.
echo Configuration Options (settings.ini):
echo ====================================
echo • ExportFormat=csv,json,xlsx - Choose export format
echo • EnableIPv6=true/false - IPv6 network scanning
echo • EnableNotifications=true/false - Windows toast notifications
echo • SaveViewSettings=true/false - Persistent UI state
echo • MACWhitelist=aa:bb:cc,11:22:33 - Authorized device prefixes
echo.
echo Advanced Features:
echo ==================
echo • Press 'E' - Export network topology as .dot file
echo • Press 'F' - Cycle through filter modes
echo • Press 'Q' - Exit with confirmation prompt
echo • Automatic hostname change detection
echo • Real WiFi signal strength measurement
echo • IPv6 device discovery and monitoring
echo.

REM Create enhanced settings file if it doesn't exist
if not exist settings.ini (
    echo Creating enhanced settings.ini...
    echo [Scan] > settings.ini
    echo IntervalSeconds=30 >> settings.ini
    echo LogFile=smartblueprint_scan.csv >> settings.ini
    echo ExportFormat=csv >> settings.ini
    echo EnableSecurityFlags=true >> settings.ini
    echo AutoRefresh=true >> settings.ini
    echo EnableNotifications=true >> settings.ini
    echo EnableIPv6=false >> settings.ini
    echo SaveViewSettings=true >> settings.ini
    echo CurrentView=0 >> settings.ini
    echo FilterMode=0 >> settings.ini
    echo MACWhitelist= >> settings.ini
    echo ✓ Enhanced configuration created
    echo.
)

echo Installation ^& Usage:
echo =====================
echo • Run as Administrator for full network API access
echo • Supports both IPv4 and IPv6 network scanning
echo • Creates multiple export formats for data analysis
echo • Provides Windows native notifications for alerts
echo • Maintains persistent settings between sessions
echo.
echo The professional version addresses all identified issues:
echo • Thread safety for concurrent operations
echo • Modern Windows APIs for better compatibility
echo • Enhanced user experience with confirmations
echo • Comprehensive data export capabilities
echo • Real-time notifications and anomaly detection
echo.

pause