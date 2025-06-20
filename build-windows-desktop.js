#!/usr/bin/env node

/**
 * Complete Windows Desktop Build Script
 * Packages the entire SmartBlueprint Pro web application into a standalone Windows executable
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Building SmartBlueprint Pro Windows Desktop Application...\n');

const steps = [
  'Building frontend production bundle',
  'Compiling server TypeScript',
  'Copying dependencies',
  'Creating Electron package',
  'Building Windows installer'
];

let currentStep = 0;

function logStep(message) {
  currentStep++;
  console.log(`[${currentStep}/${steps.length}] ${message}...`);
}

function runCommand(command, options = {}) {
  try {
    console.log(`  → ${command}`);
    const result = execSync(command, { 
      stdio: 'inherit',
      cwd: process.cwd(),
      ...options
    });
    return result;
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    console.error(error.message);
    process.exit(1);
  }
}

function ensureDirectory(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`  ✓ Created directory: ${dir}`);
  }
}

async function buildDesktopApp() {
  try {
    // Step 1: Build frontend production bundle
    logStep(steps[0]);
    runCommand('npm run build');
    
    // Step 2: Compile server TypeScript to JavaScript
    logStep(steps[1]);
    
    // Create dist-server directory
    ensureDirectory('dist-server');
    
    // Compile TypeScript server files
    runCommand('npx tsc server/index.ts --outDir dist-server --target es2020 --module commonjs --moduleResolution node --esModuleInterop --allowSyntheticDefaultImports --skipLibCheck');
    
    // Copy server dependencies
    const serverFiles = [
      'server/routes.ts',
      'server/storage.ts', 
      'server/vite.ts',
      'server/ml-anomaly-detection.ts'
    ];
    
    for (const file of serverFiles) {
      if (fs.existsSync(file)) {
        const destFile = file.replace('server/', 'dist-server/').replace('.ts', '.js');
        runCommand(`npx tsc ${file} --outDir dist-server --target es2020 --module commonjs --moduleResolution node --esModuleInterop --allowSyntheticDefaultImports --skipLibCheck`);
      }
    }
    
    // Step 3: Copy shared and other dependencies
    logStep(steps[2]);
    
    // Copy shared directory
    if (fs.existsSync('shared')) {
      runCommand('cp -r shared dist-server/');
    }
    
    // Copy public assets
    if (fs.existsSync('public')) {
      ensureDirectory('dist-electron/public');
      runCommand('cp -r public/* dist-electron/public/');
    }
    
    // Copy package.json for Electron
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const electronPackageJson = {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description,
      main: 'electron-main.js',
      scripts: {
        start: 'electron .'
      },
      dependencies: {
        electron: packageJson.devDependencies?.electron || packageJson.dependencies?.electron,
        express: packageJson.dependencies?.express,
        ws: packageJson.dependencies?.ws,
        'drizzle-orm': packageJson.dependencies?.['drizzle-orm'],
        zod: packageJson.dependencies?.zod,
        nanoid: packageJson.dependencies?.nanoid,
        tsx: packageJson.dependencies?.tsx
      }
    };
    
    fs.writeFileSync('dist-electron/package.json', JSON.stringify(electronPackageJson, null, 2));
    console.log('  ✓ Created Electron package.json');
    
    // Step 4: Prepare Electron files
    logStep(steps[3]);
    
    ensureDirectory('dist-electron');
    
    // Copy Electron main files
    const electronFiles = [
      'electron-main.js',
      'electron-preload.js',
      'generated-icon.png'
    ];
    
    for (const file of electronFiles) {
      if (fs.existsSync(file)) {
        runCommand(`cp ${file} dist-electron/`);
        console.log(`  ✓ Copied ${file}`);
      }
    }
    
    // Copy built frontend
    if (fs.existsSync('dist')) {
      runCommand('cp -r dist dist-electron/');
      console.log('  ✓ Copied frontend build');
    }
    
    // Copy compiled server
    if (fs.existsSync('dist-server')) {
      runCommand('cp -r dist-server dist-electron/server');
      console.log('  ✓ Copied compiled server');
    }
    
    // Create a production server launcher
    const serverLauncher = `
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 800,
    icon: path.join(__dirname, 'generated-icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'electron-preload.js')
    },
    titleBarStyle: 'default',
    backgroundColor: '#1f2937',
    show: false,
    autoHideMenuBar: false
  });

  // Start embedded server
  startEmbeddedServer();
  
  // Load the app after server starts
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:3001');
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
    });
  }, 2000);

  mainWindow.on('closed', () => {
    if (serverProcess) {
      serverProcess.kill();
    }
    mainWindow = null;
  });
}

function startEmbeddedServer() {
  const serverPath = path.join(__dirname, 'server', 'index.js');
  serverProcess = spawn('node', [serverPath], {
    env: { ...process.env, NODE_ENV: 'production', PORT: '3001' },
    stdio: 'pipe'
  });
  
  console.log('Starting embedded server...');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  app.quit();
});
`;
    
    fs.writeFileSync('dist-electron/electron-main.js', serverLauncher);
    console.log('  ✓ Created production Electron main process');
    
    // Step 5: Build Windows executable
    logStep(steps[4]);
    
    // Install production dependencies in dist-electron
    process.chdir('dist-electron');
    runCommand('npm install --production');
    process.chdir('..');
    
    // Build with electron-builder
    console.log('  Building Windows installer and portable executable...');
    runCommand('npx electron-builder --win --config electron-builder.json --publish never');
    
    console.log('\n🎉 Windows Desktop Application Build Complete!');
    console.log('\nGenerated files:');
    
    const distDesktopPath = 'dist-desktop';
    if (fs.existsSync(distDesktopPath)) {
      const files = fs.readdirSync(distDesktopPath);
      files.forEach(file => {
        const filePath = path.join(distDesktopPath, file);
        const stats = fs.statSync(filePath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
        console.log(`  📦 ${file} (${sizeMB} MB)`);
      });
    }
    
    console.log('\n✅ Your SmartBlueprint Pro Windows desktop application is ready!');
    console.log('   The installer will include:');
    console.log('   • Complete web application UI');
    console.log('   • Embedded Express.js server');
    console.log('   • All ML anomaly detection systems');
    console.log('   • Desktop agent functionality');
    console.log('   • No internet connection required');
    
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Run the build
buildDesktopApp();