@echo off
REM Simple Windows compilation script for SmartBlueprint Pro
REM Fixes architecture mismatch and dependency issues

echo Building SmartBlueprint Pro for Windows...

REM Check for compiler
where cl >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Visual Studio compiler not found
    echo Please run from "Developer Command Prompt for VS"
    echo Or install Visual Studio with C++ tools
    pause
    exit /b 1
)

REM Clean previous builds
if exist SmartBlueprint-*.exe del SmartBlueprint-*.exe
if exist *.obj del *.obj

echo Building for both x86 and x64 architectures...
echo.

REM Build 64-bit version
echo [1/2] Building 64-bit version...
cl /EHsc /MT /O2 /DWIN32_LEAN_AND_MEAN /favor:AMD64 /Fe:SmartBlueprint-x64.exe SmartBlueprint-Windows.cpp ws2_32.lib iphlpapi.lib icmp.lib user32.lib kernel32.lib

if %errorlevel% equ 0 (
    echo ✓ 64-bit build successful
    if exist *.obj del *.obj
) else (
    echo ✗ 64-bit build failed
)

echo.

REM Build 32-bit version if available
echo [2/2] Attempting 32-bit build...
cl /EHsc /MT /O2 /DWIN32_LEAN_AND_MEAN /favor:IA32 /Fe:SmartBlueprint-x86.exe SmartBlueprint-Windows.cpp ws2_32.lib iphlpapi.lib icmp.lib user32.lib kernel32.lib

if %errorlevel% equ 0 (
    echo ✓ 32-bit build successful
    if exist *.obj del *.obj
) else (
    echo ✗ 32-bit build failed (may not be available on this system)
)

echo.
echo Build Summary:
echo ==============

if exist SmartBlueprint-x64.exe (
    echo ✓ SmartBlueprint-x64.exe - Ready for 64-bit Windows systems
    dir SmartBlueprint-x64.exe | findstr SmartBlueprint
)

if exist SmartBlueprint-x86.exe (
    echo ✓ SmartBlueprint-x86.exe - Ready for 32-bit Windows systems  
    dir SmartBlueprint-x86.exe | findstr SmartBlueprint
)

if not exist SmartBlueprint-x64.exe if not exist SmartBlueprint-x86.exe (
    echo ✗ No executables created - check Visual Studio installation
    echo   Make sure you're running from "Developer Command Prompt for VS"
    pause
    exit /b 1
)

echo.
echo Installation Notes:
echo - Run as Administrator for full network access
echo - Executable includes all dependencies (no additional DLLs needed)
echo - Creates scan history in smartblueprint_scan_history.csv

echo.
pause