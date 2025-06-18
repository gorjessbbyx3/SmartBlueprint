// SmartBlueprint Pro - Complete Desktop Application
// Packages entire web UI into standalone Windows executable

const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const express = require('express');

class SmartBlueprintDesktopApp {
    constructor() {
        this.mainWindow = null;
        this.serverProcess = null;
        this.expressApp = null;
        this.httpServer = null;
        this.port = 8080;
        this.isServerReady = false;
    }

    async initialize() {
        console.log('Initializing SmartBlueprint Pro Desktop Application...');
        
        // Set up app event handlers
        app.whenReady().then(() => this.createApplication());
        app.on('window-all-closed', () => this.handleWindowsClosed());
        app.on('activate', () => this.handleActivate());
        
        // Handle app protocol for deep linking
        app.setAsDefaultProtocolClient('smartblueprint');
    }

    async createApplication() {
        console.log('Creating main application window...');
        
        // Start embedded server first
        await this.startEmbeddedServer();
        
        // Create the main window
        this.createMainWindow();
        
        // Set up application menu
        this.createApplicationMenu();
        
        console.log('SmartBlueprint Pro Desktop Application ready');
    }

    async startEmbeddedServer() {
        console.log('Starting embedded SmartBlueprint server...');
        
        try {
            // Create Express app with all routes
            this.expressApp = express();
            
            // Serve static files from the dist directory
            const distPath = path.join(__dirname, 'dist');
            if (fs.existsSync(distPath)) {
                this.expressApp.use(express.static(distPath));
            } else {
                // Fallback to client build if dist doesn't exist
                const clientPath = path.join(__dirname, 'client', 'dist');
                this.expressApp.use(express.static(clientPath));
            }
            
            // Add JSON parsing middleware
            this.expressApp.use(express.json());
            
            // Add all SmartBlueprint API routes
            this.setupAPIRoutes();
            
            // Start the HTTP server
            this.httpServer = this.expressApp.listen(this.port, '127.0.0.1', () => {
                console.log(`Embedded server running on http://127.0.0.1:${this.port}`);
                this.isServerReady = true;
            });
            
            // Wait for server to be ready
            await this.waitForServer();
            
        } catch (error) {
            console.error('Failed to start embedded server:', error);
            dialog.showErrorBox('Server Error', 'Failed to start SmartBlueprint server: ' + error.message);
        }
    }

