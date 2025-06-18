@echo off
REM SmartBlueprint Pro - Windows Executable Builder
REM Fixes architecture mismatch and compatibility issues

echo ╔══════════════════════════════════════════════════════════════╗
echo ║               SmartBlueprint Pro Builder                    ║
echo ║                Windows Executable Generator                  ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM Check system architecture
echo [1/7] Detecting system architecture...
if "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
    set TARGET_ARCH=x64
    set CMAKE_GENERATOR=Visual Studio 16 2019
    set CMAKE_ARCH=-A x64
    echo     ✓ Detected: 64-bit Windows (x64)
) else if "%PROCESSOR_ARCHITECTURE%"=="x86" (
    set TARGET_ARCH=x86
    set CMAKE_GENERATOR=Visual Studio 16 2019
    set CMAKE_ARCH=-A Win32
    echo     ✓ Detected: 32-bit Windows (x86)
) else (
    echo     ⚠ Unknown architecture: %PROCESSOR_ARCHITECTURE%
    echo     ⚠ Defaulting to x64 build
    set TARGET_ARCH=x64
    set CMAKE_GENERATOR=Visual Studio 16 2019
    set CMAKE_ARCH=-A x64
)

REM Check for required tools
echo.
echo [2/7] Checking build requirements...

where cmake >nul 2>&1
if %errorlevel% neq 0 (
    echo     ❌ CMake not found
    echo     📋 Install CMake from: https://cmake.org/download/
    pause
    exit /b 1
) else (
    echo     ✓ CMake found
)

where cl >nul 2>&1
if %errorlevel% neq 0 (
    echo     ❌ MSVC compiler not found
    echo     📋 Install Visual Studio with C++ tools
    echo     📋 Or run from "Developer Command Prompt"
    pause
    exit /b 1
) else (
    echo     ✓ MSVC compiler found
)

REM Create build directory
echo.
echo [3/7] Preparing build environment...
if exist "build" (
    echo     🧹 Cleaning previous build...
    rmdir /s /q "build"
)
mkdir "build"
cd "build"
echo     ✓ Build directory created

REM Configure with CMake
echo.
echo [4/7] Configuring build for %TARGET_ARCH%...
cmake .. -G "%CMAKE_GENERATOR%" %CMAKE_ARCH% ^
    -DCMAKE_BUILD_TYPE=Release ^
    -DCMAKE_MSVC_RUNTIME_LIBRARY=MultiThreaded ^
    -DCMAKE_CXX_FLAGS_RELEASE="/MT /O2 /GL /DNDEBUG" ^
    -DCMAKE_EXE_LINKER_FLAGS_RELEASE="/LTCG /OPT:REF /OPT:ICF /SUBSYSTEM:CONSOLE"

if %errorlevel% neq 0 (
    echo     ❌ CMake configuration failed
    cd ..
    pause
    exit /b 1
)
echo     ✓ Configuration complete

REM Build the executable
echo.
echo [5/7] Building executable...
cmake --build . --config Release --parallel 4

if %errorlevel% neq 0 (
    echo     ❌ Build failed
    cd ..
    pause
    exit /b 1
)
echo     ✓ Build successful

REM Copy executable to root
echo.
echo [6/7] Finalizing executable...
if exist "Release\SmartBlueprintDesktop.exe" (
    copy "Release\SmartBlueprintDesktop.exe" "..\SmartBlueprint-%TARGET_ARCH%.exe"
    echo     ✓ Executable created: SmartBlueprint-%TARGET_ARCH%.exe
) else if exist "bin\Release\SmartBlueprintDesktop.exe" (
    copy "bin\Release\SmartBlueprintDesktop.exe" "..\SmartBlueprint-%TARGET_ARCH%.exe"
    echo     ✓ Executable created: SmartBlueprint-%TARGET_ARCH%.exe
) else (
    echo     ❌ Executable not found in expected location
    dir /s *.exe
    cd ..
    pause
    exit /b 1
)

cd ..

REM Verify executable
echo.
echo [7/7] Verifying executable compatibility...
if exist "SmartBlueprint-%TARGET_ARCH%.exe" (
    echo     ✓ File exists: SmartBlueprint-%TARGET_ARCH%.exe
    
    REM Check file properties
    for %%A in ("SmartBlueprint-%TARGET_ARCH%.exe") do (
        echo     📏 File size: %%~zA bytes
    )
    
    REM Verify it's a valid PE executable
    dumpbin /headers "SmartBlueprint-%TARGET_ARCH%.exe" | findstr /i "machine" >nul 2>&1
    if %errorlevel% equ 0 (
        echo     ✓ Valid Windows PE executable
    ) else (
        echo     ⚠ Could not verify PE format (dumpbin not available)
    )
    
    echo.
    echo ╔══════════════════════════════════════════════════════════════╗
    echo ║                    BUILD SUCCESSFUL                          ║
    echo ╠══════════════════════════════════════════════════════════════╣
    echo ║ Executable: SmartBlueprint-%TARGET_ARCH%.exe                     
    echo ║ Architecture: %TARGET_ARCH%                                      
    echo ║ Runtime: Static (no dependencies)                           ║
    echo ║                                                              ║
    echo ║ To run:                                                      ║
    echo ║ 1. Double-click SmartBlueprint-%TARGET_ARCH%.exe                
    echo ║ 2. Or run from command prompt                               ║
    echo ║ 3. May need "Run as Administrator" for network access       ║
    echo ╚══════════════════════════════════════════════════════════════╝
    
) else (
    echo     ❌ Final executable not found
    exit /b 1
)

echo.
echo Press any key to exit...
pause >nul