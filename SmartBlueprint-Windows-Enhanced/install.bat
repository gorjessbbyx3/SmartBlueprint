@echo off
echo SmartBlueprint Pro - Windows Desktop Application Installer
echo ======================================================

echo Installing Node.js dependencies...
npm install

echo.
echo Checking Python dependencies...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python is not installed. Please install Python 3.11+ and try again.
    pause
    exit /b 1
)

echo Installing Python ML packages...
pip install fastapi uvicorn websockets scikit-learn numpy pandas psycopg2-binary python-dotenv asyncio joblib

echo.
echo Installation complete!
echo.
echo To start SmartBlueprint Pro:
echo   npm start
echo.
echo This will launch both the backend server and desktop GUI.
pause