@echo off
:: SmartBlueprint Pro Self-Extracting Installer
title SmartBlueprint Pro Installation

echo.
echo ============================================
echo   SmartBlueprint Pro Installation
echo ============================================
echo.

:: Check for Administrator privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Administrator privileges required
    echo Please right-click and "Run as Administrator"
    pause
    exit /b 1
)

:: Set installation directory
set INSTALL_DIR=%ProgramFiles%\SmartBlueprint Pro
echo Installing to: %INSTALL_DIR%
echo.

:: Create installation directory
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

:: Extract application files
echo [1/4] Extracting application files...
xcopy /E /I /Y "%~dp0app\*" "%INSTALL_DIR%\"

:: Create shortcuts
echo [2/4] Creating shortcuts...
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\Desktop\SmartBlueprint Pro.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\SmartBlueprint-Pro.bat'; $Shortcut.WorkingDirectory = '%INSTALL_DIR%'; $Shortcut.Description = 'SmartBlueprint Pro - Smart Home Network Monitoring'; $Shortcut.Save()"

:: Create Start Menu entry
echo [3/4] Creating Start Menu entry...
if not exist "%ProgramData%\Microsoft\Windows\Start Menu\Programs\SmartBlueprint Pro" mkdir "%ProgramData%\Microsoft\Windows\Start Menu\Programs\SmartBlueprint Pro"
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%ProgramData%\Microsoft\Windows\Start Menu\Programs\SmartBlueprint Pro\SmartBlueprint Pro.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\SmartBlueprint-Pro.bat'; $Shortcut.WorkingDirectory = '%INSTALL_DIR%'; $Shortcut.Description = 'SmartBlueprint Pro - Smart Home Network Monitoring'; $Shortcut.Save()"

:: Register in Windows Programs
echo [4/4] Registering application...
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\SmartBlueprint Pro" /v "DisplayName" /t REG_SZ /d "SmartBlueprint Pro" /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\SmartBlueprint Pro" /v "InstallLocation" /t REG_SZ /d "%INSTALL_DIR%" /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\SmartBlueprint Pro" /v "Publisher" /t REG_SZ /d "GorJess & Co" /f >nul 2>&1

echo.
echo ============================================
echo   Installation Complete!
echo ============================================
echo.
echo SmartBlueprint Pro has been installed successfully!
echo.
echo Desktop shortcut: Created
echo Start Menu: Created
echo.
echo Click "SmartBlueprint Pro" on your desktop to start.
echo.
pause
exit /b 0