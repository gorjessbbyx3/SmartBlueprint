/**
 * SmartBlueprint Pro - Embedded Desktop Agent
 * Integrated monitoring agent for Electron desktop application
 */

const os = require('os');
const { spawn, exec } = require('child_process');
const { EventEmitter } = require('events');
const WebSocket = require('ws');

class EmbeddedDesktopAgent extends EventEmitter {
  constructor() {
    super();
    this.config = this.loadConfig();
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.monitoring = false;
    this.deviceCache = new Map();
    this.performanceHistory = [];
  }

  loadConfig() {
    try {
      const configStr = process.env.AGENT_CONFIG;
      return configStr ? JSON.parse(configStr) : this.getDefaultConfig();
    } catch (error) {
      console.log('[Agent] Using default configuration');
      return this.getDefaultConfig();
    }
  }

  getDefaultConfig() {
    return {
      wsUrl: 'ws://localhost:5000/ws',
      agentId: `embedded-${os.hostname()}-${Date.now()}`,
      mode: 'desktop',
      pingInterval: 30000,
      deviceScanInterval: 60000,
      reconnectDelay: 5000
    };
  }

  async start() {
    console.log('[Agent] Starting SmartBlueprint Embedded Agent');
    console.log(`[Agent] Agent ID: ${this.config.agentId}`);
    console.log(`[Agent] Mode: Desktop Integration`);
    
    await this.connect();
    this.startMonitoring();
    this.setupStdinHandler();
  }

