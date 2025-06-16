#!/usr/bin/env node

/**
 * SmartBlueprint Pro - Hardened Ping Agent
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
      process.exit(1);
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

  /**
   * Measure ping RTT to all configured targets
   */
  async measurePing() {
    const results = {};
    const promises = [];

    for (const host of PING_TARGETS) {
      promises.push(
        ping.promise.probe(host, { 
          timeout: TIMEOUT_MS / 1000, // ping library expects seconds
          min_reply: 1,
          extra: ['-c', '1'] // Send only 1 packet
        }).then(res => ({
          host,
          alive: res.alive,
          time: res.alive ? res.time : null,
          packetLoss: res.alive ? 0 : 100
        })).catch(error => ({
          host,
          alive: false,
          time: null,
          packetLoss: 100,
          error: error.message
        }))
      );
    }

    try {
      const responses = await Promise.all(promises);
      
      for (const response of responses) {
        results[response.host] = {
          rtt: response.time, // RTT in milliseconds
          alive: response.alive,
          packetLoss: response.packetLoss
        };
        
        if (response.error) {
          console.warn(`[Ping Agent] ${response.host}: ${response.error}`);
        }
      }

      // Log successful measurements
      const successfulPings = Object.entries(results)
        .filter(([_, data]) => data.alive)
        .map(([host, data]) => `${host}: ${data.rtt}ms`)
        .join(', ');
      
      if (successfulPings) {
        console.log(`[Ping Agent] Measurements: ${successfulPings}`);
      }

      return results;
    } catch (error) {
      console.error('[Ping Agent] Measurement error:', error);
      return {};
    }
  }

  /**
   * Convert RTT to estimated distance in meters
   * Formula: d ≈ ((RTT - t_proc) / 2) * c
   */
  convertRTTToDistance(rttMs, processingOffsetMs = 5) {
    if (!rttMs || rttMs <= 0) return null;
    
    const speedOfLight = 3e8; // m/s
    const oneWayTimeMs = (rttMs - processingOffsetMs) / 2;
    const oneWayTimeS = oneWayTimeMs / 1000;
    const distanceM = Math.max(oneWayTimeS * speedOfLight, 0);
    
    return Math.round(distanceM * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Send ping data to the server via WebSocket
   */
  sendPingData(pingResults) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[Ping Agent] WebSocket not connected, skipping send');
      return;
    }

    // Convert RTT to distances for additional context
    const pingWithDistances = {};
    for (const [host, data] of Object.entries(pingResults)) {
      pingWithDistances[host] = {
        ...data,
        distance: this.convertRTTToDistance(data.rtt)
      };
    }

    const message = {
      type: 'ping',
      timestamp: Date.now(),
      ping: pingResults,
      pingWithDistances: pingWithDistances,
      source: 'desktop-agent',
      version: '1.0.0'
    };

    try {
      this.ws.send(JSON.stringify(message));
      console.log(`[Ping Agent] Sent ping data for ${Object.keys(pingResults).length} targets`);
    } catch (error) {
      console.error('[Ping Agent] Failed to send ping data:', error);
    }
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    console.log(`[Ping Agent] Connecting to ${WS_URL}...`);
    
    this.ws = new WebSocket(WS_URL);

    this.ws.on('open', () => {
      console.log('[Ping Agent] WebSocket connected successfully');
      this.reconnectAttempts = 0;
      this.startPingLoop();
    });

    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleServerMessage(message);
      } catch (error) {
        console.error('[Ping Agent] Failed to parse server message:', error);
      }
    });

    this.ws.on('close', (code, reason) => {
      console.log(`[Ping Agent] WebSocket closed (${code}): ${reason}`);
      this.stopPingLoop();
      this.scheduleReconnect();
    });

    this.ws.on('error', (error) => {
      console.error('[Ping Agent] WebSocket error:', error);
    });
  }

  /**
   * Handle messages from the server
   */
  handleServerMessage(message) {
    switch (message.type) {
      case 'ping_config':
        if (message.targets) {
          PING_TARGETS.length = 0;
          PING_TARGETS.push(...message.targets);
          console.log(`[Ping Agent] Updated targets: ${PING_TARGETS.join(', ')}`);
        }
        break;
        
      case 'ping_start':
        if (!this.isRunning) {
          this.startPingLoop();
        }
        break;
        
      case 'ping_stop':
        this.stopPingLoop();
        break;
        
      default:
        console.log(`[Ping Agent] Received message: ${message.type}`);
    }
  }

  /**
   * Start the periodic ping measurement loop
   */
  startPingLoop() {
    if (this.isRunning) {
      console.log('[Ping Agent] Ping loop already running');
      return;
    }

    this.isRunning = true;
    console.log('[Ping Agent] Starting ping measurement loop...');

    // Immediate first measurement
    this.performPingCycle();

    // Set up interval for subsequent measurements
    this.pingInterval = setInterval(() => {
      this.performPingCycle();
    }, INTERVAL_MS);
  }

  /**
   * Stop the ping measurement loop
   */
  stopPingLoop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    console.log('[Ping Agent] Stopped ping measurement loop');
  }

  /**
   * Perform a single ping measurement cycle
   */
  async performPingCycle() {
    try {
      const pingResults = await this.measurePing();
      this.sendPingData(pingResults);
    } catch (error) {
      console.error('[Ping Agent] Ping cycle error:', error);
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Ping Agent] Max reconnection attempts reached, giving up');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Max 30 seconds
    this.reconnectAttempts++;
    
    console.log(`[Ping Agent] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Start the ping agent
   */
  start() {
    console.log('[Ping Agent] Starting desktop agent ping system...');
    this.connect();
  }

  /**
   * Stop the ping agent
   */
  stop() {
    console.log('[Ping Agent] Stopping desktop agent ping system...');
    this.stopPingLoop();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Ping Agent] Received SIGINT, shutting down gracefully...');
  if (global.pingAgent) {
    global.pingAgent.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Ping Agent] Received SIGTERM, shutting down gracefully...');
  if (global.pingAgent) {
    global.pingAgent.stop();
  }
  process.exit(0);
});

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