@echo off
title SmartBlueprint Pro
cls

echo.
echo =========================================
echo   SmartBlueprint Pro
echo   Smart Home Network Monitoring
echo =========================================
echo.
echo Starting desktop application...
echo Please wait while the application loads...
echo.
echo The application will open in your web browser
echo automatically when ready.
echo.
echo To stop the application:
echo - Close this window, or
echo - Press Ctrl+C
echo.
echo =========================================
echo.

cd /d "%~dp0app"
node server.js

echo.
echo Application stopped.
pause