  async connect() {
    try {
      this.ws = new WebSocket(this.config.wsUrl);
      
      this.ws.on('open', () => {
        console.log('[Agent] Connected to local SmartBlueprint server');
        this.reconnectAttempts = 0;
        this.registerAgent();
      });
      
      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleServerMessage(message);
        } catch (error) {
          console.error('[Agent] Invalid message format:', error.message);
        }
      });
      
      this.ws.on('error', (error) => {
        console.log(`[Agent] Connection error: ${error.message}`);
      });
      
      this.ws.on('close', () => {
        console.log('[Agent] Connection closed');
        this.scheduleReconnect();
      });
      
    } catch (error) {
      console.error('[Agent] Failed to connect:', error.message);
      this.scheduleReconnect();
    }
  }

  registerAgent() {
    const capabilities = [
      'device_discovery',
      'ping_monitoring', 
      'system_monitoring',
      'network_analysis'
    ];

    const registration = {
      type: 'agent_register',
      agentId: this.config.agentId,
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      capabilities,
      mode: 'desktop_embedded',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    };
    
    this.sendMessage(registration);
    console.log('[Agent] Registration sent to local server');
  }

  startMonitoring() {
    if (this.monitoring) return;
    this.monitoring = true;
    
    console.log('[Agent] Starting monitoring services...');
    
    // Comprehensive system monitoring
    setInterval(() => {
      this.performSystemAnalysis();
    }, 30000); // Every 30 seconds
    
    // Network device discovery
    setInterval(() => {
      this.performDeviceDiscovery();
    }, this.config.deviceScanInterval);
    
    // Active ping monitoring
    setInterval(() => {
      this.performPingMeasurements();
    }, this.config.pingInterval);
    
    // Performance health check
    setInterval(() => {
      this.performHealthCheck();
    }, 120000); // Every 2 minutes
  }

  async performSystemAnalysis() {
    try {
      const systemMetrics = await this.collectSystemMetrics();
      const networkMetrics = await this.collectNetworkMetrics();
      
      const analysis = {
        type: 'system_analysis',
        agentId: this.config.agentId,
        metrics: {
          system: systemMetrics,
          network: networkMetrics,
          timestamp: Date.now()
        },
        timestamp: new Date().toISOString()
      };
      
      this.sendMessage(analysis);
      this.updatePerformanceHistory(systemMetrics);
      
    } catch (error) {
      console.error('[Agent] System analysis failed:', error.message);
    }
  }

  async collectSystemMetrics() {
    const cpuUsage = await this.getCPUUsage();
    const memInfo = process.memoryUsage();
    
    return {
      cpu: {
        usage: cpuUsage,
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || 'Unknown'
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        processRss: memInfo.rss,
        processHeap: memInfo.heapUsed
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptime: os.uptime(),
        loadAvg: os.loadavg()
      }
    };
  }

  async getCPUUsage() {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const totalUsage = endUsage.user + endUsage.system;
        const percentage = (totalUsage / 1000000) * 100; // Convert to percentage
        resolve(Math.min(100, Math.max(0, percentage)));
      }, 1000);
    });
  }

  async collectNetworkMetrics() {
    const networkInterfaces = os.networkInterfaces();
    const activeInterfaces = [];
    
    for (const [name, interfaces] of Object.entries(networkInterfaces)) {
      for (const iface of interfaces) {
        if (!iface.internal && iface.family === 'IPv4') {
          activeInterfaces.push({
            name,
            address: iface.address,
            netmask: iface.netmask,
            mac: iface.mac
          });
        }
      }
    }
    
    return {
      interfaces: activeInterfaces,
      hostname: os.hostname()
    };
  }

  async performDeviceDiscovery() {
    try {
      console.log('[Agent] Performing network device discovery...');
      
      const devices = await Promise.all([
        this.arpScan(),
        this.mdnsScan(),
        this.pingSubnet()
      ]);
      
      const allDevices = devices.flat().filter(Boolean);
      const uniqueDevices = this.deduplicateDevices(allDevices);
      
      if (uniqueDevices.length > 0) {
        const discovery = {
          type: 'device_discovery',
          agentId: this.config.agentId,
          devices: uniqueDevices,
          scanType: 'comprehensive',
          timestamp: new Date().toISOString()
        };
        
        this.sendMessage(discovery);
        console.log(`[Agent] Discovered ${uniqueDevices.length} network devices`);
        
        // Update device cache
        uniqueDevices.forEach(device => {
          this.deviceCache.set(device.mac || device.ip, device);
        });
      }
      
    } catch (error) {
      console.error('[Agent] Device discovery failed:', error.message);
    }
  }

  async arpScan() {
    return new Promise((resolve) => {
      const command = os.platform() === 'win32' ? 'arp -a' : 'arp -a';
      exec(command, (error, stdout) => {
        if (error) {
          resolve([]);
          return;
        }
        
        const devices = [];
        const lines = stdout.split('\n');
        
        for (const line of lines) {
          let match;
          if (os.platform() === 'win32') {
            match = line.match(/^\s*([\d.]+)\s+([0-9a-f-]{17})\s+/i);
          } else {
            match = line.match(/^\S+\s+\(([\d.]+)\)\s+at\s+([0-9a-f:]{17})/i);
          }
          
          if (match) {
            devices.push({
              ip: match[1],
              mac: match[2].toLowerCase().replace(/[:-]/g, ':'),
              type: 'arp_discovered',
              protocol: 'ARP',
              timestamp: Date.now()
            });
          }
        }
        
        resolve(devices);
      });
    });
  }

  async mdnsScan() {
    // Simplified mDNS discovery - in production would use zeroconf library
    return new Promise((resolve) => {
      const devices = [];
      
      // Check for common mDNS devices
      const commonServices = [
        '_http._tcp.local',
        '_ipp._tcp.local',
        '_airplay._tcp.local',
        '_googlecast._tcp.local'
      ];
      
      // This is a simplified implementation
      // In a full implementation, we'd use actual mDNS discovery
      resolve(devices);
    });
  }

  async pingSubnet() {
    return new Promise((resolve) => {
      const devices = [];
      const networkInterfaces = os.networkInterfaces();
      
      // Get local subnet
      let subnet = '192.168.1'; // Default fallback
      for (const interfaces of Object.values(networkInterfaces)) {
        for (const iface of interfaces) {
          if (!iface.internal && iface.family === 'IPv4') {
            const parts = iface.address.split('.');
            subnet = `${parts[0]}.${parts[1]}.${parts[2]}`;
            break;
          }
        }
      }
      
      // Ping common gateway IPs
      const targets = [`${subnet}.1`, `${subnet}.254`];
      let completed = 0;
      
      targets.forEach(target => {
        this.pingTarget(target).then(result => {
          if (result.success) {
            devices.push({
              ip: target,
              type: 'gateway',
              protocol: 'ICMP',
              rtt: result.rtt,
              timestamp: Date.now()
            });
          }
        }).finally(() => {
          completed++;
          if (completed === targets.length) {
            resolve(devices);
          }
        });
      });
      
      // Timeout after 5 seconds
      setTimeout(() => resolve(devices), 5000);
    });
  }

  async performPingMeasurements() {
    const targets = ['8.8.8.8', '1.1.1.1', '192.168.1.1'];
    
    for (const target of targets) {
      try {
        const result = await this.pingTarget(target);
        
        const pingData = {
          type: 'ping_result',
          agentId: this.config.agentId,
          target,
          result,
          timestamp: new Date().toISOString()
        };
        
        this.sendMessage(pingData);
        
      } catch (error) {
        console.log(`[Agent] Ping failed for ${target}: ${error.message}`);
      }
    }
  }

  async pingTarget(target) {
    return new Promise((resolve, reject) => {
      const isWindows = os.platform() === 'win32';
      const pingCommand = isWindows ? 'ping' : 'ping';
      const pingArgs = isWindows ? ['-n', '1', target] : ['-c', '1', target];
      
      const ping = spawn(pingCommand, pingArgs);
      let output = '';
      
      ping.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      ping.on('close', (code) => {
        if (code === 0) {
          const rttMatch = output.match(/time[<=](\d+)ms/i) || output.match(/time=(\d+\.?\d*)ms/i);
          const rtt = rttMatch ? parseFloat(rttMatch[1]) : null;
          
          resolve({
            success: true,
            rtt,
            timestamp: Date.now()
          });
        } else {
          reject(new Error('Ping failed'));
        }
      });
      
      ping.on('error', reject);
    });
  }

  async performHealthCheck() {
    const health = {
      type: 'health_check',
      agentId: this.config.agentId,
      status: {
        connected: this.ws && this.ws.readyState === WebSocket.OPEN,
        monitoring: this.monitoring,
        deviceCount: this.deviceCache.size,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        performanceScore: this.calculatePerformanceScore()
      },
      timestamp: new Date().toISOString()
    };
    
    this.sendMessage(health);
  }

  calculatePerformanceScore() {
    if (this.performanceHistory.length === 0) return 100;
    
    const recent = this.performanceHistory.slice(-5);
    const avgCpu = recent.reduce((sum, m) => sum + m.cpu.usage, 0) / recent.length;
    const avgMemory = recent.reduce((sum, m) => sum + (m.memory.used / m.memory.total * 100), 0) / recent.length;
    
    // Simple scoring algorithm
    const cpuScore = Math.max(0, 100 - avgCpu);
    const memoryScore = Math.max(0, 100 - avgMemory);
    
    return Math.round((cpuScore + memoryScore) / 2);
  }

  deduplicateDevices(devices) {
    const seen = new Set();
    return devices.filter(device => {
      const key = device.mac || device.ip;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  updatePerformanceHistory(metrics) {
    this.performanceHistory.push(metrics);
    if (this.performanceHistory.length > 100) {
      this.performanceHistory.shift();
    }
  }

  setupStdinHandler() {
    // Handle commands from main Electron process
    process.stdin.on('data', (data) => {
      const command = data.toString().trim();
      
      switch (command) {
        case 'SCAN_NOW':
          console.log('[Agent] Manual scan triggered');
          this.performDeviceDiscovery();
          break;
        case 'PING_NOW':
          this.performPingMeasurements();
          break;
        case 'STATUS':
          console.log(`[Agent] Status: Connected=${this.ws && this.ws.readyState === WebSocket.OPEN}, Monitoring=${this.monitoring}`);
          break;
      }
    });
  }

  handleServerMessage(message) {
    switch (message.type) {
      case 'agent_config_update':
        this.updateConfiguration(message.config);
        break;
      case 'scan_request':
        this.performDeviceDiscovery();
        break;
      case 'ping_request':
        if (message.target) {
          this.pingTarget(message.target).then(result => {
            this.sendMessage({
              type: 'ping_response',
              agentId: this.config.agentId,
              target: message.target,
              result,
              requestId: message.requestId
            });
          });
        }
        break;
    }
  }

  updateConfiguration(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('[Agent] Configuration updated');
  }

  sendMessage(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[Agent] Max reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`[Agent] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.connect(), delay);
  }
}

// Start the embedded agent
const agent = new EmbeddedDesktopAgent();
agent.start().catch(console.error);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[Agent] Shutting down embedded agent...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[Agent] Terminating embedded agent...');
  process.exit(0);
});