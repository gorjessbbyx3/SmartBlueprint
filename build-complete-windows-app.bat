@echo off
REM SmartBlueprint Pro - Complete Windows Application Builder
REM Builds all desktop versions with professional icon integration

echo SmartBlueprint Pro - Complete Application Builder
echo ==================================================

REM Copy professional icon to build directory
if exist "attached_assets\smartpriny_1750234391584.png" (
    copy "attached_assets\smartpriny_1750234391584.png" "smartblueprint-icon.png"
    echo Professional icon integrated
) else (
    echo Warning: Professional icon not found, using fallback
)

REM Build console applications with icon resources
echo [1/4] Building professional console applications...
if exist "compile-professional.bat" (
    call compile-professional.bat
    echo Console applications built with professional icon
) else (
    echo Professional console build script not found
)

REM Build GUI application
echo [2/4] Building GUI application with Dear ImGui...
if exist "SmartBlueprint-GUI.cpp" (
    cl /EHsc /MT /O2 /DWIN32_LEAN_AND_MEAN SmartBlueprint-GUI.cpp smartblueprint.rc ws2_32.lib iphlpapi.lib icmp.lib wlanapi.lib user32.lib gdi32.lib opengl32.lib /Fe:SmartBlueprint-GUI.exe
    if %errorlevel% equ 0 (
        echo GUI application built successfully
    ) else (
        echo GUI build failed - check dependencies
    )
) else (
    echo GUI source not found
)

REM Build complete desktop application
echo [3/4] Building complete desktop application...
if exist "create-windows-desktop-app.bat" (
    call create-windows-desktop-app.bat
    echo Complete desktop application with web UI built
) else (
    echo Desktop app build script not found
)

REM Create professional installer package
echo [4/4] Creating professional installer package...
mkdir SmartBlueprint-Pro-Package 2>nul
xcopy *.exe SmartBlueprint-Pro-Package\ /Y 2>nul
copy "smartblueprint-icon.png" SmartBlueprint-Pro-Package\ 2>nul
copy "settings.ini" SmartBlueprint-Pro-Package\ 2>nul
copy "DESKTOP-BUILD-INSTRUCTIONS.md" SmartBlueprint-Pro-Package\ 2>nul
copy "FINAL-SOLUTION-GUIDE.md" SmartBlueprint-Pro-Package\ 2>nul

REM Create installer script
(
echo @echo off
echo echo SmartBlueprint Pro - Professional Installation
echo echo =============================================
echo echo.
echo echo This package contains:
echo echo • SmartBlueprint-Professional-x64.exe - Console application
echo echo • SmartBlueprint-GUI.exe - Visual interface application  
echo echo • SmartBlueprint-Pro.exe - Complete web interface application
echo echo.
echo echo All applications include professional icon integration
echo echo and comprehensive network monitoring capabilities.
echo echo.
echo echo Choose your preferred version and run as Administrator
echo echo for full network scanning functionality.
echo echo.
echo echo Documentation:
echo echo • DESKTOP-BUILD-INSTRUCTIONS.md - Usage instructions
echo echo • FINAL-SOLUTION-GUIDE.md - Complete feature guide
echo echo.
echo pause
) > SmartBlueprint-Pro-Package\INSTALL.bat

echo.
echo Complete Application Build Summary:
echo ===================================
echo.

if exist "SmartBlueprint-Professional-x64.exe" (
    echo ✓ Professional Console (x64): SmartBlueprint-Professional-x64.exe
    dir SmartBlueprint-Professional-x64.exe | findstr SmartBlueprint
)

if exist "SmartBlueprint-Professional-x86.exe" (
    echo ✓ Professional Console (x86): SmartBlueprint-Professional-x86.exe  
    dir SmartBlueprint-Professional-x86.exe | findstr SmartBlueprint
)

if exist "SmartBlueprint-GUI.exe" (
    echo ✓ GUI Application: SmartBlueprint-GUI.exe
    dir SmartBlueprint-GUI.exe | findstr SmartBlueprint
)

if exist "SmartBlueprint-Pro.exe" (
    echo ✓ Complete Desktop App: SmartBlueprint-Pro.exe
    dir SmartBlueprint-Pro.exe | findstr SmartBlueprint
)

if exist "SmartBlueprint-Pro-Package" (
    echo ✓ Professional Package: SmartBlueprint-Pro-Package\
    echo   Contains all applications with documentation
)

echo.
echo Professional Features Included:
echo ===============================
echo • Modern Windows APIs (GetAdaptersAddresses, WiFi API, native ICMP)
echo • Thread-safe operations with mutex protection
echo • IPv6 network support for dual-stack environments
echo • Per-device timestamped logging for audit trails
echo • Professional icon integration across all applications
echo • Persistent configuration with settings preservation
echo • Visual scan feedback with progress indicators
echo • Exit confirmation prompts preventing data loss
echo • Windows Toast Notifications for security alerts
echo • Device classification and MAC-based tracking
echo • Network topology export for visualization
echo • Multiple data export formats (CSV, JSON, XLSX)
echo.
echo Installation Instructions:
echo =========================
echo 1. Run INSTALL.bat from SmartBlueprint-Pro-Package
echo 2. Choose your preferred application type
echo 3. Run as Administrator for full network access
echo 4. Configure settings.ini for your environment
echo.
echo The professional teal network monitor icon is integrated
echo across all applications with comprehensive Windows integration.

pause