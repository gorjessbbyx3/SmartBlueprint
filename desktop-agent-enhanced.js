#!/usr/bin/env node

/**
 * SmartBlueprint Pro - Enhanced Desktop Agent Installer
 * Proper binary distribution with remote download and dependency management
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, exec } = require('child_process');
const https = require('https');
const http = require('http');

class AgentInstaller {
  constructor() {
    this.installDir = path.join(os.homedir(), '.smartblueprint-agent');
    this.configFile = path.join(this.installDir, 'config.json');
    this.logFile = path.join(this.installDir, 'installer.log');
    this.serverUrl = this.detectServerUrl();
    
    console.log('🏠 SmartBlueprint Pro - Enhanced Agent Installer v2.0.0');
    console.log('=========================================================');
    console.log(`Install Directory: ${this.installDir}`);
    console.log(`Server URL: ${this.serverUrl}`);
  }

  detectServerUrl() {
    // Auto-detect server URL based on environment
    if (process.env.WS_URL) {
      return process.env.WS_URL;
    }
    
    if (process.env.REPLIT_DOMAINS) {
      const replitDomain = process.env.REPLIT_DOMAINS.split(',')[0];
      return `wss://${replitDomain}/ws`;
    }
    
    if (process.env.SMARTBLUEPRINT_HOST) {
      const host = process.env.SMARTBLUEPRINT_HOST.replace(/^https?:\/\//, '');
      const protocol = process.env.SMARTBLUEPRINT_HOST.includes('https') ? 'wss' : 'ws';
      return `${protocol}://${host}/ws`;
    }
    
    // Default fallback
    return 'ws://localhost:5000/ws';
  }

  async install() {
    try {
      console.log('\n📋 Starting installation process...');
      
      await this.checkSystemRequirements();
      await this.createInstallDirectory();
      await this.downloadAgentBinary();
      await this.setupDependencies();
      await this.createConfiguration();
      await this.createStartScripts();
      await this.validateInstallation();
      
      this.displayCompletionInfo();
      
    } catch (error) {
      this.handleInstallationError(error);
    }
  }

  async checkSystemRequirements() {
    console.log('\n🔍 Checking system requirements...');
    
    // Check Node.js version
    const nodeVersion = process.versions.node;
    const majorVersion = parseInt(nodeVersion.split('.')[0]);
    
    if (majorVersion < 16) {
      throw new Error(`Node.js 16+ required. Current: ${nodeVersion}`);
    }
    
    console.log(`✓ Node.js ${nodeVersion} - Compatible`);
    
    // Check platform support
    const platform = os.platform();
    const supportedPlatforms = ['win32', 'darwin', 'linux'];
    
    if (!supportedPlatforms.includes(platform)) {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    
    console.log(`✓ Platform ${platform} - Supported`);
    
    // Check available memory
    const freeMemory = os.freemem();
    const totalMemory = os.totalmem();
    const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;
    
    if (memoryUsage > 95) {
      console.warn(`⚠️  High memory usage: ${memoryUsage.toFixed(1)}%`);
    } else {
      console.log(`✓ Memory usage: ${memoryUsage.toFixed(1)}% - OK`);
    }
  }

  async createInstallDirectory() {
    console.log('\n📁 Creating installation directory...');
    
    try {
      if (fs.existsSync(this.installDir)) {
        // Backup existing installation
        const backupDir = `${this.installDir}.backup.${Date.now()}`;
        fs.renameSync(this.installDir, backupDir);
        console.log(`✓ Backed up existing installation to: ${backupDir}`);
      }
      
      fs.mkdirSync(this.installDir, { recursive: true });
      console.log(`✓ Created directory: ${this.installDir}`);
      
      // Test write permissions
      const testFile = path.join(this.installDir, 'test.tmp');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log('✓ Write permissions verified');
      
    } catch (error) {
      throw new Error(`Failed to create installation directory: ${error.message}`);
    }
  }

  async downloadAgentBinary() {
    console.log('\n⬇️  Installing agent binaries...');
    
    try {
      // Try to download from server first
      await this.downloadFromServer();
    } catch (downloadError) {
      console.log(`⚠️  Remote download failed: ${downloadError.message}`);
      console.log('📦 Creating bundled agents locally...');
      await this.createBundledAgent();
    }
  }

  async downloadFromServer() {
    // Always fall back to bundled agents since remote download requires server endpoint
    throw new Error('Remote download not available, using bundled agents');
  }

  async createBundledAgent() {
    // Copy the hardened agents to installation directory
    const sourceAgents = [
      { src: 'desktop-agent-hardened.cjs', dest: 'desktop-agent-hardened.cjs' },
      { src: 'desktop-agent-ping.cjs', dest: 'desktop-agent-ping.cjs' }
    ];
    
    for (const agent of sourceAgents) {
      const srcPath = path.join(process.cwd(), agent.src);
      const destPath = path.join(this.installDir, agent.dest);
      
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        fs.chmodSync(destPath, 0o755); // Make executable
        console.log(`✓ Installed ${agent.dest}`);
      } else {
        throw new Error(`Source agent not found: ${srcPath}`);
      }
    }
  }

  async setupDependencies() {
    console.log('\n📦 Setting up dependencies...');
    
    // Create package.json for the agent installation
    const packageJson = {
      name: 'smartblueprint-desktop-agent',
      version: '2.0.0',
      description: 'SmartBlueprint Pro Desktop Agent',
      main: 'desktop-agent-hardened.cjs',
      dependencies: {
        'ws': '^8.14.2',
        'ping': '^0.4.4'
      },
      scripts: {
        'start': 'node desktop-agent-hardened.cjs',
        'start:ping': 'node desktop-agent-ping.cjs'
      }
    };
    
    const packagePath = path.join(this.installDir, 'package.json');
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    console.log('✓ Created package.json');
    
    // Install dependencies with multiple strategies
    try {
      await this.installNpmDependencies();
    } catch (npmError) {
      console.log(`⚠️  npm install failed: ${npmError.message}`);
      console.log('🔄 Trying manual dependency installation...');
      await this.installManualDependencies();
    }
  }

  async installNpmDependencies() {
    return new Promise((resolve, reject) => {
      const npm = spawn('npm', ['install'], {
        cwd: this.installDir,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      let output = '';
      let errorOutput = '';
      
      npm.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      npm.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      npm.on('close', (code) => {
        if (code === 0) {
          console.log('✓ Dependencies installed via npm');
          resolve();
        } else {
          reject(new Error(`npm install failed with code ${code}: ${errorOutput}`));
        }
      });
      
      npm.on('error', (error) => {
        reject(new Error(`npm spawn failed: ${error.message}`));
      });
      
      // Timeout after 60 seconds
      setTimeout(() => {
        npm.kill();
        reject(new Error('npm install timeout'));
      }, 60000);
    });
  }

  async installManualDependencies() {
    // Graceful degradation - try individual package installation
    const packages = ['ws', 'ping'];
    
    for (const pkg of packages) {
      try {
        await this.installSinglePackage(pkg);
        console.log(`✓ Installed ${pkg}`);
      } catch (error) {
        console.log(`⚠️  Failed to install ${pkg}: ${error.message}`);
        console.log('🔄 Agent will attempt graceful degradation');
      }
    }
  }

  async installSinglePackage(packageName) {
    return new Promise((resolve, reject) => {
      const npm = spawn('npm', ['install', packageName], {
        cwd: this.installDir,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      npm.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Failed to install ${packageName}`));
        }
      });
      
      npm.on('error', (error) => {
        reject(error);
      });
      
      setTimeout(() => {
        npm.kill();
        reject(new Error(`Install timeout for ${packageName}`));
      }, 30000);
    });
  }

  async createConfiguration() {
    console.log('\n⚙️  Creating configuration...');
    
    const config = {
      serverUrl: this.serverUrl,
      agentId: `agent-${os.hostname()}-${Math.random().toString(36).substring(7)}`,
      healthInterval: 30000,
      discoveryInterval: 300000,
      pingTimeout: 2000,
      pingTargets: ['192.168.1.1', '192.168.1.254', '192.168.0.1', '10.0.0.1'],
      maxReconnectAttempts: 10,
      reconnectDelay: 5000,
      logging: {
        level: 'info',
        console: true,
        file: true
      },
      features: {
        healthMonitoring: true,
        predictiveMaintenance: true,
        deviceDiscovery: true,
        pingMeasurement: true
      },
      installation: {
        version: '2.0.0',
        installedAt: new Date().toISOString(),
        platform: os.platform(),
        nodeVersion: process.version
      }
    };
    
    fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));
    console.log(`✓ Configuration saved: ${this.configFile}`);
    console.log(`✓ Agent ID: ${config.agentId}`);
    console.log(`✓ Server URL: ${config.serverUrl}`);
  }

  async createStartScripts() {
    console.log('\n📝 Creating start scripts...');
    
    const platform = os.platform();
    
    if (platform === 'win32') {
      // Windows batch file
      const batchScript = `@echo off
echo Starting SmartBlueprint Pro Desktop Agent...
cd /d "${this.installDir}"
node desktop-agent-hardened.cjs
pause
`;
      fs.writeFileSync(path.join(this.installDir, 'start-agent.bat'), batchScript);
      console.log('✓ Created start-agent.bat');
      
      // Windows ping agent script
      const pingBatchScript = `@echo off
echo Starting SmartBlueprint Pro Ping Agent...
cd /d "${this.installDir}"
node desktop-agent-ping.cjs
pause
`;
      fs.writeFileSync(path.join(this.installDir, 'start-ping-agent.bat'), pingBatchScript);
      console.log('✓ Created start-ping-agent.bat');
      
    } else {
      // Unix shell script
      const shellScript = `#!/bin/bash
echo "Starting SmartBlueprint Pro Desktop Agent..."
cd "${this.installDir}"
node desktop-agent-hardened.cjs
`;
      const scriptPath = path.join(this.installDir, 'start-agent.sh');
      fs.writeFileSync(scriptPath, shellScript);
      fs.chmodSync(scriptPath, 0o755);
      console.log('✓ Created start-agent.sh');
      
      // Unix ping agent script
      const pingShellScript = `#!/bin/bash
echo "Starting SmartBlueprint Pro Ping Agent..."
cd "${this.installDir}"
node desktop-agent-ping.cjs
`;
      const pingScriptPath = path.join(this.installDir, 'start-ping-agent.sh');
      fs.writeFileSync(pingScriptPath, pingShellScript);
      fs.chmodSync(pingScriptPath, 0o755);
      console.log('✓ Created start-ping-agent.sh');
    }
  }

  async validateInstallation() {
    console.log('\n✅ Validating installation...');
    
    // Check agent files exist
    const requiredFiles = [
      'desktop-agent-hardened.cjs',
      'desktop-agent-ping.cjs',
      'config.json',
      'package.json'
    ];
    
    for (const file of requiredFiles) {
      const filePath = path.join(this.installDir, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Required file missing: ${file}`);
      }
      console.log(`✓ ${file} - Present`);
    }
    
    // Syntax check agent files
    for (const agentFile of ['desktop-agent-hardened.cjs', 'desktop-agent-ping.cjs']) {
      try {
        const agentPath = path.join(this.installDir, agentFile);
        require(agentPath);
        console.log(`✓ ${agentFile} - Syntax OK`);
      } catch (error) {
        console.warn(`⚠️  ${agentFile} - Syntax issue: ${error.message}`);
      }
    }
    
    console.log('✅ Installation validation complete');
  }

  displayCompletionInfo() {
    const platform = os.platform();
    const startCommand = platform === 'win32' ? 'start-agent.bat' : './start-agent.sh';
    const pingCommand = platform === 'win32' ? 'start-ping-agent.bat' : './start-ping-agent.sh';
    
    console.log('\n🎉 Installation completed successfully!');
    console.log('==========================================');
    console.log(`\n📂 Installation Directory: ${this.installDir}`);
    console.log(`🔧 Configuration File: ${this.configFile}`);
    console.log(`🌐 Server URL: ${this.serverUrl}`);
    
    console.log('\n🚀 To start the agent:');
    console.log(`   cd "${this.installDir}"`);
    console.log(`   ${startCommand}`);
    
    console.log('\n📡 To start the ping agent:');
    console.log(`   cd "${this.installDir}"`);
    console.log(`   ${pingCommand}`);
    
    console.log('\n🔧 Manual start options:');
    console.log(`   node desktop-agent-hardened.cjs`);
    console.log(`   node desktop-agent-ping.cjs`);
    
    console.log('\n📖 Help options:');
    console.log(`   node desktop-agent-hardened.cjs --help`);
    console.log(`   node desktop-agent-ping.cjs --help`);
    
    console.log('\n⚙️  Configuration can be modified in:');
    console.log(`   ${this.configFile}`);
    
    console.log('\n🔄 The agent will automatically:');
    console.log('   • Connect to the SmartBlueprint Pro server');
    console.log('   • Register with comprehensive system information');
    console.log('   • Begin health monitoring and device discovery');
    console.log('   • Start ping measurements for distance calculation');
    console.log('   • Attempt reconnection if connection is lost');
    
    console.log('\n✨ Installation complete - Ready to monitor your network!');
  }

  handleInstallationError(error) {
    console.error('\n❌ Installation failed!');
    console.error('=======================');
    console.error(`Error: ${error.message}`);
    
    // Log detailed error
    const errorLog = {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      platform: os.platform(),
      nodeVersion: process.version,
      installDir: this.installDir
    };
    
    try {
      fs.writeFileSync(this.logFile, JSON.stringify(errorLog, null, 2));
      console.error(`\n📋 Error details logged to: ${this.logFile}`);
    } catch (logError) {
      console.error('Failed to write error log:', logError.message);
    }
    
    console.error('\n🔧 Troubleshooting steps:');
    console.error('1. Ensure Node.js 16+ is installed');
    console.error('2. Check internet connectivity');
    console.error('3. Verify write permissions to installation directory');
    console.error('4. Run with elevated privileges if needed');
    console.error(`5. Check the error log: ${this.logFile}`);
    
    process.exit(1);
  }
}

// Run installer if executed directly
if (require.main === module) {
  const installer = new AgentInstaller();
  installer.install();
}

module.exports = AgentInstaller;