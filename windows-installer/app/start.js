
const { spawn } = require('child_process');
const path = require('path');
const { promisify } = require('util');
const { exec } = require('child_process');
const execAsync = promisify(exec);

class SmartBlueprintLauncher {
    constructor() {
        this.serverPort = 5000;
        this.serverUrl = `http://localhost:${this.serverPort}`;
        this.serverProcess = null;
    }

    async start() {
        console.log('🚀 Starting SmartBlueprint Pro...');
        
        try {
            await this.startServer();
            await this.waitForServer();
            await this.openBrowser();
            
            console.log('✅ SmartBlueprint Pro is running!');
            console.log(`🌐 Access at: ${this.serverUrl}`);
            console.log('Press Ctrl+C to stop the application');
            
        } catch (error) {
            console.error('❌ Failed to start:', error.message);
            process.exit(1);
        }
    }

    async startServer() {
        console.log('Starting server...');
        
        this.serverProcess = spawn('node', [path.join(__dirname, 'web', 'index.js')], {
            stdio: 'pipe',
            env: { ...process.env, PORT: this.serverPort }
        });

        this.serverProcess.stdout.on('data', (data) => {
            console.log('Server:', data.toString().trim());
        });

        this.serverProcess.stderr.on('data', (data) => {
            console.error('Server error:', data.toString().trim());
        });

        this.serverProcess.on('error', (error) => {
            throw new Error(`Server failed to start: ${error.message}`);
        });
    }

    async waitForServer() {
        console.log('Waiting for server to be ready...');
        
        for (let i = 0; i < 30; i++) {
            try {
                await execAsync(`curl -s ${this.serverUrl} > nul 2>&1`);
                return;
            } catch (error) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        throw new Error('Server failed to start within 30 seconds');
    }

    async openBrowser() {
        console.log('Opening web interface...');
        
        const commands = [
            `start "" "${this.serverUrl}"`,  // Windows
            `open "${this.serverUrl}"`,      // macOS
            `xdg-open "${this.serverUrl}"`   // Linux
        ];
        
        for (const command of commands) {
            try {
                await execAsync(command);
                return;
            } catch (error) {
                // Try next command
            }
        }
        
        console.log(`⚠️  Could not open browser automatically. Please visit: ${this.serverUrl}`);
    }

    stop() {
        if (this.serverProcess) {
            this.serverProcess.kill();
            console.log('🛑 SmartBlueprint Pro stopped');
        }
    }
}

// Handle graceful shutdown
const launcher = new SmartBlueprintLauncher();

process.on('SIGINT', () => {
    launcher.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    launcher.stop();
    process.exit(0);
});

// Start the application
launcher.start().catch((error) => {
    console.error('Fatal error:', error.message);
    process.exit(1);
});
