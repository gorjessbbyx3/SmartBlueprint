#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');

console.log('🚀 Building SmartBlueprint Pro Desktop Application...\n');

class DesktopAppBuilder {
    constructor() {
        this.projectRoot = process.cwd();
        this.buildDir = path.join(this.projectRoot, 'desktop-app-build');
        this.outputDir = path.join(this.projectRoot, 'desktop-releases');
    }

    async build() {
        try {
            await this.cleanup();
            await this.buildWebApp();
            await this.createElectronApp();
            await this.installDependencies();
            await this.buildExecutable();
            await this.createInstaller();
            await this.finalizePackage();
            
            console.log('\n✅ Build completed successfully!');
            console.log(`📦 Installer available at: ${path.join(this.outputDir, 'SmartBlueprint-Pro-Setup.exe')}`);
            
        } catch (error) {
            console.error('❌ Build failed:', error.message);
            throw error;
        }
    }

    async cleanup() {
        console.log('🧹 Cleaning previous builds...');
        if (fs.existsSync(this.buildDir)) {
            fs.rmSync(this.buildDir, { recursive: true });
        }
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
        fs.mkdirSync(this.buildDir, { recursive: true });
    }

    async buildWebApp() {
        console.log('🔨 Building web application...');
        execSync('npm run build', { stdio: 'inherit' });
        
        // Copy built files to electron app directory
        const distDir = path.join(this.projectRoot, 'dist');
        const appDistDir = path.join(this.buildDir, 'dist');
        this.copyDirectory(distDir, appDistDir);
        console.log('✓ Web application built and copied');
    }

    async createElectronApp() {
        console.log('⚡ Creating Electron application...');
        
        // Create main electron process
        const mainJs = `
const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

class SmartBlueprintDesktopApp {
    constructor() {
        this.serverPort = 5000;
        this.serverUrl = \`http://localhost:\${this.serverPort}\`;
    }

    async startServer() {
        console.log('Starting embedded server...');
        
        return new Promise((resolve, reject) => {
            // Start the server process
            serverProcess = spawn('node', [path.join(__dirname, 'dist', 'index.js')], {
                stdio: 'pipe',
                env: { ...process.env, PORT: this.serverPort }
            });

            serverProcess.stdout.on('data', (data) => {
                console.log('Server:', data.toString());
                if (data.toString().includes('Server running')) {
                    resolve();
                }
            });

            serverProcess.stderr.on('data', (data) => {
                console.error('Server error:', data.toString());
            });

            serverProcess.on('error', (error) => {
                console.error('Failed to start server:', error);
                reject(error);
            });

            // Timeout fallback
            setTimeout(() => resolve(), 5000);
        });
    }

    createWindow() {
        console.log('Creating application window...');
        
        mainWindow = new BrowserWindow({
            width: 1400,
            height: 900,
            icon: path.join(__dirname, 'assets', 'icon.png'),
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                enableRemoteModule: false,
                webSecurity: true
            },
            titleBarStyle: 'default',
            show: false
        });

        // Create application menu
        const template = [
            {
                label: 'File',
                submenu: [
                    {
                        label: 'Exit',
                        accelerator: 'CmdOrCtrl+Q',
                        click: () => app.quit()
                    }
                ]
            },
            {
                label: 'View',
                submenu: [
                    { role: 'reload' },
                    { role: 'forceReload' },
                    { role: 'toggleDevTools' },
                    { type: 'separator' },
                    { role: 'resetZoom' },
                    { role: 'zoomIn' },
                    { role: 'zoomOut' },
                    { type: 'separator' },
                    { role: 'togglefullscreen' }
                ]
            },
            {
                label: 'Help',
                submenu: [
                    {
                        label: 'About SmartBlueprint Pro',
                        click: () => {
                            dialog.showMessageBox(mainWindow, {
                                type: 'info',
                                title: 'About SmartBlueprint Pro',
                                message: 'SmartBlueprint Pro',
                                detail: 'Version 1.0.0\\nSmart Home Network Monitoring Platform\\n\\n© 2025 GorJess & Co.'
                            });
                        }
                    }
                ]
            }
        ];

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);

        // Load the web application
        mainWindow.loadURL(this.serverUrl);

        // Show window when ready
        mainWindow.once('ready-to-show', () => {
            mainWindow.show();
            console.log('Application window ready');
        });

        // Handle external links
        mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            shell.openExternal(url);
            return { action: 'deny' };
        });

        mainWindow.on('closed', () => {
            mainWindow = null;
            if (serverProcess) {
                serverProcess.kill();
            }
        });
    }

    async start() {
        try {
            await this.startServer();
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for server startup
            this.createWindow();
        } catch (error) {
            console.error('Failed to start application:', error);
            dialog.showErrorBox('Startup Error', \`Failed to start SmartBlueprint Pro: \${error.message}\`);
            app.quit();
        }
    }
}

// Application lifecycle
app.whenReady().then(() => {
    const smartApp = new SmartBlueprintDesktopApp();
    smartApp.start();
});

app.on('window-all-closed', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        const smartApp = new SmartBlueprintDesktopApp();
        smartApp.start();
    }
});

// Handle certificate errors for localhost
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    if (url.startsWith('http://localhost:')) {
        event.preventDefault();
        callback(true);
    } else {
        callback(false);
    }
});
`;

        fs.writeFileSync(path.join(this.buildDir, 'main.js'), mainJs);

        // Create package.json for electron app
        const packageJson = {
            name: "smartblueprint-pro-desktop",
            version: "1.0.0",
            description: "SmartBlueprint Pro - Smart Home Network Monitoring Platform",
            main: "main.js",
            author: "GorJess & Co.",
            license: "Commercial",
            dependencies: {
                "electron": "^28.0.0"
            },
            devDependencies: {
                "electron-builder": "^24.0.0"
            },
            build: {
                appId: "com.gorjess.smartblueprint-pro",
                productName: "SmartBlueprint Pro",
                directories: {
                    output: "../desktop-releases"
                },
                files: [
                    "**/*",
                    "!node_modules"
                ],
                win: {
                    target: [
                        {
                            target: "nsis",
                            arch: ["x64"]
                        }
                    ],
                    icon: "assets/icon.png"
                },
                nsis: {
                    oneClick: false,
                    allowToChangeInstallationDirectory: true,
                    allowElevation: true,
                    createDesktopShortcut: true,
                    createStartMenuShortcut: true,
                    installerIcon: "assets/icon.png",
                    uninstallerIcon: "assets/icon.png",
                    installerHeaderIcon: "assets/icon.png",
                    deleteAppDataOnUninstall: false,
                    shortcutName: "SmartBlueprint Pro",
                    runAfterFinish: true
                }
            }
        };

        fs.writeFileSync(
            path.join(this.buildDir, 'package.json'),
            JSON.stringify(packageJson, null, 2)
        );

        // Copy professional icon
        const iconDir = path.join(this.buildDir, 'assets');
        fs.mkdirSync(iconDir, { recursive: true });
        
        const iconSrc = path.join(this.projectRoot, 'attached_assets', 'smartpriny_1750234391584.png');
        if (fs.existsSync(iconSrc)) {
            fs.copyFileSync(iconSrc, path.join(iconDir, 'icon.png'));
        }

        console.log('✓ Electron application structure created');
    }

