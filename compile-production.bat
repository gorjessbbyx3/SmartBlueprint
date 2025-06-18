@echo off
REM SmartBlueprint Pro - Production Build Script
REM Compiles enhanced version with real network scanning

echo SmartBlueprint Pro - Production Build
echo =====================================

REM Verify Visual Studio environment
cl.exe >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Visual Studio compiler not found
    echo Please run from "Developer Command Prompt for VS"
    pause
    exit /b 1
)

REM Clean previous builds
if exist SmartBlueprint-*.exe del SmartBlueprint-*.exe
if exist *.obj del *.obj

echo Building production version with authentic network scanning...
echo.

REM Build 64-bit version
echo [1/2] Building 64-bit version...
cl /EHsc /MT /O2 /DWIN32_LEAN_AND_MEAN /favor:AMD64 /Fe:SmartBlueprint-Pro-x64.exe SmartBlueprint-Production.cpp ws2_32.lib iphlpapi.lib icmp.lib user32.lib kernel32.lib

if %errorlevel% equ 0 (
    echo ✓ 64-bit build successful
    if exist *.obj del *.obj
) else (
    echo ✗ 64-bit build failed
)

echo.

REM Build 32-bit version
echo [2/2] Building 32-bit version...
cl /EHsc /MT /O2 /DWIN32_LEAN_AND_MEAN /favor:IA32 /Fe:SmartBlueprint-Pro-x86.exe SmartBlueprint-Production.cpp ws2_32.lib iphlpapi.lib icmp.lib user32.lib kernel32.lib

if %errorlevel% equ 0 (
    echo ✓ 32-bit build successful
    if exist *.obj del *.obj
) else (
    echo ✗ 32-bit build failed
)

echo.
echo Production Build Summary:
echo ========================

if exist SmartBlueprint-Pro-x64.exe (
    echo ✓ SmartBlueprint-Pro-x64.exe - Production 64-bit Windows
    dir SmartBlueprint-Pro-x64.exe | findstr SmartBlueprint
)

if exist SmartBlueprint-Pro-x86.exe (
    echo ✓ SmartBlueprint-Pro-x86.exe - Production 32-bit Windows  
    dir SmartBlueprint-Pro-x86.exe | findstr SmartBlueprint
)

if not exist SmartBlueprint-Pro-x64.exe if not exist SmartBlueprint-Pro-x86.exe (
    echo ✗ No executables created - check build errors above
    pause
    exit /b 1
)

echo.
echo Production Features:
echo ===================
echo • Real Windows API network scanning (GetIpNetTable)
echo • Authentic RSSI measurement via ICMP ping
echo • ARP table device discovery
echo • Real-time anomaly detection with confidence scoring
echo • Persistent CSV scan history logging
echo • 4 interactive views (Dashboard, Devices, Help, History)
echo • Cross-architecture compatibility (x64/x86)
echo • Static linking (no DLL dependencies)
echo.
echo Installation:
echo • Run as Administrator for full network access
echo • Creates smartblueprint_scan_history.csv for logging
echo • No external dependencies required
echo.

pause