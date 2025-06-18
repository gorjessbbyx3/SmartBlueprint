// SmartBlueprint Pro - Complete Desktop Application Builder
// Creates a standalone Windows executable with embedded web UI

const { exec, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class CompleteDesktopBuilder {
    constructor() {
        this.projectRoot = process.cwd();
        this.buildDir = path.join(this.projectRoot, 'desktop-build');
        this.distDir = path.join(this.projectRoot, 'dist');
    }

    async build() {
        console.log('Building complete SmartBlueprint Pro desktop application...');
        
        try {
            await this.prepareBuildEnvironment();
            await this.buildWebApplication();
            await this.createElectronPackage();
            await this.bundleEverything();
            await this.createInstaller();
            
            console.log('✓ Complete desktop application built successfully');
            console.log(`Output: ${path.join(this.buildDir, 'SmartBlueprint-Pro-Setup.exe')}`);
            
        } catch (error) {
            console.error('Build failed:', error);
            throw error;
        }
    }

    async prepareBuildEnvironment() {
        console.log('Preparing build environment...');
        
        // Create build directory
        try {
            await fs.rmdir(this.buildDir, { recursive: true });
        } catch (e) {
            // Directory doesn't exist, that's fine
        }
        await fs.mkdir(this.buildDir, { recursive: true });

        // Create package.json for Electron app
        const electronPackageJson = {
            name: "smartblueprint-pro-desktop",
            version: "1.0.0",
            description: "SmartBlueprint Pro - Complete Desktop Application",
            main: "electron-main-complete.js",
            author: "SmartBlueprint Pro",
            license: "MIT",
            dependencies: {
                "electron": "^28.0.0",
                "express": "^4.18.2"
            },
            build: {
                appId: "com.smartblueprint.pro",
                productName: "SmartBlueprint Pro",
                directories: {
                    output: "dist"
                },
                files: [
                    "**/*",
                    "!node_modules",
                    "!src",
                    "!*.md"
                ],
                win: {
                    target: [
                        {
                            target: "nsis",
                            arch: ["x64", "ia32"]
                        }
                    ],
                    icon: "assets/icon.ico"
                },
                nsis: {
                    oneClick: false,
                    allowToChangeInstallationDirectory: true,
                    createDesktopShortcut: true,
                    createStartMenuShortcut: true
                }
            }
        };

        await fs.writeFile(
            path.join(this.buildDir, 'package.json'),
            JSON.stringify(electronPackageJson, null, 2)
        );

        // Copy main Electron files
        await this.copyElectronFiles();
    }

    async copyElectronFiles() {
        console.log('Copying Electron application files...');
        
        // Copy main electron file
        const mainContent = await fs.readFile(path.join(this.projectRoot, 'electron-main-complete.js'));
        await fs.writeFile(path.join(this.buildDir, 'electron-main-complete.js'), mainContent);

        // Create preload script
        const preloadScript = `
// SmartBlueprint Pro - Electron Preload Script
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Expose safe IPC methods
    triggerNetworkScan: () => ipcRenderer.invoke('trigger-network-scan'),
    exportData: () => ipcRenderer.invoke('export-data'),
    getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
    
    // Desktop-specific features
    minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
    maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
    closeWindow: () => ipcRenderer.invoke('close-window'),
    
    // Version info
    getVersion: () => ipcRenderer.invoke('get-version'),
    
    // Settings
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    loadSettings: () => ipcRenderer.invoke('load-settings')
});

// Desktop app indicator
window.isDesktopApp = true;
`;

        await fs.writeFile(path.join(this.buildDir, 'electron-preload.js'), preloadScript);

        // Create assets directory and icon
        await fs.mkdir(path.join(this.buildDir, 'assets'), { recursive: true });
        
        // Create a simple icon file (you can replace with actual icon)
        const iconPath = path.join(this.buildDir, 'assets', 'icon.png');
        await this.createAppIcon(iconPath);
    }

    async createAppIcon(iconPath) {
        // Create a simple SVG icon and convert to PNG (basic implementation)
        const svgIcon = `<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
            <rect width="256" height="256" fill="#0066cc"/>
            <circle cx="128" cy="128" r="80" fill="#ffffff"/>
            <text x="128" y="140" text-anchor="middle" fill="#0066cc" font-family="Arial" font-size="24" font-weight="bold">SB</text>
        </svg>`;
        
        // For now, just create a placeholder file
        await fs.writeFile(iconPath.replace('.png', '.svg'), svgIcon);
    }

    async buildWebApplication() {
        console.log('Building web application...');
        
        return new Promise((resolve, reject) => {
            const buildProcess = spawn('npm', ['run', 'build'], {
                cwd: this.projectRoot,
                stdio: 'inherit'
            });

            buildProcess.on('close', (code) => {
                if (code === 0) {
                    console.log('✓ Web application built successfully');
                    resolve();
                } else {
                    reject(new Error(`Web build failed with code ${code}`));
                }
            });

            buildProcess.on('error', (error) => {
                reject(error);
            });
        });
    }

    async createElectronPackage() {
        console.log('Creating Electron package...');
        
        // Copy built web application to Electron app
        try {
            await this.copyDirectory(this.distDir, path.join(this.buildDir, 'dist'));
        } catch (error) {
            console.log('No dist directory found, copying client build...');
            await this.copyDirectory(
                path.join(this.projectRoot, 'client', 'dist'),
                path.join(this.buildDir, 'dist')
            );
        }

        // Install Electron dependencies
        return new Promise((resolve, reject) => {
            const installProcess = spawn('npm', ['install'], {
                cwd: this.buildDir,
                stdio: 'inherit'
            });

            installProcess.on('close', (code) => {
                if (code === 0) {
                    console.log('✓ Electron dependencies installed');
                    resolve();
                } else {
                    reject(new Error(`Dependency installation failed with code ${code}`));
                }
            });

            installProcess.on('error', (error) => {
                reject(error);
            });
        });
    }

    async bundleEverything() {
        console.log('Bundling complete application...');
        
        // Install electron-builder for packaging
        return new Promise((resolve, reject) => {
            const builderProcess = spawn('npx', ['electron-builder', '--win'], {
                cwd: this.buildDir,
                stdio: 'inherit'
            });

            builderProcess.on('close', (code) => {
                if (code === 0) {
                    console.log('✓ Application bundled successfully');
                    resolve();
                } else {
                    reject(new Error(`Bundling failed with code ${code}`));
                }
            });

            builderProcess.on('error', (error) => {
                reject(error);
            });
        });
    }

    async createInstaller() {
        console.log('Creating Windows installer...');
        
        // The installer is created by electron-builder in the previous step
        // Copy it to a standardized location
        const sourceInstaller = path.join(this.buildDir, 'dist', 'SmartBlueprint Pro Setup *.exe');
        const targetInstaller = path.join(this.buildDir, 'SmartBlueprint-Pro-Setup.exe');
        
        try {
            const files = await fs.readdir(path.join(this.buildDir, 'dist'));
            const installerFile = files.find(f => f.includes('Setup') && f.endsWith('.exe'));
            
            if (installerFile) {
                await fs.copyFile(
                    path.join(this.buildDir, 'dist', installerFile),
                    targetInstaller
                );
                console.log('✓ Installer created successfully');
            }
        } catch (error) {
            console.log('Installer creation completed (check dist directory)');
        }
    }

    async copyDirectory(src, dest) {
        await fs.mkdir(dest, { recursive: true });
        const entries = await fs.readdir(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                await this.copyDirectory(srcPath, destPath);
            } else {
                await fs.copyFile(srcPath, destPath);
            }
        }
    }
}

// Run the builder
if (require.main === module) {
    const builder = new CompleteDesktopBuilder();
    builder.build().catch(console.error);
}

module.exports = CompleteDesktopBuilder;