    async installDependencies() {
        console.log('📦 Installing dependencies...');
        process.chdir(this.buildDir);
        execSync('npm install --production', { stdio: 'inherit' });
        process.chdir(this.projectRoot);
        console.log('✓ Dependencies installed');
    }

    async buildExecutable() {
        console.log('🔧 Building Windows executable...');
        process.chdir(this.buildDir);
        execSync('npx electron-builder --win --x64', { stdio: 'inherit' });
        process.chdir(this.projectRoot);
        console.log('✓ Windows executable built');
    }

    async createInstaller() {
        console.log('📋 Creating one-click installer...');
        
        // Find the generated installer
        const installerPattern = /SmartBlueprint Pro Setup.*\.exe$/;
        const files = fs.readdirSync(this.outputDir);
        const installerFile = files.find(f => installerPattern.test(f));
        
        if (installerFile) {
            const sourcePath = path.join(this.outputDir, installerFile);
            const targetPath = path.join(this.outputDir, 'SmartBlueprint-Pro-Setup.exe');
            
            // Copy with standard name
            fs.copyFileSync(sourcePath, targetPath);
            
            // Create checksums for integrity verification
            const fileBuffer = fs.readFileSync(targetPath);
            const sha256Hash = createHash('sha256').update(fileBuffer).digest('hex');
            
            fs.writeFileSync(
                path.join(this.outputDir, 'SmartBlueprint-Pro-Setup.exe.sha256'),
                sha256Hash
            );
            
            console.log('✓ One-click installer created');
            console.log(`  File: SmartBlueprint-Pro-Setup.exe`);
            console.log(`  Size: ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB`);
            console.log(`  SHA256: ${sha256Hash}`);
        } else {
            console.log('Available files:', files);
            throw new Error('Installer file not found');
        }
    }

    async finalizePackage() {
        console.log('📝 Finalizing package...');
        
        // Copy installer to project root for immediate download
        const installerPath = path.join(this.outputDir, 'SmartBlueprint-Pro-Setup.exe');
        const rootInstallerPath = path.join(this.projectRoot, 'SmartBlueprint-Pro-Setup.exe');
        
        if (fs.existsSync(installerPath)) {
            fs.copyFileSync(installerPath, rootInstallerPath);
            console.log('✓ Installer copied to project root for download');
        }
        
        console.log('✓ Package finalized');
    }

    copyDirectory(src, dest) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        
        const entries = fs.readdirSync(src, { withFileTypes: true });
        
        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            
            if (entry.isDirectory()) {
                this.copyDirectory(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }
}

// Run the build
async function main() {
    try {
        const builder = new DesktopAppBuilder();
        await builder.build();
    } catch (error) {
        console.error('Build process failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { DesktopAppBuilder };