@echo off
title SmartBlueprint Pro - Starting...

echo Starting SmartBlueprint Pro Desktop Application...
echo.

REM Set working directory
cd /d "%~dp0"

REM Check if executable exists
if not exist "SmartBlueprint-Pro.exe" (
    echo ERROR: SmartBlueprint-Pro.exe not found
    echo Please ensure all files are extracted properly
    pause
    exit /b 1
)

echo Launching SmartBlueprint Pro...
start "" "SmartBlueprint-Pro.exe"

echo.
echo SmartBlueprint Pro is starting up...
echo The application will open automatically in a few seconds.
echo.
echo Features available:
echo - Real-time device monitoring
echo - AI anomaly detection
echo - Network mapping and analysis
echo - Predictive maintenance alerts
echo.

timeout /t 3 /nobreak >nul
echo Application launched successfully!
exit /b 0