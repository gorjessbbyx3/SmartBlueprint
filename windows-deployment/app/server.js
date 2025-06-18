
const express = require('express');
const path = require('path');
const fs = require('fs');

class SmartBlueprintDesktop {
    constructor() {
        this.app = express();
        this.port = 3000;
        this.dataDir = path.join(__dirname, '../data');
        this.setupDirectories();
        this.setupRoutes();
    }

    setupDirectories() {
        // Ensure data directories exist
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
        
        // Create subdirectories for different data types
        const subdirs = ['devices', 'analytics', 'settings', 'logs'];
        subdirs.forEach(dir => {
            const fullPath = path.join(this.dataDir, dir);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
            }
        });
    }

    setupRoutes() {
        // Serve static files
        this.app.use(express.static(path.join(__dirname, '../web')));
        this.app.use('/assets', express.static(path.join(__dirname, '../web/assets')));
        this.app.use(express.json());

        // Health check
        this.app.get('/api/health', (req, res) => {
            res.json({ 
                status: 'SmartBlueprint Pro Desktop Running',
                version: '1.0.0',
                mode: 'windows-desktop',
                platform: process.platform,
                dataDir: this.dataDir,
                timestamp: new Date().toISOString()
            });
        });

        // Desktop-specific API endpoints
        this.app.get('/api/desktop/info', (req, res) => {
            res.json({
                application: 'SmartBlueprint Pro',
                version: '1.0.0',
                platform: 'Windows Desktop',
                features: [
                    'offline-operation',
                    'local-data-storage',
                    'network-device-monitoring',
                    'ai-powered-analytics',
                    'interactive-mapping',
                    'smart-home-integration'
                ],
                installation: {
                    mode: 'standalone',
                    dataStorage: 'local',
                    internetRequired: false
                }
            });
        });

        // Data management endpoints
        this.app.get('/api/data/status', (req, res) => {
            try {
                const stats = {
                    devices: this.countFiles(path.join(this.dataDir, 'devices')),
                    analytics: this.countFiles(path.join(this.dataDir, 'analytics')),
                    settings: this.countFiles(path.join(this.dataDir, 'settings')),
                    logs: this.countFiles(path.join(this.dataDir, 'logs'))
                };
                res.json({ status: 'success', data: stats });
            } catch (error) {
                res.status(500).json({ status: 'error', message: error.message });
            }
        });

        // Settings management
        this.app.get('/api/settings', (req, res) => {
            try {
                const settingsFile = path.join(this.dataDir, 'settings', 'app-settings.json');
                if (fs.existsSync(settingsFile)) {
                    const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
                    res.json(settings);
                } else {
                    // Default settings
                    const defaultSettings = {
                        theme: 'dark',
                        autoScan: true,
                        scanInterval: 30,
                        notifications: true,
                        dataRetention: 30
                    };
                    res.json(defaultSettings);
                }
            } catch (error) {
                res.status(500).json({ status: 'error', message: error.message });
            }
        });

        this.app.post('/api/settings', (req, res) => {
            try {
                const settingsFile = path.join(this.dataDir, 'settings', 'app-settings.json');
                fs.writeFileSync(settingsFile, JSON.stringify(req.body, null, 2));
                res.json({ status: 'success', message: 'Settings saved' });
            } catch (error) {
                res.status(500).json({ status: 'error', message: error.message });
            }
        });

        // Default route - serve main application
        this.app.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, '../web/index.html'));
        });
    }

    countFiles(directory) {
        try {
            if (fs.existsSync(directory)) {
                return fs.readdirSync(directory).length;
            }
            return 0;
        } catch (error) {
            return 0;
        }
    }

    start() {
        this.app.listen(this.port, 'localhost', () => {
            console.log('=========================================');
            console.log('  SmartBlueprint Pro Desktop Started');
            console.log('=========================================');
            console.log(`Server: http://localhost:${this.port}`);
            console.log(`Data Directory: ${this.dataDir}`);
            console.log(`Platform: ${process.platform}`);
            console.log('Mode: Standalone Windows Desktop');
            console.log('Internet Required: No');
            console.log('=========================================');
            
            // Auto-launch browser after startup
            setTimeout(() => {
                const start = process.platform === 'win32' ? 'start' : 
                             process.platform === 'darwin' ? 'open' : 'xdg-open';
                require('child_process').exec(`${start} http://localhost:${this.port}`);
            }, 2000);
        });

        // Graceful shutdown handling
        process.on('SIGINT', () => {
            console.log('\nShutting down SmartBlueprint Pro Desktop...');
            process.exit(0);
        });

        process.on('SIGTERM', () => {
            console.log('\nSmartBlueprint Pro Desktop terminated');
            process.exit(0);
        });
    }
}

// Start the desktop application
const desktop = new SmartBlueprintDesktop();
desktop.start();
