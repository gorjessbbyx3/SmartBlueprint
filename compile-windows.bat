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

REM Detect architecture
if "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
    set ARCH=x64
    echo Building for 64-bit Windows
) else (
    set ARCH=x86
    echo Building for 32-bit Windows
)

REM Clean previous builds
if exist SmartBlueprint-*.exe del SmartBlueprint-*.exe
if exist *.obj del *.obj

REM Compile with static linking (no DLL dependencies)
echo Compiling...
cl /EHsc /MT /O2 /DWIN32_LEAN_AND_MEAN /Fe:SmartBlueprint-%ARCH%.exe SmartBlueprint-Windows.cpp ws2_32.lib iphlpapi.lib user32.lib kernel32.lib

if %errorlevel% neq 0 (
    echo Compilation failed
    pause
    exit /b 1
)

REM Clean up object files
del *.obj

REM Verify executable
if exist SmartBlueprint-%ARCH%.exe (
    echo.
    echo Build successful: SmartBlueprint-%ARCH%.exe
    echo File size: 
    dir SmartBlueprint-%ARCH%.exe | findstr SmartBlueprint
    echo.
    echo To run: SmartBlueprint-%ARCH%.exe
    echo Note: May need "Run as Administrator" for network access
) else (
    echo Build failed - executable not created
)

echo.
pause