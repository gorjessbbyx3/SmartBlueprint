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
            "start": "electron ."
        },
        "author": "GorJess & Co.",
        "license": "Commercial",
        "devDependencies": {
            "electron": "^28.0.0",
            "electron-builder": "^24.0.0"
        },
        "build": {
            "appId": "com.gorjess.smartblueprint-pro",
            "productName": "SmartBlueprint Pro",
            "directories": {
                "output": "../dist"
            },
            "files": [
                "**/*",
                "!node_modules"
            ],
            "win": {
                "target": "nsis",
                "icon": "assets/icon.ico"
            },
            "nsis": {
                "oneClick": false,
                "allowToChangeInstallationDirectory": true,
                "createDesktopShortcut": true,
                "createStartMenuShortcut": true
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
    execSync('npm install', { stdio: 'inherit' });
    
    // Step 6: Build the executable
    console.log('5. Building Windows executable...');
    execSync('npx electron-builder --win', { stdio: 'inherit' });
    
    // Step 7: Move the built executable to project root
    const distPath = path.join(__dirname, 'dist');
    const builtFiles = fs.readdirSync(distPath).filter(file => file.endsWith('.exe'));
    
    if (builtFiles.length > 0) {
        const builtFile = builtFiles[0];
        const srcPath = path.join(distPath, builtFile);
        const destPath = path.join(__dirname, 'SmartBlueprint-Pro-Setup.exe');
        
        fs.copyFileSync(srcPath, destPath);
        console.log(`✓ Desktop application built: SmartBlueprint-Pro-Setup.exe`);
        console.log(`File size: ${(fs.statSync(destPath).size / 1024 / 1024).toFixed(2)} MB`);
    }
    
    console.log('\n🎉 SmartBlueprint Pro Desktop Application built successfully!');
    console.log('The installer is ready for download at /download/SmartBlueprint-Pro-Setup.exe');
    
} catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
}