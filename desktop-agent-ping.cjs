#!/usr/bin/env node

/**
 * SmartBlueprint Pro - Hardened Ping Agent (CommonJS)
 * Active ping/latency probing with comprehensive error handling
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// System validation
function validateEnvironment() {
  console.log('[Ping Agent] Validating environment...');
  
  if (typeof process === 'undefined' || !process.versions?.node) {
    console.error('[Ping Agent] FATAL: Node.js runtime required');
    process.exit(1);
  }

  const platform = os.platform();
  if (!['win32', 'darwin', 'linux'].includes(platform)) {
    console.error(`[Ping Agent] FATAL: Unsupported platform: ${platform}`);
    process.exit(1);
  }

  // Check required modules
  const required = ['ping', 'ws'];
  const missing = [];
  
  for (const module of required) {
    try {
      require(module);
    } catch (error) {
      missing.push(module);
    }
  }

  if (missing.length > 0) {
    console.error(`[Ping Agent] FATAL: Missing dependencies: ${missing.join(', ')}`);
    console.error('[Ping Agent] Install with: npm install ws ping');
    process.exit(1);
  }

  console.log(`[Ping Agent] Environment validated: Node.js ${process.versions.node} on ${platform}`);
}

// Configuration loader
function loadConfiguration() {
  const configFile = path.join(process.cwd(), 'config.json');
  let config = {
    serverUrl: 'ws://localhost:5000/ws',
    agentId: 'ping-agent-' + Math.random().toString(36).substring(7),
    pingTargets: ['192.168.1.1', '192.168.1.254', '192.168.0.1', '10.0.0.1'],
    pingInterval: 5000,
    pingTimeout: 2000,
    maxReconnectAttempts: 10,
    reconnectDelay: 5000
  };

  try {
    if (fs.existsSync(configFile)) {
      const fileConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      config = { ...config, ...fileConfig };
      console.log('[Ping Agent] Configuration loaded from file');
    }
  } catch (error) {
    console.log(`[Ping Agent] Using default configuration: ${error.message}`);
  }

  // Environment overrides
  if (process.env.WS_URL) config.serverUrl = process.env.WS_URL;
  if (process.env.SMARTBLUEPRINT_HOST) {
    const protocol = process.env.SMARTBLUEPRINT_HOST.includes('https') ? 'wss' : 'ws';
    config.serverUrl = `${protocol}://${process.env.SMARTBLUEPRINT_HOST.replace(/^https?:\/\//, '')}/ws`;
  }
  if (process.env.REPLIT_DOMAINS) {
    const replitDomain = process.env.REPLIT_DOMAINS.split(',')[0];
    config.serverUrl = `wss://${replitDomain}/ws`;
  }

  // Command line overrides
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--server' && args[i + 1]) {
      config.serverUrl = args[i + 1];
      i++;
    }
  }

  return config;
}

class HardenedPingAgent {
  constructor() {
    validateEnvironment();
    
    this.config = loadConfiguration();
    this.ws = null;
    this.isRunning = false;
    this.pingInterval = null;
    this.reconnectAttempts = 0;
    this.connectionDrops = 0;
    this.startTime = Date.now();
    this.performanceHistory = [];
    this.errorCounts = new Map();
    this.lastPingResults = new Map();
    
    console.log('[Ping Agent] Initialized with comprehensive monitoring');
    console.log(`[Ping Agent] Agent ID: ${this.config.agentId}`);
    console.log(`[Ping Agent] Server: ${this.config.serverUrl}`);
    console.log(`[Ping Agent] Targets: ${this.config.pingTargets.join(', ')}`);
  }

  async start() {
    try {
      console.log('[Ping Agent] Starting ping monitoring system...');
      await this.connect();
      this.registerAgent();
      this.startPingLoop();
      this.isRunning = true;
      console.log('[Ping Agent] All systems operational');
    } catch (error) {
      console.error(`[Ping Agent] Startup failed: ${error.message}`);
      console.error('[Ping Agent] Retrying in 10 seconds...');
      setTimeout(() => this.start(), 10000);
    }
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        console.log(`[Ping Agent] Connecting to: ${this.config.serverUrl}`);
        
        const WebSocket = require('ws');
        this.ws = new WebSocket(this.config.serverUrl, {
          handshakeTimeout: 10000
        });

        this.ws.on('open', () => {
          console.log('[Ping Agent] Connected successfully');
          this.reconnectAttempts = 0;
          resolve();
        });

        this.ws.on('message', (data) => {
          try {
            const message = JSON.parse(data);
            this.handleServerMessage(message);
          } catch (error) {
            console.error('[Ping Agent] Invalid message:', error.message);
          }
        });

        this.ws.on('close', () => {
          console.log('[Ping Agent] Connection closed');
          this.connectionDrops++;
          this.scheduleReconnect();
        });

        this.ws.on('error', (error) => {
          console.error(`[Ping Agent] Connection error: ${error.message}`);
          if (this.reconnectAttempts === 0) {
            reject(error);
          }
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  registerAgent() {
    const registration = {
      type: 'agent_register',
      timestamp: new Date().toISOString(),
      agentId: this.config.agentId,
      capabilities: ['ping_measurement', 'rtt_analysis', 'distance_calculation'],
      systemInfo: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        nodeVersion: process.version
      },
      version: '2.0.0-hardened'
    };

    this.sendMessage(registration);
    console.log('[Ping Agent] Registration sent');
  }

  startPingLoop() {
    this.pingInterval = setInterval(() => {
      this.measurePing();
    }, this.config.pingInterval);
    
    // Initial measurement
    setTimeout(() => this.measurePing(), 1000);
    console.log(`[Ping Agent] Ping monitoring started (${this.config.pingInterval}ms intervals)`);
  }

  async measurePing() {
    if (!this.isRunning) return;

    try {
      const ping = require('ping');
      const results = {};
      
      for (const host of this.config.pingTargets) {
        try {
          const result = await ping.promise.probe(host, {
            timeout: this.config.pingTimeout / 1000,
            min_reply: 1,
            extra: ['-c', '1']
          });

          const rtt = result.alive ? result.time : null;
          const distance = rtt ? this.convertRTTToDistance(rtt) : null;

          results[host] = {
            alive: result.alive,
            rtt: rtt,
            distance: distance,
            packetLoss: result.alive ? 0 : 100,
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          results[host] = {
            alive: false,
            rtt: null,
            distance: null,
            packetLoss: 100,
            error: error.message,
            timestamp: new Date().toISOString()
          };
        }
      }

      this.sendPingData(results);
      this.lastPingResults = new Map(Object.entries(results));

      // Log successful measurements
      const successfulPings = Object.entries(results)
        .filter(([_, data]) => data.alive)
        .map(([host, data]) => `${host}: ${data.rtt}ms (${data.distance}m)`)
        .join(', ');
      
      if (successfulPings) {
        console.log(`[Ping Agent] Measurements: ${successfulPings}`);
      }

    } catch (error) {
      console.error('[Ping Agent] Measurement error:', error);
      this.incrementErrorCount('ping_measurement');
    }
  }

  convertRTTToDistance(rttMs, processingOffsetMs = 5) {
    const speedOfLight = 3e8; // meters per second
    const adjustedRTT = Math.max(0, rttMs - processingOffsetMs);
    const distanceMeters = (adjustedRTT / 1000 / 2) * speedOfLight;
    return Math.round(distanceMeters * 100) / 100; // Round to 2 decimal places
  }

  sendPingData(pingResults) {
    const message = {
      type: 'ping_measurement',
      timestamp: new Date().toISOString(),
      agentId: this.config.agentId,
      measurements: pingResults,
      metadata: {
        targets: this.config.pingTargets.length,
        interval: this.config.pingInterval,
        timeout: this.config.pingTimeout,
        agentUptime: Date.now() - this.startTime
      }
    };

    this.sendMessage(message);
  }

  sendMessage(message) {
    if (this.ws && this.ws.readyState === require('ws').OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('[Ping Agent] Send failed:', error.message);
        return false;
      }
    }
    return false;
  }

  handleServerMessage(message) {
    switch (message.type) {
      case 'ping_command':
        this.measurePing();
        break;
      case 'config_update':
        console.log('[Ping Agent] Configuration updated');
        break;
      default:
        console.log(`[Ping Agent] Unknown message: ${message.type}`);
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('[Ping Agent] Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(30000, this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts));
    this.reconnectAttempts++;

    console.log(`[Ping Agent] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch(error => {
        console.error(`[Ping Agent] Reconnection failed: ${error.message}`);
      });
    }, delay);
  }

  incrementErrorCount(errorType) {
    const current = this.errorCounts.get(errorType) || 0;
    this.errorCounts.set(errorType, current + 1);
  }

  stop() {
    console.log('[Ping Agent] Shutting down...');
    this.isRunning = false;
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('\n[Ping Agent] Received shutdown signal...');
  if (global.pingAgent) {
    global.pingAgent.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Ping Agent] Received termination signal...');
  if (global.pingAgent) {
    global.pingAgent.stop();
  }
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('[Ping Agent] Uncaught exception:', error.message);
  if (global.pingAgent) {
    global.pingAgent.stop();
  }
  process.exit(1);
});

// Bootstrap and start the agent
async function main() {
  try {
    console.log('🏠 SmartBlueprint Pro - Hardened Ping Agent v2.0.0');
    console.log('===================================================');
    
    global.pingAgent = new HardenedPingAgent();
    await global.pingAgent.start();
    
    console.log('[Ping Agent] System ready - monitoring network latency');
  } catch (error) {
    console.error(`[Ping Agent] Fatal error: ${error.message}`);
    process.exit(1);
  }
}

// Start the agent if run directly
if (require.main === module) {
  main();
}

module.exports = HardenedPingAgent;