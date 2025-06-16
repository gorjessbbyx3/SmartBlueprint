#!/usr/bin/env node

/**
 * SmartBlueprint Pro Desktop Agent Installer
 * Downloads and installs the desktop agent for local network scanning
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const AGENT_VERSION = '1.0.0';
const INSTALL_DIR = path.join(require('os').homedir(), '.smartblueprint-agent');
const CONFIG_FILE = path.join(INSTALL_DIR, 'config.json');

console.log('🔧 SmartBlueprint Pro Desktop Agent Installer');
console.log('================================================');

async function installAgent() {
  try {
    // Create installation directory
    if (!fs.existsSync(INSTALL_DIR)) {
      fs.mkdirSync(INSTALL_DIR, { recursive: true });
      console.log('✓ Created installation directory');
    }

    // Copy agent files
    const agentScript = `
const { spawn } = require('child_process');
const WebSocket = require('ws');
const dgram = require('dgram');
const os = require('os');
const fs = require('fs');
const path = require('path');

class DesktopAgent {
  constructor() {
    this.config = this.loadConfig();
    this.ws = null;
    this.scanning = false;
    this.devices = new Map();
  }

  loadConfig() {
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    return {
      serverUrl: 'ws://localhost:5000/agent-tunnel',
      agentId: 'agent-' + Math.random().toString(36).substring(7),
      scanInterval: 30000
    };
  }

  saveConfig() {
    const configPath = path.join(__dirname, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
  }

  connect() {
    console.log('🔗 Connecting to SmartBlueprint Pro server...');
    this.ws = new WebSocket(this.config.serverUrl);
    
    this.ws.on('open', () => {
      console.log('✓ Connected to server');
      this.register();
      this.startScanning();
    });

    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    });

    this.ws.on('close', () => {
      console.log('⚠️ Connection lost. Reconnecting in 5s...');
      setTimeout(() => this.connect(), 5000);
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error.message);
    });
  }

  register() {
    const registration = {
      type: 'agent_register',
      agentId: this.config.agentId,
      hostname: os.hostname(),
      platform: os.platform(),
      version: '${AGENT_VERSION}',
      capabilities: ['network_scan', 'device_discovery', 'signal_monitoring']
    };
    
    this.send(registration);
  }

  handleMessage(message) {
    switch (message.type) {
      case 'scan_request':
        this.performNetworkScan();
        break;
      case 'config_update':
        Object.assign(this.config, message.config);
        this.saveConfig();
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  startScanning() {
    console.log('🔍 Starting network scanning...');
    this.performNetworkScan();
    
    setInterval(() => {
      this.performNetworkScan();
    }, this.config.scanInterval);
  }

  async performNetworkScan() {
    if (this.scanning) return;
    this.scanning = true;

    try {
      console.log('📡 Scanning network for devices...');
      const devices = await this.scanLocalNetwork();
      
      const update = {
        type: 'device_update',
        agentId: this.config.agentId,
        timestamp: new Date().toISOString(),
        devices: devices
      };
      
      this.send(update);
      console.log(\`✓ Found \${devices.length} devices\`);
    } catch (error) {
      console.error('Scan failed:', error.message);
    } finally {
      this.scanning = false;
    }
  }

  async scanLocalNetwork() {
    const devices = [];
    const networkInterfaces = os.networkInterfaces();
    
    // Get local IP range
    let localIP = null;
    for (const iface of Object.values(networkInterfaces)) {
      for (const addr of iface) {
        if (addr.family === 'IPv4' && !addr.internal && addr.address.startsWith('192.168.')) {
          localIP = addr.address;
          break;
        }
      }
      if (localIP) break;
    }

    if (!localIP) {
      throw new Error('Could not determine local network range');
    }

    const baseIP = localIP.split('.').slice(0, 3).join('.');
    const promises = [];

    // Scan IP range
    for (let i = 1; i <= 254; i++) {
      const ip = \`\${baseIP}.\${i}\`;
      promises.push(this.pingHost(ip));
    }

    const results = await Promise.allSettled(promises);
    
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'fulfilled' && results[i].value) {
        const ip = \`\${baseIP}.\${i + 1}\`;
        const device = await this.identifyDevice(ip);
        if (device) {
          devices.push(device);
        }
      }
    }

    return devices;
  }

  async pingHost(ip) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 1000);
      
      try {
        const platform = os.platform();
        const cmd = platform === 'win32' ? \`ping -n 1 -w 1000 \${ip}\` : \`ping -c 1 -W 1 \${ip}\`;
        
        execSync(cmd, { stdio: 'ignore', timeout: 1500 });
        clearTimeout(timeout);
        resolve(true);
      } catch (error) {
        clearTimeout(timeout);
        resolve(false);
      }
    });
  }

  async identifyDevice(ip) {
    try {
      // Try to get MAC address
      const macAddress = this.getMacAddress(ip);
      
      // Basic device info
      const device = {
        ip: ip,
        macAddress: macAddress || 'unknown',
        deviceType: 'unknown',
        protocol: 'IP',
        rssi: -50 + Math.random() * -40, // Simulated RSSI
        lastSeen: new Date().toISOString(),
        vendor: this.getVendorFromMac(macAddress)
      };

      // Try to identify device type by common ports
      const deviceType = await this.detectDeviceType(ip);
      if (deviceType) {
        device.deviceType = deviceType;
      }

      return device;
    } catch (error) {
      return null;
    }
  }

  getMacAddress(ip) {
    try {
      const platform = os.platform();
      if (platform === 'win32') {
        const output = execSync(\`arp -a \${ip}\`, { encoding: 'utf8', timeout: 2000 });
        const match = output.match(/([0-9a-f]{2}[:-]){5}[0-9a-f]{2}/i);
        return match ? match[0] : null;
      } else {
        const output = execSync(\`arp -n \${ip}\`, { encoding: 'utf8', timeout: 2000 });
        const match = output.match(/([0-9a-f]{2}[:-]){5}[0-9a-f]{2}/i);
        return match ? match[0] : null;
      }
    } catch (error) {
      return null;
    }
  }

  getVendorFromMac(mac) {
    if (!mac) return 'Unknown';
    
    const vendors = {
      '00:50:43': 'Philips',
      '28:6d:cd': 'Amazon',
      '18:b4:30': 'Nest Labs',
      'b8:27:eb': 'Raspberry Pi',
      '00:16:b6': 'Linksys'
    };
    
    const prefix = mac.substring(0, 8).toLowerCase();
    return vendors[prefix] || 'Unknown';
  }

  async detectDeviceType(ip) {
    const portChecks = [
      { port: 80, type: 'smart_device' },
      { port: 443, type: 'smart_device' },
      { port: 1900, type: 'upnp_device' },
      { port: 5353, type: 'mdns_device' }
    ];

    for (const check of portChecks) {
      if (await this.checkPort(ip, check.port)) {
        return check.type;
      }
    }
    
    return 'unknown';
  }

  async checkPort(ip, port) {
    return new Promise((resolve) => {
      const socket = new require('net').Socket();
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, 1000);

      socket.connect(port, ip, () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve(true);
      });

      socket.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });
  }
}

// Start the agent
const agent = new DesktopAgent();
agent.connect();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n🛑 Shutting down desktop agent...');
  process.exit(0);
});
`;

    // Write agent script
    const agentPath = path.join(INSTALL_DIR, 'agent.js');
    fs.writeFileSync(agentPath, agentScript);
    console.log('✓ Installed desktop agent');

    // Create default config
    const defaultConfig = {
      serverUrl: 'ws://localhost:5000/agent-tunnel',
      agentId: 'agent-' + Math.random().toString(36).substring(7),
      scanInterval: 30000
    };
    
    if (!fs.existsSync(CONFIG_FILE)) {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
      console.log('✓ Created configuration file');
    }

    // Create start script
    const startScript = process.platform === 'win32' ? 
      `@echo off
cd /d "${INSTALL_DIR}"
node agent.js
pause` : 
      `#!/bin/bash
cd "${INSTALL_DIR}"
node agent.js`;

    const startScriptPath = path.join(INSTALL_DIR, process.platform === 'win32' ? 'start.bat' : 'start.sh');
    fs.writeFileSync(startScriptPath, startScript);
    
    if (process.platform !== 'win32') {
      fs.chmodSync(startScriptPath, '755');
    }
    
    console.log('✓ Created start script');

    // Install dependencies
    console.log('📦 Installing dependencies...');
    execSync('npm install ws', { cwd: INSTALL_DIR, stdio: 'ignore' });
    console.log('✓ Dependencies installed');

    console.log('\\n🎉 Installation Complete!');
    console.log('========================');
    console.log(\`Installation directory: \${INSTALL_DIR}\`);
    console.log(\`Configuration file: \${CONFIG_FILE}\`);
    console.log('\\n📋 Next Steps:');
    console.log('1. Edit config.json to set your server URL');
    console.log(\`2. Run: cd "\${INSTALL_DIR}" && node agent.js\`);
    console.log(\`3. Or use the start script: \${startScriptPath}\`);
    console.log('\\n🔧 The agent will automatically:');
    console.log('  • Scan your local network for devices');
    console.log('  • Connect to your SmartBlueprint Pro server');
    console.log('  • Send real-time device updates');

  } catch (error) {
    console.error('❌ Installation failed:', error.message);
    process.exit(1);
  }
}

// Run installer
installAgent();