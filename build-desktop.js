#!/usr/bin/env node

/**
 * SmartBlueprint Pro - Desktop Build Script
 * Automated packaging for Windows executable distribution
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class DesktopBuilder {
  constructor() {
    this.buildDir = 'dist-desktop';
    this.tempDir = 'temp-build';
  }

  async build() {
    console.log('🚀 Building SmartBlueprint Pro Desktop Application...\n');
    
    try {
      await this.prepareBuild();
      await this.buildWebApp();
      await this.copyElectronFiles();
      await this.packageApplication();
      await this.cleanup();
      
      console.log('\n✅ Desktop application built successfully!');
      console.log(`📦 Output directory: ${this.buildDir}`);
      console.log('📋 Distribution files:');
      
      const files = fs.readdirSync(this.buildDir).filter(f => f.endsWith('.exe') || f.endsWith('.msi'));
      files.forEach(file => {
        console.log(`   • ${file}`);
      });
      
    } catch (error) {
      console.error('❌ Build failed:', error.message);
      process.exit(1);
    }
  }

  async prepareBuild() {
    console.log('📋 Preparing build environment...');
    
    // Clean previous builds
    if (fs.existsSync(this.buildDir)) {
      fs.rmSync(this.buildDir, { recursive: true, force: true });
    }
    if (fs.existsSync(this.tempDir)) {
      fs.rmSync(this.tempDir, { recursive: true, force: true });
    }
    
    fs.mkdirSync(this.tempDir, { recursive: true });
    console.log('   ✓ Build directories prepared');
  }

  async buildWebApp() {
    console.log('🔧 Building web application...');
    
    return new Promise((resolve, reject) => {
      // Build the React frontend and Express backend
      const buildProcess = spawn('npm', ['run', 'build'], {
        stdio: 'pipe',
        shell: true
      });
      
      buildProcess.stdout.on('data', (data) => {
        process.stdout.write(data);
      });
      
      buildProcess.stderr.on('data', (data) => {
        process.stderr.write(data);
      });
      
      buildProcess.on('close', (code) => {
        if (code === 0) {
          console.log('   ✓ Web application built successfully');
          resolve();
        } else {
          reject(new Error(`Build process failed with code ${code}`));
        }
      });
    });
  }

  async copyElectronFiles() {
    console.log('📁 Copying Electron files...');
    
    // Copy Electron main files
    const electronFiles = [
      'electron-main.js',
      'electron-preload.js',
      'desktop-agent-embedded.js',
      'electron-builder.json',
      'installer.nsh'
    ];
    
    for (const file of electronFiles) {
      if (fs.existsSync(file)) {
        fs.copyFileSync(file, path.join(this.tempDir, file));
      }
    }
    
    // Copy assets
    if (fs.existsSync('assets')) {
      fs.cpSync('assets', path.join(this.tempDir, 'assets'), { recursive: true });
    }
    
    // Copy built application
    if (fs.existsSync('dist')) {
      fs.cpSync('dist', path.join(this.tempDir, 'dist'), { recursive: true });
    }
    
    // Copy server files (excluding TypeScript)
    if (fs.existsSync('server')) {
      const serverDest = path.join(this.tempDir, 'server');
      fs.mkdirSync(serverDest, { recursive: true });
      
      const serverFiles = fs.readdirSync('server').filter(f => !f.endsWith('.ts'));
      serverFiles.forEach(file => {
        const srcPath = path.join('server', file);
        const destPath = path.join(serverDest, file);
        
        if (fs.statSync(srcPath).isFile()) {
          fs.copyFileSync(srcPath, destPath);
        }
      });
    }
    
    // Copy essential package files
    fs.copyFileSync('package.json', path.join(this.tempDir, 'package.json'));
    
    console.log('   ✓ Files copied to build directory');
  }

  async packageApplication() {
    console.log('📦 Packaging desktop application...');
    
    return new Promise((resolve, reject) => {
      // Change to temp directory and run electron-builder
      process.chdir(this.tempDir);
      
      const builderProcess = spawn('npx', [
        'electron-builder',
        '--win',
        '--publish=never',
        '--config=electron-builder.json'
      ], {
        stdio: 'pipe',
        shell: true
      });
      
      builderProcess.stdout.on('data', (data) => {
        process.stdout.write(data);
      });
      
      builderProcess.stderr.on('data', (data) => {
        process.stderr.write(data);
      });
      
      builderProcess.on('close', (code) => {
        // Return to original directory
        process.chdir('..');
        
        if (code === 0) {
          // Move built files to main directory
          const tempDistDir = path.join(this.tempDir, 'dist-desktop');
          if (fs.existsSync(tempDistDir)) {
            fs.cpSync(tempDistDir, this.buildDir, { recursive: true });
          }
          
          console.log('   ✓ Desktop application packaged successfully');
          resolve();
        } else {
          reject(new Error(`Packaging failed with code ${code}`));
        }
      });
    });
  }

  async cleanup() {
    console.log('🧹 Cleaning up temporary files...');
    
    if (fs.existsSync(this.tempDir)) {
      fs.rmSync(this.tempDir, { recursive: true, force: true });
    }
    
    console.log('   ✓ Cleanup completed');
  }
}

// Create simple package.json for temp build
function createTempPackageJson() {
  const tempPackage = {
    "name": "smartblueprint-pro-desktop",
    "version": "1.0.0",
    "description": "SmartBlueprint Pro Desktop Application",
    "main": "electron-main.js",
    "author": "SmartBlueprint Technologies",
    "license": "MIT",
    "dependencies": {
      "ws": "^8.14.2"
    },
    "devDependencies": {
      "electron": "^28.0.0",
      "electron-builder": "^24.6.4"
    }
  };
  
  return JSON.stringify(tempPackage, null, 2);
}

// Run the build process
if (require.main === module) {
  const builder = new DesktopBuilder();
  builder.build().catch(console.error);
}