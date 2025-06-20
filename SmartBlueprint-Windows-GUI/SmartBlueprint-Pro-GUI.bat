@echo off
title SmartBlueprint Pro - AI IoT Monitoring
cls
echo.
echo ╔══════════════════════════════════════════════════════════════════════════════╗
echo ║                         SmartBlueprint Pro                                  ║
echo ║                   AI-Powered IoT Device Monitoring                          ║
echo ║                        Windows GUI Application                              ║
echo ╚══════════════════════════════════════════════════════════════════════════════╝
echo.
echo Starting GUI application...
echo.

REM Change to the directory containing this script
cd /d "%~dp0"

REM Check if Node.js is available
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js not found. Installing Node.js...
    echo.
    echo Please download and install Node.js from https://nodejs.org
    echo After installation, restart this application.
    echo.
    pause
    exit /b 1
)

REM Check if Electron is installed
if not exist "node_modules\electron" (
    echo 📦 Installing Electron and dependencies...
    npm install electron express
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo ❌ Failed to install dependencies
        echo Please ensure you have internet connection and try again.
        echo.
        pause
        exit /b 1
    )
)

echo 🚀 Launching SmartBlueprint Pro GUI Window...
echo.
echo Features launching:
echo • AI-powered device monitoring
echo • Real-time network analysis
echo • Advanced signal processing
echo • Predictive maintenance alerts
echo.

REM Start the Electron application
node electron-main.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Application failed to start
    echo.
    echo Troubleshooting:
    echo • Ensure all files are present in this directory
    echo • Check Windows Firewall settings
    echo • Try running as administrator
    echo • Verify Node.js installation
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ SmartBlueprint Pro GUI application closed successfully
pause