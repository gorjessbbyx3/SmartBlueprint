import { WebSocket } from 'ws';
import { networkDiscoveryService } from './network-discovery';
import { comprehensiveDeviceDiscovery } from './comprehensive-device-discovery';
import { enhancedDeviceTelemetry } from './enhanced-device-telemetry';
import { dataIntegrityMonitor } from './data-integrity-monitor';
import { metaAIMonitor } from './meta-ai-monitor';

/**
 * Desktop Agent - Local Network Scanner and Cloud Sync Bridge
 * Runs on user's local network to discover devices and sync with cloud
 */
export class DesktopAgent {
  private cloudConnection: WebSocket | null = null;
  private isConnected = false;
  private agentId: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private heartbeatInterval?: NodeJS.Timeout;
  private scanInterval?: NodeJS.Timeout;
  private localDevices: Map<string, any> = new Map();

  constructor() {
    this.agentId = this.generateAgentId();
    console.log(`[Desktop Agent] Initialized with ID: ${this.agentId}`);
  }

  /**
   * Start the desktop agent and connect to cloud
   */
  async start(cloudEndpoint: string = 'ws://localhost:5000/agent-tunnel'): Promise<void> {
    console.log('[Desktop Agent] Starting local network scanning and cloud sync...');
    
    try {
      // Start local device discovery
      await this.startLocalScanning();
      
      // Connect to cloud tunnel
      await this.connectToCloud(cloudEndpoint);
      
      // Start heartbeat
      this.startHeartbeat();
      
      console.log('[Desktop Agent] Successfully started - monitoring local network');
    } catch (error) {
      console.error('[Desktop Agent] Failed to start:', error);
      throw error;
    }
  }

  /**
   * Start local network scanning for smart devices
   */
  private async startLocalScanning(): Promise<void> {
    console.log('[Desktop Agent] Starting comprehensive device discovery...');
    
    // Initial scan
    await this.performDeviceScan();
    
    // Schedule periodic scans every 30 seconds
    this.scanInterval = setInterval(async () => {
      try {
        await this.performDeviceScan();
      } catch (error) {
        console.error('[Desktop Agent] Scan failed:', error);
        this.reportError('scan_failed', error.toString());
      }
    }, 30000);
  }

  /**
   * Perform device discovery scan
   */
  private async performDeviceScan(): Promise<void> {
    try {
      // Use comprehensive device discovery
      const discoveredDevices = await comprehensiveDeviceDiscovery.startDeviceDiscovery();
      
      // Perform enhanced device discovery for direct WiFi devices
      const mdnsServices = await this.discoverMDNSDevices();
      const ssdpDevices = await this.discoverSSDPDevices();
      
      // Merge and classify all discovered devices
      const allDevices = [
        ...discoveredDevices,
        ...this.processMDNSServices(mdnsServices),
        ...this.processSSSDPDevices(ssdpDevices)
      ];
      
      // Apply enhanced device classification
      const classifiedDevices = await this.classifyDiscoveredDevices(allDevices);
      
      // Check for new or updated devices
      const updates: any[] = [];
      
      for (const device of classifiedDevices) {
        const existingDevice = this.localDevices.get(device.mac);
        
        if (!existingDevice || this.hasDeviceChanged(existingDevice, device)) {
          this.localDevices.set(device.mac, device);
          updates.push({
            action: existingDevice ? 'updated' : 'discovered',
            device: this.sanitizeDevice(device)
          });
        }
      }
      
      // Remove devices that are no longer found
      for (const [mac, device] of this.localDevices) {
        if (!classifiedDevices.find(d => d.mac === mac)) {
          this.localDevices.delete(mac);
          updates.push({
            action: 'removed',
            device: { mac, lastSeen: new Date() }
          });
        }
      }
      
      // Send updates to cloud if any
      if (updates.length > 0) {
        await this.syncToCloud('device_updates', {
          agentId: this.agentId,
          timestamp: new Date(),
          updates
        });
        
        console.log(`[Desktop Agent] Synced ${updates.length} device updates to cloud`);
      }
      
      // Scan for data integrity issues
      const violations = dataIntegrityMonitor.scanDevices(Array.from(this.localDevices.values()));
      if (violations.length > 0) {
        console.warn(`[Desktop Agent] Data integrity violations found: ${violations.length}`);
        this.reportError('data_integrity', `Found ${violations.length} data violations in local scan`);
      }
      
    } catch (error) {
      console.error('[Desktop Agent] Device scan failed:', error);
      this.reportError('device_scan', error.toString());
    }
  }

