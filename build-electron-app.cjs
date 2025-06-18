#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Building SmartBlueprint Pro Desktop Application...');

try {
    // Step 1: Build the web application
    console.log('1. Building web application...');
    execSync('npm run build', { stdio: 'inherit' });
    
    // Step 2: Copy Electron files to build directory
    console.log('2. Preparing Electron application...');
    const buildDir = path.join(__dirname, 'electron-app');
    
    // Create build directory
    if (fs.existsSync(buildDir)) {
        fs.rmSync(buildDir, { recursive: true });
    }
    fs.mkdirSync(buildDir, { recursive: true });
    
    // Copy dist folder
    const distDir = path.join(__dirname, 'dist');
    const targetDistDir = path.join(buildDir, 'dist');
    if (fs.existsSync(distDir)) {
        fs.cpSync(distDir, targetDistDir, { recursive: true });
        console.log('✓ Web application files copied');
    }
    
    // Copy Electron main files
    const electronFiles = [
        'electron-main-complete.js',
        'electron-preload.js'
    ];
    
    electronFiles.forEach(file => {
        const src = path.join(__dirname, file);
        const dest = path.join(buildDir, file);
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest);
            console.log(`✓ ${file} copied`);
        }
    });
    
    // Step 3: Create package.json for Electron app
    console.log('3. Creating Electron package.json...');
    const electronPackageJson = {
        "name": "smartblueprint-pro",
        "version": "1.0.0",
        "description": "SmartBlueprint Pro Desktop Application",
        "main": "electron-main-complete.js",
        "scripts": {
            "start": "electron .",
            "build": "electron-builder --win"
        },
        "author": "GorJess & Co.",
        "license": "Commercial",
        "dependencies": {
            "electron": "^28.0.0"
        },
        "devDependencies": {
            "electron-builder": "^24.0.0"
        },
        "build": {
            "appId": "com.gorjess.smartblueprint-pro",
            "productName": "SmartBlueprint Pro",
            "directories": {
                "output": "../"
            },
            "files": [
                "**/*",
                "!node_modules",
                "!package-lock.json"
            ],
            "win": {
                "target": "nsis",
                "icon": "assets/icon.png"
            },
            "nsis": {
                "oneClick": false,
                "allowToChangeInstallationDirectory": true,
                "createDesktopShortcut": true,
                "createStartMenuShortcut": true,
                "installerIcon": "assets/icon.png",
                "uninstallerIcon": "assets/icon.png"
            }
        }
    };
    
    fs.writeFileSync(
        path.join(buildDir, 'package.json'),
        JSON.stringify(electronPackageJson, null, 2)
    );
    console.log('✓ Package.json created');
    
    // Step 4: Copy professional icon
    const iconSrc = path.join(__dirname, 'attached_assets', 'smartpriny_1750234391584.png');
    const iconDir = path.join(buildDir, 'assets');
    if (!fs.existsSync(iconDir)) {
        fs.mkdirSync(iconDir, { recursive: true });
    }
    
    if (fs.existsSync(iconSrc)) {
        fs.copyFileSync(iconSrc, path.join(iconDir, 'icon.png'));
        console.log('✓ Professional icon copied');
    }
    
    // Step 5: Install Electron dependencies
    console.log('4. Installing Electron dependencies...');
    process.chdir(buildDir);
    execSync('npm install --production', { stdio: 'inherit' });
    
    // Step 6: Build the executable
    console.log('5. Building Windows executable...');
    execSync('npm run build', { stdio: 'inherit' });
    
    // Step 7: Move the built executable to project root
    process.chdir(__dirname);
    const possiblePaths = [
        path.join(buildDir, 'SmartBlueprint Pro Setup 1.0.0.exe'),
        path.join(__dirname, 'SmartBlueprint Pro Setup 1.0.0.exe'),
        path.join(buildDir, 'dist', 'SmartBlueprint Pro Setup 1.0.0.exe')
    ];
    
    let foundExecutable = null;
    for (const exePath of possiblePaths) {
        if (fs.existsSync(exePath)) {
            foundExecutable = exePath;
            break;
        }
    }
    
    if (foundExecutable) {
        const destPath = path.join(__dirname, 'SmartBlueprint-Pro-Setup.exe');
        fs.copyFileSync(foundExecutable, destPath);
        console.log(`✓ Desktop application built: SmartBlueprint-Pro-Setup.exe`);
        console.log(`File size: ${(fs.statSync(destPath).size / 1024 / 1024).toFixed(2)} MB`);
    } else {
        console.log('Executable not found at expected locations. Checking build directory...');
        const buildFiles = fs.readdirSync(buildDir).filter(f => f.endsWith('.exe'));
        console.log('Available files:', buildFiles);
    }
    
    console.log('\n🎉 SmartBlueprint Pro Desktop Application build process completed!');
    console.log('The installer should be available for download at /download/SmartBlueprint-Pro-Setup.exe');
    
} catch (error) {
    console.error('❌ Build failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
}