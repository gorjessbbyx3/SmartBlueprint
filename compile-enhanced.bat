@echo off
REM SmartBlueprint Pro - Enhanced Build Script
REM Builds complete production version with all advanced features

echo SmartBlueprint Pro - Enhanced Production Build
echo ===============================================

REM Verify Visual Studio environment
cl.exe >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Visual Studio compiler not found
    echo Please run from "Developer Command Prompt for VS"
    pause
    exit /b 1
)

REM Clean previous builds
if exist SmartBlueprint-Enhanced-*.exe del SmartBlueprint-Enhanced-*.exe
if exist *.obj del *.obj

echo Building enhanced version with comprehensive features...
echo.

REM Build 64-bit version
echo [1/2] Building 64-bit enhanced version...
cl /EHsc /MT /O2 /DWIN32_LEAN_AND_MEAN /favor:AMD64 /Fe:SmartBlueprint-Enhanced-x64.exe SmartBlueprint-Enhanced.cpp ws2_32.lib iphlpapi.lib icmp.lib user32.lib kernel32.lib

if %errorlevel% equ 0 (
    echo ✓ 64-bit enhanced build successful
    if exist *.obj del *.obj
) else (
    echo ✗ 64-bit enhanced build failed
)

echo.

REM Build 32-bit version
echo [2/2] Building 32-bit enhanced version...
cl /EHsc /MT /O2 /DWIN32_LEAN_AND_MEAN /favor:IA32 /Fe:SmartBlueprint-Enhanced-x86.exe SmartBlueprint-Enhanced.cpp ws2_32.lib iphlpapi.lib icmp.lib user32.lib kernel32.lib

if %errorlevel% equ 0 (
    echo ✓ 32-bit enhanced build successful
    if exist *.obj del *.obj
) else (
    echo ✗ 32-bit enhanced build failed
)

echo.
echo Enhanced Build Summary:
echo ======================

if exist SmartBlueprint-Enhanced-x64.exe (
    echo ✓ SmartBlueprint-Enhanced-x64.exe - Full-featured 64-bit version
    dir SmartBlueprint-Enhanced-x64.exe | findstr SmartBlueprint
)

if exist SmartBlueprint-Enhanced-x86.exe (
    echo ✓ SmartBlueprint-Enhanced-x86.exe - Full-featured 32-bit version  
    dir SmartBlueprint-Enhanced-x86.exe | findstr SmartBlueprint
)

echo.
echo Enhanced Features Included:
echo ==========================
echo 1. ✓ Live Device Scanning (ARP + Ping Sweep)
echo 2. ✓ CSV Logging & Export with timestamps
echo 3. ✓ ASCII Signal Strength Bars
echo 4. ✓ Last Seen Tracker with time formatting
echo 5. ✓ Filtered Views (All/Online/Offline/Unauthorized)
echo 6. ✓ Security Flags & Rogue Device Detection
echo 7. ✓ Settings Loader (settings.ini configuration)
echo.
echo Additional Production Features:
echo ===============================
echo • Real Windows API network scanning (GetIpNetTable)
echo • ICMP ping-based signal strength measurement
echo • Signal history graphing with ASCII bars
echo • MAC address whitelist security validation
echo • Comprehensive device tracking with scan counts
echo • Configurable scan intervals and logging
echo • Cross-architecture Windows compatibility
echo.
echo Installation & Usage:
echo =====================
echo • Run as Administrator for full network access
echo • Edit settings.ini to configure scan behavior
echo • Creates smartblueprint_scan.csv for logging
echo • Press F to cycle through filter modes
echo • Press R for manual network refresh
echo.

REM Create default settings file if it doesn't exist
if not exist settings.ini (
    echo Creating default settings.ini...
    echo [Scan] > settings.ini
    echo IntervalSeconds=30 >> settings.ini
    echo LogFile=smartblueprint_scan.csv >> settings.ini
    echo MACWhitelist= >> settings.ini
    echo EnableSecurityFlags=true >> settings.ini
    echo AutoRefresh=true >> settings.ini
    echo ✓ Default configuration created
    echo.
)

pause