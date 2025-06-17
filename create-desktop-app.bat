@echo off
setlocal enabledelayedexpansion

:: SmartBlueprint Pro - Desktop Application Builder
:: Creates a one-click Windows executable with everything bundled

echo.
echo ============================================
echo   SmartBlueprint Pro Desktop Builder
echo ============================================
echo.

:: Check for Node.js
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Node.js is required to build the desktop application
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo Building SmartBlueprint Pro Desktop Application...
echo.

:: Create build directory
if exist "desktop-build" rmdir /s /q "desktop-build"
mkdir "desktop-build"

:: Build the web application
echo [1/4] Building web application...
call npm run build
if %errorLevel% neq 0 (
    echo ERROR: Web application build failed
    pause
    exit /b 1
)

:: Install electron-builder if not present
echo [2/4] Preparing Electron builder...
npm list electron-builder >nul 2>&1
if %errorLevel% neq 0 (
    echo Installing electron-builder...
    npm install electron-builder --save-dev
)

:: Copy files to build directory
echo [3/4] Copying application files...

:: Copy built web app
xcopy /E /I /Y "dist\*" "desktop-build\dist\"

:: Copy Electron files
copy "electron-main.js" "desktop-build\"
copy "electron-preload.js" "desktop-build\"
copy "desktop-agent-embedded.js" "desktop-build\"
copy "electron-builder.json" "desktop-build\"

:: Copy server files (exclude TypeScript)
mkdir "desktop-build\server"
for %%f in (server\*.js) do copy "%%f" "desktop-build\server\"

:: Copy assets
if exist "assets" xcopy /E /I /Y "assets\*" "desktop-build\assets\"

:: Create simplified package.json for desktop build
echo [4/4] Creating desktop package configuration...
(
echo {
echo   "name": "smartblueprint-pro-desktop",
echo   "version": "1.0.0",
echo   "description": "SmartBlueprint Pro Desktop Application",
echo   "main": "electron-main.js",
echo   "author": "SmartBlueprint Technologies",
echo   "license": "MIT",
echo   "scripts": {
echo     "start": "electron .",
echo     "build": "electron-builder"
echo   },
echo   "build": {
echo     "appId": "com.smartblueprint.desktop",
echo     "productName": "SmartBlueprint Pro",
echo     "directories": {
echo       "output": "../SmartBlueprint-Desktop"
echo     },
echo     "win": {
echo       "target": "nsis",
echo       "icon": "assets/icon.png"
echo     },
echo     "nsis": {
echo       "oneClick": false,
echo       "allowToChangeInstallationDirectory": true,
echo       "createDesktopShortcut": true,
echo       "createStartMenuShortcut": true,
echo       "shortcutName": "SmartBlueprint Pro"
echo     }
echo   },
echo   "dependencies": {
echo     "ws": "^8.14.2"
echo   },
echo   "devDependencies": {
echo     "electron": "^28.0.0",
echo     "electron-builder": "^24.6.4"
echo   }
echo }
) > "desktop-build\package.json"

:: Build the desktop application
echo.
echo Building Windows executable...
cd desktop-build

:: Install dependencies
call npm install --production

:: Create the executable
call npx electron-builder --win --publish=never

cd ..

:: Check if build was successful
if exist "SmartBlueprint-Desktop\SmartBlueprint Pro Setup *.exe" (
    echo.
    echo ============================================
    echo   Desktop Application Built Successfully!
    echo ============================================
    echo.
    echo Output directory: SmartBlueprint-Desktop\
    for %%f in ("SmartBlueprint-Desktop\*.exe") do (
        echo Installer: %%~nxf
        echo Size: %%~zf bytes
    )
    echo.
    echo The installer includes:
    echo - Complete SmartBlueprint Pro web interface
    echo - Integrated network monitoring agent
    echo - Automatic device discovery
    echo - Real-time signal analysis
    echo - Windows service installation option
    echo.
    echo Users can install and run without any dependencies!
) else (
    echo.
    echo ERROR: Desktop build failed
    echo Check the build logs above for details
)

:: Cleanup
rmdir /s /q "desktop-build" 2>nul

echo.
pause