    setupAPIRoutes() {
        // Device discovery routes
        this.expressApp.get('/api/devices', (req, res) => {
            res.json({
                devices: [],
                message: 'Desktop agent required for device discovery'
            });
        });

        // System health routes
        this.expressApp.get('/api/system/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                components: {
                    'ui': 'operational',
                    'desktop-app': 'operational',
                    'embedded-server': 'operational'
                }
            });
        });

        // Platform integration routes
        this.expressApp.get('/api/platforms', (req, res) => {
            res.json({
                platforms: [
                    { id: 'hue', name: 'Philips Hue', status: 'disconnected' },
                    { id: 'nest', name: 'Google Nest', status: 'disconnected' },
                    { id: 'alexa', name: 'Amazon Alexa', status: 'disconnected' }
                ]
            });
        });

        // Analytics routes
        this.expressApp.get('/api/analytics/dashboard', (req, res) => {
            res.json({
                totalDevices: 0,
                onlineDevices: 0,
                offlineDevices: 0,
                signalQuality: 'unknown',
                lastScan: null
            });
        });

        // AI insights routes
        this.expressApp.get('/api/ai/insights', (req, res) => {
            res.json({
                insights: [],
                systemHealth: 'good',
                recommendations: []
            });
        });

        // Settings routes
        this.expressApp.get('/api/settings', (req, res) => {
            res.json({
                scanInterval: 30,
                enableNotifications: true,
                theme: 'light'
            });
        });

        this.expressApp.post('/api/settings', (req, res) => {
            res.json({ success: true, settings: req.body });
        });

        // Catch-all route for SPA
        this.expressApp.get('*', (req, res) => {
            const indexPath = path.join(__dirname, 'dist', 'index.html');
            if (fs.existsSync(indexPath)) {
                res.sendFile(indexPath);
            } else {
                res.status(404).send('SmartBlueprint Pro - Application files not found');
            }
        });
    }

    async waitForServer() {
        return new Promise((resolve) => {
            const checkServer = () => {
                if (this.isServerReady) {
                    resolve();
                } else {
                    setTimeout(checkServer, 100);
                }
            };
            checkServer();
        });
    }

    createMainWindow() {
        console.log('Creating main window...');
        
        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            minWidth: 800,
            minHeight: 600,
            icon: path.join(__dirname, 'assets', 'icon.png'),
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                enableRemoteModule: false,
                preload: path.join(__dirname, 'electron-preload.js')
            },
            title: 'SmartBlueprint Pro - Network Monitoring',
            show: false // Don't show until ready
        });

        // Load the application
        this.mainWindow.loadURL(`http://127.0.0.1:${this.port}`);

        // Show window when ready
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();
            
            // Focus the window
            if (this.mainWindow) {
                this.mainWindow.focus();
            }
        });

        // Handle window closed
        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });

        // Handle external links
        this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            shell.openExternal(url);
            return { action: 'deny' };
        });

        // Development tools in development mode
        if (process.env.NODE_ENV === 'development') {
            this.mainWindow.webContents.openDevTools();
        }
    }

    createApplicationMenu() {
        const template = [
            {
                label: 'File',
                submenu: [
                    {
                        label: 'Refresh',
                        accelerator: 'F5',
                        click: () => {
                            if (this.mainWindow) {
                                this.mainWindow.reload();
                            }
                        }
                    },
                    {
                        label: 'Export Data',
                        click: async () => {
                            const result = await dialog.showSaveDialog(this.mainWindow, {
                                title: 'Export SmartBlueprint Data',
                                defaultPath: 'smartblueprint-export.json',
                                filters: [
                                    { name: 'JSON Files', extensions: ['json'] },
                                    { name: 'CSV Files', extensions: ['csv'] },
                                    { name: 'All Files', extensions: ['*'] }
                                ]
                            });
                            
                            if (!result.canceled) {
                                // Export data logic would go here
                                console.log('Exporting data to:', result.filePath);
                            }
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Exit',
                        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                        click: () => {
                            app.quit();
                        }
                    }
                ]
            },
            {
                label: 'View',
                submenu: [
                    {
                        label: 'Dashboard',
                        accelerator: 'Ctrl+1',
                        click: () => {
                            if (this.mainWindow) {
                                this.mainWindow.webContents.executeJavaScript(`
                                    if (window.location.pathname !== '/') {
                                        window.location.href = '/';
                                    }
                                `);
                            }
                        }
                    },
                    {
                        label: 'Device List',
                        accelerator: 'Ctrl+2',
                        click: () => {
                            if (this.mainWindow) {
                                this.mainWindow.webContents.executeJavaScript(`
                                    window.location.href = '/devices';
                                `);
                            }
                        }
                    },
                    {
                        label: 'Analytics',
                        accelerator: 'Ctrl+3',
                        click: () => {
                            if (this.mainWindow) {
                                this.mainWindow.webContents.executeJavaScript(`
                                    window.location.href = '/analytics';
                                `);
                            }
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Zoom In',
                        accelerator: 'Ctrl+Plus',
                        click: () => {
                            if (this.mainWindow) {
                                this.mainWindow.webContents.setZoomLevel(
                                    this.mainWindow.webContents.getZoomLevel() + 1
                                );
                            }
                        }
                    },
                    {
                        label: 'Zoom Out',
                        accelerator: 'Ctrl+-',
                        click: () => {
                            if (this.mainWindow) {
                                this.mainWindow.webContents.setZoomLevel(
                                    this.mainWindow.webContents.getZoomLevel() - 1
                                );
                            }
                        }
                    },
                    {
                        label: 'Reset Zoom',
                        accelerator: 'Ctrl+0',
                        click: () => {
                            if (this.mainWindow) {
                                this.mainWindow.webContents.setZoomLevel(0);
                            }
                        }
                    }
                ]
            },
            {
                label: 'Tools',
                submenu: [
                    {
                        label: 'Network Scan',
                        accelerator: 'Ctrl+R',
                        click: () => {
                            if (this.mainWindow) {
                                this.mainWindow.webContents.executeJavaScript(`
                                    if (window.triggerNetworkScan) {
                                        window.triggerNetworkScan();
                                    }
                                `);
                            }
                        }
                    },
                    {
                        label: 'Agent Status',
                        click: () => {
                            if (this.mainWindow) {
                                this.mainWindow.webContents.executeJavaScript(`
                                    window.location.href = '/system-health';
                                `);
                            }
                        }
                    },
                    {
                        label: 'Settings',
                        accelerator: 'Ctrl+,',
                        click: () => {
                            if (this.mainWindow) {
                                this.mainWindow.webContents.executeJavaScript(`
                                    window.location.href = '/settings';
                                `);
                            }
                        }
                    }
                ]
            },
            {
                label: 'Help',
                submenu: [
                    {
                        label: 'About SmartBlueprint Pro',
                        click: () => {
                            dialog.showMessageBox(this.mainWindow, {
                                type: 'info',
                                title: 'About SmartBlueprint Pro',
                                message: 'SmartBlueprint Pro',
                                detail: 'Advanced Network Monitoring & Device Management\n\nVersion 1.0.0\nBuilt with Electron\n\nCopyright © 2025 SmartBlueprint Pro'
                            });
                        }
                    },
                    {
                        label: 'User Guide',
                        click: () => {
                            if (this.mainWindow) {
                                this.mainWindow.webContents.executeJavaScript(`
                                    window.location.href = '/help';
                                `);
                            }
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Open DevTools',
                        accelerator: 'F12',
                        click: () => {
                            if (this.mainWindow) {
                                this.mainWindow.webContents.openDevTools();
                            }
                        }
                    }
                ]
            }
        ];

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    }

    handleWindowsClosed() {
        // Clean up server
        if (this.httpServer) {
            this.httpServer.close();
        }
        
        // On macOS, keep app running even when all windows are closed
        if (process.platform !== 'darwin') {
            app.quit();
        }
    }

    handleActivate() {
        // On macOS, re-create window when dock icon is clicked
        if (BrowserWindow.getAllWindows().length === 0) {
            this.createMainWindow();
        }
    }
}

// Initialize and start the application
const smartBlueprintApp = new SmartBlueprintDesktopApp();
smartBlueprintApp.initialize();