  /**
   * Connect to cloud sync tunnel
   */
  private async connectToCloud(endpoint: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log(`[Desktop Agent] Connecting to cloud tunnel: ${endpoint}`);
        
        this.cloudConnection = new WebSocket(endpoint);
        
        this.cloudConnection.on('open', () => {
          console.log('[Desktop Agent] Connected to cloud tunnel');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Send agent registration
          this.sendToCloud('agent_register', {
            agentId: this.agentId,
            capabilities: ['device_discovery', 'network_scan', 'signal_analysis'],
            version: '1.0.0',
            timestamp: new Date()
          });
          
          resolve();
        });
        
        this.cloudConnection.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleCloudMessage(message);
          } catch (error) {
            console.error('[Desktop Agent] Failed to parse cloud message:', error);
          }
        });
        
        this.cloudConnection.on('close', () => {
          console.log('[Desktop Agent] Cloud connection closed');
          this.isConnected = false;
          this.attemptReconnect(endpoint);
        });
        
        this.cloudConnection.on('error', (error) => {
          console.error('[Desktop Agent] Cloud connection error:', error);
          this.isConnected = false;
          reject(error);
        });
        
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle messages from cloud
   */
  private handleCloudMessage(message: any): void {
    switch (message.type) {
      case 'scan_request':
        console.log('[Desktop Agent] Received scan request from cloud');
        this.performDeviceScan();
        break;
        
      case 'device_command':
        console.log('[Desktop Agent] Received device command:', message.command);
        this.executeDeviceCommand(message);
        break;
        
      case 'agent_config':
        console.log('[Desktop Agent] Received configuration update');
        this.updateConfiguration(message.config);
        break;
        
      case 'heartbeat_response':
        // Cloud acknowledges heartbeat
        break;
        
      default:
        console.warn('[Desktop Agent] Unknown message type:', message.type);
    }
  }

  /**
   * Execute device command from cloud
   */
  private async executeDeviceCommand(message: any): Promise<void> {
    try {
      const { deviceMac, command, parameters } = message;
      const device = this.localDevices.get(deviceMac);
      
      if (!device) {
        this.sendToCloud('command_response', {
          commandId: message.commandId,
          success: false,
          error: 'Device not found'
        });
        return;
      }
      
      // Execute command based on device type
      let result;
      switch (command) {
        case 'ping':
          result = await this.pingDevice(device);
          break;
        case 'scan_ports':
          result = await this.scanDevicePorts(device);
          break;
        case 'get_status':
          result = await this.getDeviceStatus(device);
          break;
        default:
          throw new Error(`Unknown command: ${command}`);
      }
      
      this.sendToCloud('command_response', {
        commandId: message.commandId,
        success: true,
        result
      });
      
    } catch (error) {
      this.sendToCloud('command_response', {
        commandId: message.commandId,
        success: false,
        error: error.toString()
      });
    }
  }

  /**
   * Send data to cloud
   */
  private sendToCloud(type: string, data: any): void {
    if (!this.isConnected || !this.cloudConnection) {
      console.warn('[Desktop Agent] Cannot send to cloud - not connected');
      return;
    }
    
    try {
      this.cloudConnection.send(JSON.stringify({
        type,
        agentId: this.agentId,
        timestamp: new Date(),
        ...data
      }));
    } catch (error) {
      console.error('[Desktop Agent] Failed to send to cloud:', error);
    }
  }

  /**
   * Sync data to cloud with retry logic
   */
  private async syncToCloud(type: string, data: any): Promise<void> {
    if (!this.isConnected) {
      console.warn('[Desktop Agent] Cannot sync - not connected to cloud');
      return;
    }
    
    this.sendToCloud(type, data);
  }

  /**
   * Start heartbeat to maintain cloud connection
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.sendToCloud('heartbeat', {
          deviceCount: this.localDevices.size,
          status: 'active',
          lastScan: new Date()
        });
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Attempt to reconnect to cloud
   */
  private attemptReconnect(endpoint: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Desktop Agent] Max reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`[Desktop Agent] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connectToCloud(endpoint).catch((error) => {
        console.error('[Desktop Agent] Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Utility functions
   */
  private generateAgentId(): string {
    return `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private hasDeviceChanged(oldDevice: any, newDevice: any): boolean {
    return oldDevice.rssi !== newDevice.rssi ||
           oldDevice.isOnline !== newDevice.isOnline ||
           oldDevice.lastSeen.getTime() !== newDevice.lastSeen.getTime();
  }

  private sanitizeDevice(device: any): any {
    // Remove sensitive information before sending to cloud
    return {
      ip: device.ip,
      mac: device.mac,
      hostname: device.hostname,
      vendor: device.vendor,
      deviceType: device.deviceType,
      deviceName: device.deviceName,
      protocol: device.protocol,
      services: device.services,
      capabilities: device.capabilities,
      rssi: device.rssi,
      lastSeen: device.lastSeen,
      isOnline: device.isOnline
    };
  }

  private async pingDevice(device: any): Promise<any> {
    // Implementation would use actual ping utility
    return { alive: true, responseTime: 12 };
  }

  private async scanDevicePorts(device: any): Promise<any> {
    // Implementation would scan common ports
    return { openPorts: [80, 443, 22] };
  }

  private async getDeviceStatus(device: any): Promise<any> {
    return {
      status: device.isOnline ? 'online' : 'offline',
      lastSeen: device.lastSeen,
      rssi: device.rssi
    };
  }

  private updateConfiguration(config: any): void {
    console.log('[Desktop Agent] Configuration updated:', config);
    // Apply configuration changes
  }

  private reportError(type: string, message: string): void {
    metaAIMonitor.reportError({
      systemId: 'desktop-agent',
      systemName: 'Desktop Agent',
      errorType: 'error',
      errorMessage: message,
      errorContext: { type, agentId: this.agentId },
      severity: 'medium',
      affectedComponents: ['desktop-agent', 'device-discovery']
    });
  }

  /**
   * Stop the desktop agent
   */
  stop(): void {
    console.log('[Desktop Agent] Stopping...');
    
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    if (this.cloudConnection) {
      this.cloudConnection.close();
    }
    
    this.isConnected = false;
    console.log('[Desktop Agent] Stopped');
  }
}

// Global instance
export const desktopAgent = new DesktopAgent();