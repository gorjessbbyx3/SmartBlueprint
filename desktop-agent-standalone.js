#!/usr/bin/env node

/**
 * SmartBlueprint Pro - Standalone Desktop Agent
 * Self-contained agent with built-in WebSocket client
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { EventEmitter } = require('events');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const url = require('url');

// Built-in WebSocket client implementation
class SimpleWebSocket extends EventEmitter {
  constructor(wsUrl, options = {}) {
    super();
    this.url = wsUrl;
    this.options = options;
    this.socket = null;
    this.state = 'CLOSED';
    this.pingInterval = null;
    this.reconnectDelay = 5000;
    this.maxReconnectAttempts = 10;
    this.reconnectAttempts = 0;
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        const parsedUrl = new URL(this.url);
        const isSecure = parsedUrl.protocol === 'wss:';
        const port = parsedUrl.port || (isSecure ? 443 : 80);
        
        const key = crypto.randomBytes(16).toString('base64');
        const acceptKey = crypto
          .createHash('sha1')
          .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
          .digest('base64');

        const headers = {
          'Connection': 'Upgrade',
          'Upgrade': 'websocket',
          'Sec-WebSocket-Version': '13',
          'Sec-WebSocket-Key': key,
          'Host': parsedUrl.host
        };

        const httpModule = isSecure ? https : http;
        const req = httpModule.request({
          hostname: parsedUrl.hostname,
          port: port,
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'GET',
          headers: headers
        });

        req.on('upgrade', (res, socket, head) => {
          if (res.headers['sec-websocket-accept'] === acceptKey) {
            this.socket = socket;
            this.state = 'OPEN';
            this.reconnectAttempts = 0;
            this.setupSocket();
            this.emit('open');
            resolve();
          } else {
            reject(new Error('WebSocket handshake failed'));
          }
        });

        req.on('error', (error) => {
          console.error('[WebSocket] Connection error:', error.message);
          this.scheduleReconnect();
          reject(error);
        });

        req.end();
        
      } catch (error) {
        console.error('[WebSocket] Setup error:', error.message);
        reject(error);
      }
    });
  }

  setupSocket() {
    this.socket.on('data', (buffer) => {
      try {
        const frame = this.parseFrame(buffer);
        if (frame) {
          if (frame.opcode === 0x1) { // Text frame
            this.emit('message', frame.payload.toString());
          } else if (frame.opcode === 0x8) { // Close frame
            this.close();
          } else if (frame.opcode === 0x9) { // Ping frame
            this.pong(frame.payload);
          }
        }
      } catch (error) {
        console.error('[WebSocket] Frame parsing error:', error.message);
      }
    });

    this.socket.on('close', () => {
      this.state = 'CLOSED';
      this.emit('close');
      this.scheduleReconnect();
    });

    this.socket.on('error', (error) => {
      console.error('[WebSocket] Socket error:', error.message);
      this.emit('error', error);
    });

    // Start ping interval
    this.pingInterval = setInterval(() => {
      this.ping();
    }, 30000);
  }

  parseFrame(buffer) {
    if (buffer.length < 2) return null;
    
    const firstByte = buffer[0];
    const secondByte = buffer[1];
    
    const fin = (firstByte & 0x80) === 0x80;
    const opcode = firstByte & 0x0f;
    const masked = (secondByte & 0x80) === 0x80;
    let payloadLength = secondByte & 0x7f;
    
    let offset = 2;
    
    if (payloadLength === 126) {
      payloadLength = buffer.readUInt16BE(offset);
      offset += 2;
    } else if (payloadLength === 127) {
      payloadLength = buffer.readBigUInt64BE(offset);
      offset += 8;
    }
    
    let maskKey = null;
    if (masked) {
      maskKey = buffer.slice(offset, offset + 4);
      offset += 4;
    }
    
    if (buffer.length < offset + payloadLength) return null;
    
    let payload = buffer.slice(offset, offset + Number(payloadLength));
    
    if (masked && maskKey) {
      for (let i = 0; i < payload.length; i++) {
        payload[i] ^= maskKey[i % 4];
      }
    }
    
    return { opcode, payload, fin };
  }

  createFrame(opcode, payload) {
    const payloadLength = Buffer.byteLength(payload);
    let frame;
    
    if (payloadLength < 126) {
      frame = Buffer.allocUnsafe(2 + 4 + payloadLength);
      frame[0] = 0x80 | opcode;
      frame[1] = 0x80 | payloadLength;
      frame.writeUInt32BE(0x12345678, 2); // Mask key
      frame.write(payload, 6);
    } else if (payloadLength < 65536) {
      frame = Buffer.allocUnsafe(4 + 4 + payloadLength);
      frame[0] = 0x80 | opcode;
      frame[1] = 0x80 | 126;
      frame.writeUInt16BE(payloadLength, 2);
      frame.writeUInt32BE(0x12345678, 4); // Mask key
      frame.write(payload, 8);
    }
    
    // Apply mask
    const maskKey = frame.slice(-payloadLength - 4, -payloadLength);
    const payloadData = frame.slice(-payloadLength);
    for (let i = 0; i < payloadData.length; i++) {
      payloadData[i] ^= maskKey[i % 4];
    }
    
    return frame;
  }

  send(data) {
    if (this.state !== 'OPEN') {
      console.warn('[WebSocket] Cannot send - not connected');
      return;
    }
    
    try {
      const frame = this.createFrame(0x1, data);
      this.socket.write(frame);
    } catch (error) {
      console.error('[WebSocket] Send error:', error.message);
    }
  }

  ping() {
    if (this.state === 'OPEN') {
      const frame = this.createFrame(0x9, '');
      this.socket.write(frame);
    }
  }

  pong(payload) {
    if (this.state === 'OPEN') {
      const frame = this.createFrame(0xa, payload);
      this.socket.write(frame);
    }
  }

  close() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.socket) {
      this.socket.end();
    }
    
    this.state = 'CLOSED';
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`[WebSocket] Reconnecting in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('[WebSocket] Reconnection failed:', error.message);
      });
    }, this.reconnectDelay);
  }
}

// Main Desktop Agent class
class StandaloneDesktopAgent {
  constructor() {
    this.agentId = 'agent-' + Math.random().toString(36).substring(7);
    this.serverUrl = this.detectServerUrl();
    this.ws = null;
    this.healthInterval = null;
    this.discoveryInterval = null;
    this.errorCounts = {};
    
    console.log(`[Agent] Initializing Standalone Desktop Agent`);
    console.log(`[Agent] Agent ID: ${this.agentId}`);
    console.log(`[Agent] Server URL: ${this.serverUrl}`);
  }

  detectServerUrl() {
    // Check environment variables
    if (process.env.WS_URL) {
      return process.env.WS_URL;
    }
    
    if (process.env.SMARTBLUEPRINT_HOST) {
      const host = process.env.SMARTBLUEPRINT_HOST;
      const protocol = host.includes('localhost') ? 'ws:' : 'wss:';
      return `${protocol}//${host}/ws`;
    }
    
    // Default to localhost for development
    return 'ws://localhost:5000/ws';
  }

  async start() {
    try {
      console.log('[Agent] Starting standalone desktop agent...');
      
      // Connect to WebSocket server
      await this.connect();
      
      // Register agent
      this.registerAgent();
      
      // Start monitoring services
      this.startMonitoringServices();
      
      console.log('[Agent] Desktop agent started successfully');
      
    } catch (error) {
      console.error('[Agent] Startup error:', error.message);
      this.incrementErrorCount('startup');
      process.exit(1);
    }
  }

  async connect() {
    return new Promise((resolve, reject) => {
      try {
        console.log(`[Agent] Connecting to: ${this.serverUrl}`);
        
        this.ws = new SimpleWebSocket(this.serverUrl);
        
        this.ws.on('open', () => {
          console.log('[Agent] Connected to server');
          resolve();
        });
        
        this.ws.on('message', (data) => {
          try {
            const message = JSON.parse(data);
            this.handleServerMessage(message);
          } catch (error) {
            console.error('[Agent] Message parsing error:', error.message);
          }
        });
        
        this.ws.on('close', () => {
          console.log('[Agent] Disconnected from server');
        });
        
        this.ws.on('error', (error) => {
          console.error('[Agent] WebSocket error:', error.message);
          this.incrementErrorCount('websocket');
          reject(error);
        });
        
        this.ws.connect().catch(reject);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  registerAgent() {
    const registration = {
      type: 'agent_register',
      agentId: this.agentId,
      platform: os.platform(),
      hostname: os.hostname(),
      version: '1.0.0',
      capabilities: ['device_discovery', 'ping_monitoring', 'health_analysis'],
      timestamp: new Date().toISOString()
    };
    
    this.sendMessage(registration);
    console.log('[Agent] Agent registration sent');
  }

  startMonitoringServices() {
    // Health monitoring every 30 seconds
    this.healthInterval = setInterval(() => {
      this.performHealthAnalysis();
    }, 30000);
    
    // Device discovery every 5 minutes
    this.discoveryInterval = setInterval(() => {
      this.performDeviceDiscovery();
    }, 300000);
    
    // Initial scans
    setTimeout(() => this.performHealthAnalysis(), 5000);
    setTimeout(() => this.performDeviceDiscovery(), 10000);
    
    console.log('[Agent] Monitoring services started');
  }

  async performHealthAnalysis() {
    try {
      const systemMetrics = await this.collectSystemMetrics();
      
      const healthData = {
        type: 'health_report',
        agentId: this.agentId,
        timestamp: new Date().toISOString(),
        systemMetrics,
        errorCounts: this.errorCounts,
        status: 'healthy'
      };
      
      this.sendMessage(healthData);
      
    } catch (error) {
      console.error('[Agent] Health analysis error:', error.message);
      this.incrementErrorCount('health_analysis');
    }
  }

  async collectSystemMetrics() {
    const cpuUsage = await this.getCPUUsage();
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    return {
      cpu: {
        usage: cpuUsage,
        loadAverage: os.loadavg()
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        process: memoryUsage
      },
      uptime: uptime,
      platform: os.platform(),
      arch: os.arch()
    };
  }

  async getCPUUsage() {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const total = endUsage.user + endUsage.system;
        const usage = total / 1000000; // Convert to seconds
        resolve(Math.min(100, usage * 10)); // Rough percentage
      }, 100);
    });
  }

  async performDeviceDiscovery() {
    try {
      console.log('[Agent] Starting device discovery...');
      
      const devices = [];
      
      // Network ping sweep for active devices
      const networkBase = '192.168.1'; // Common network
      const pingPromises = [];
      
      for (let i = 1; i <= 254; i++) {
        const ip = `${networkBase}.${i}`;
        pingPromises.push(this.pingDevice(ip));
      }
      
      const results = await Promise.allSettled(pingPromises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.reachable) {
          const ip = `${networkBase}.${index + 1}`;
          devices.push({
            ip: ip,
            macAddress: 'unknown',
            hostname: result.value.hostname || 'Unknown Device',
            deviceType: 'unknown',
            vendor: 'Unknown',
            rssi: result.value.latency ? -30 - (result.value.latency * 2) : -60,
            isOnline: true,
            lastSeen: new Date().toISOString()
          });
        }
      });
      
      if (devices.length > 0) {
        const discoveryData = {
          type: 'device_discovery',
          agentId: this.agentId,
          timestamp: new Date().toISOString(),
          devices: devices,
          scanType: 'ping_sweep'
        };
        
        this.sendMessage(discoveryData);
        console.log(`[Agent] Discovered ${devices.length} devices`);
      }
      
    } catch (error) {
      console.error('[Agent] Device discovery error:', error.message);
      this.incrementErrorCount('device_discovery');
    }
  }

  async pingDevice(ip) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const pingCmd = os.platform() === 'win32' 
        ? `ping -n 1 -w 1000 ${ip}`
        : `ping -c 1 -W 1 ${ip}`;
      
      exec(pingCmd, (error, stdout, stderr) => {
        const latency = Date.now() - startTime;
        
        if (error) {
          resolve({ reachable: false, latency: null });
        } else {
          // Try to extract hostname
          let hostname = 'Unknown Device';
          if (stdout.includes('Reply from') || stdout.includes('64 bytes from')) {
            hostname = `Device-${ip.split('.').pop()}`;
          }
          
          resolve({ 
            reachable: true, 
            latency: latency,
            hostname: hostname
          });
        }
      });
    });
  }

  handleServerMessage(message) {
    console.log('[Agent] Received message:', message.type);
    
    switch (message.type) {
      case 'ping':
        this.sendMessage({ type: 'pong', agentId: this.agentId });
        break;
      case 'config_update':
        console.log('[Agent] Configuration update received');
        break;
      case 'discover_devices':
        this.performDeviceDiscovery();
        break;
      default:
        console.log('[Agent] Unknown message type:', message.type);
    }
  }

  sendMessage(message) {
    if (this.ws && this.ws.state === 'OPEN') {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[Agent] Cannot send message - not connected');
    }
  }

  incrementErrorCount(errorType) {
    this.errorCounts[errorType] = (this.errorCounts[errorType] || 0) + 1;
  }

  stop() {
    console.log('[Agent] Stopping desktop agent...');
    
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
    }
    
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
    }
    
    if (this.ws) {
      this.ws.close();
    }
    
    console.log('[Agent] Desktop agent stopped');
  }
}

// Main execution
async function main() {
  console.log('SmartBlueprint Pro - Standalone Desktop Agent v1.0.0');
  console.log('Copyright (c) 2025 SmartBlueprint Pro. All rights reserved.');
  console.log('');
  
  // Check command line arguments
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Usage: node desktop-agent-standalone.js [options]

Options:
  -h, --help              Show this help message
  
Environment Variables:
  WS_URL                  WebSocket server URL
  SMARTBLUEPRINT_HOST     Server hostname

Examples:
  node desktop-agent-standalone.js
  WS_URL=ws://192.168.1.100:5000/ws node desktop-agent-standalone.js
`);
    process.exit(0);
  }

  // Create and start agent
  const agent = new StandaloneDesktopAgent();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n[Agent] Received SIGINT, shutting down gracefully...');
    agent.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n[Agent] Received SIGTERM, shutting down gracefully...');
    agent.stop();
    process.exit(0);
  });
  
  try {
    await agent.start();
  } catch (error) {
    console.error('[Agent] Failed to start:', error.message);
    process.exit(1);
  }
}

// Start the agent
if (require.main === module) {
  main().catch((error) => {
    console.error('[Agent] Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = StandaloneDesktopAgent;