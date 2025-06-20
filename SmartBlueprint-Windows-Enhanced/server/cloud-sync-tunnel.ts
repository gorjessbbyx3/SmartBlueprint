import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { metaAIMonitor } from './meta-ai-monitor';
import { dataIntegrityMonitor } from './data-integrity-monitor';
import { storage } from './storage';

/**
 * Cloud Sync Tunnel - Secure bridge between Desktop Agents and Web App
 * Handles MQTT/WebSocket/HTTPS connections from local network agents
 */
export class CloudSyncTunnel {
  private wss: WebSocketServer | null = null;
  private connectedAgents: Map<string, AgentConnection> = new Map();
  private deviceUpdates: Map<string, any[]> = new Map();

  constructor() {
    console.log('[Cloud Sync Tunnel] Initializing secure agent bridge...');
  }

  /**
   * Initialize WebSocket server for agent connections
   */
  initializeAgentTunnel(server: Server): void {
    console.log('[Cloud Sync Tunnel] Setting up agent tunnel on /agent-tunnel...');
    
    // Create WebSocket server on /agent-tunnel path
    this.wss = new WebSocketServer({ 
      server, 
      path: '/agent-tunnel',
      verifyClient: this.verifyAgentConnection.bind(this)
    });

    this.wss.on('connection', (ws: WebSocket, request) => {
      this.handleAgentConnection(ws, request);
    });

    console.log('[Cloud Sync Tunnel] Agent tunnel ready - awaiting desktop agent connections');
  }

  /**
   * Verify agent connection for security
   */
  private verifyAgentConnection(info: any): boolean {
    // In production, verify agent authentication token
    // For now, allow all connections for local development
    console.log('[Cloud Sync Tunnel] Agent connection attempt from:', info.origin);
    return true;
  }

  /**
   * Handle new agent connection
   */
  private handleAgentConnection(ws: WebSocket, request: any): void {
    console.log('[Cloud Sync Tunnel] New agent connected');
    
    let agentId: string | null = null;
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await this.handleAgentMessage(ws, message, agentId);
        
        // Update agentId after registration
        if (message.type === 'agent_register') {
          agentId = message.agentId;
        }
      } catch (error) {
        console.error('[Cloud Sync Tunnel] Failed to parse agent message:', error);
        this.sendToAgent(ws, 'error', { message: 'Invalid message format' });
      }
    });

    ws.on('close', () => {
      if (agentId) {
        console.log(`[Cloud Sync Tunnel] Agent ${agentId} disconnected`);
        this.connectedAgents.delete(agentId);
        this.notifyWebApp('agent_disconnected', { agentId });
      }
    });

    ws.on('error', (error) => {
      console.error('[Cloud Sync Tunnel] Agent connection error:', error);
    });
  }

  /**
   * Handle messages from desktop agents
   */
  private async handleAgentMessage(ws: WebSocket, message: any, currentAgentId: string | null): Promise<void> {
    const { type, agentId } = message;
    
    switch (type) {
      case 'agent_register':
        await this.handleAgentRegistration(ws, message);
        break;
        
      case 'device_updates':
        await this.handleDeviceUpdates(message);
        break;
        
      case 'heartbeat':
        await this.handleAgentHeartbeat(agentId, message);
        break;
        
      case 'command_response':
        await this.handleCommandResponse(message);
        break;
        
      case 'error_report':
        await this.handleAgentError(agentId, message);
        break;
        
      default:
        console.warn(`[Cloud Sync Tunnel] Unknown message type: ${type}`);
    }
  }

  /**
   * Handle agent registration
   */
  private async handleAgentRegistration(ws: WebSocket, message: any): Promise<void> {
    const { agentId, capabilities, version } = message;
    
    console.log(`[Cloud Sync Tunnel] Registering agent ${agentId} with capabilities:`, capabilities);
    
    // Store agent connection
    this.connectedAgents.set(agentId, {
      id: agentId,
      websocket: ws,
      capabilities,
      version,
      lastHeartbeat: new Date(),
      status: 'active'
    });
    
    // Send registration confirmation
    this.sendToAgent(ws, 'registration_success', {
      message: 'Agent successfully registered with cloud',
      cloudVersion: '1.0.0',
      features: ['device_sync', 'real_time_updates', 'command_relay']
    });
    
    // Notify web app
    this.notifyWebApp('agent_connected', {
      agentId,
      capabilities,
      version,
      timestamp: new Date()
    });
    
    console.log(`[Cloud Sync Tunnel] Agent ${agentId} successfully registered`);
  }

  /**
   * Handle device updates from agent
   */
  private async handleDeviceUpdates(message: any): Promise<void> {
    const { agentId, updates, timestamp } = message;
    
    console.log(`[Cloud Sync Tunnel] Received ${updates.length} device updates from agent ${agentId}`);
    
    // Scan for data integrity violations
    const devices = updates.map(u => u.device).filter(d => d);
    const violations = dataIntegrityMonitor.scanDevices(devices);
    
    if (violations.length > 0) {
      console.warn(`[Cloud Sync Tunnel] Data integrity violations in agent updates: ${violations.length}`);
      metaAIMonitor.reportError({
        systemId: 'cloud-sync-tunnel',
        systemName: 'Cloud Sync Tunnel',
        errorType: 'data_integrity',
        errorMessage: `Agent ${agentId} sent data with ${violations.length} integrity violations`,
        errorContext: { agentId, violations: violations.slice(0, 5) },
        severity: 'high',
        affectedComponents: ['cloud-sync-tunnel', 'device-storage']
      });
      return;
    }
    
    // Process each update
    for (const update of updates) {
      try {
        await this.processDeviceUpdate(agentId, update);
      } catch (error) {
        console.error('[Cloud Sync Tunnel] Failed to process device update:', error);
      }
    }
    
    // Store updates for web app
    if (!this.deviceUpdates.has(agentId)) {
      this.deviceUpdates.set(agentId, []);
    }
    this.deviceUpdates.get(agentId)!.push(...updates);
    
    // Notify web app of new device data
    this.notifyWebApp('device_updates', {
      agentId,
      updates: updates.map(u => ({
        action: u.action,
        device: this.sanitizeDeviceForWebApp(u.device)
      })),
      timestamp
    });
  }

  /**
   * Process individual device update
   */
  private async processDeviceUpdate(agentId: string, update: any): Promise<void> {
    const { action, device } = update;
    
    switch (action) {
      case 'discovered':
        // Add new device to storage
        await this.addDiscoveredDevice(agentId, device);
        break;
        
      case 'updated':
        // Update existing device
        await this.updateDevice(agentId, device);
        break;
        
      case 'removed':
        // Mark device as offline
        await this.markDeviceOffline(agentId, device);
        break;
        
      default:
        console.warn(`[Cloud Sync Tunnel] Unknown device action: ${action}`);
    }
  }

  /**
   * Add discovered device to storage
   */
  private async addDiscoveredDevice(agentId: string, device: any): Promise<void> {
    try {
      // Check if device already exists
      const existingDevices = await storage.getDevices();
      const existing = existingDevices.find(d => d.macAddress === device.mac);
      
      if (existing) {
        // Update existing device
        await this.updateDevice(agentId, device);
        return;
      }
      
      // Create new device
      const newDevice = {
        name: device.deviceName || device.hostname || `Device ${device.mac.slice(-4)}`,
        macAddress: device.mac,
        deviceType: device.deviceType || 'unknown',
        protocol: device.protocol || 'unknown',
        rssi: device.rssi || -70,
        x: null,
        y: null,
        isOnline: device.isOnline ?? true,
        lastSeen: device.lastSeen || new Date(),
        telemetryData: {
          agentId,
          vendor: device.vendor,
          ip: device.ip,
          hostname: device.hostname,
          services: device.services,
          capabilities: device.capabilities
        }
      };
      
      await storage.createDevice(newDevice);
      console.log(`[Cloud Sync Tunnel] Added new device: ${newDevice.name} (${device.mac})`);
      
    } catch (error) {
      console.error('[Cloud Sync Tunnel] Failed to add discovered device:', error);
    }
  }

  /**
   * Update existing device
   */
  private async updateDevice(agentId: string, device: any): Promise<void> {
    try {
      const devices = await storage.getDevices();
      const existing = devices.find(d => d.macAddress === device.mac);
      
      if (existing) {
        await storage.updateDevice(existing.id, {
          rssi: device.rssi || existing.rssi,
          isOnline: device.isOnline ?? existing.isOnline,
          lastSeen: device.lastSeen || new Date(),
          telemetryData: {
            ...existing.telemetryData,
            agentId,
            lastUpdate: new Date()
          }
        });
        
        console.log(`[Cloud Sync Tunnel] Updated device: ${existing.name} (${device.mac})`);
      }
    } catch (error) {
      console.error('[Cloud Sync Tunnel] Failed to update device:', error);
    }
  }

  /**
   * Mark device as offline
   */
  private async markDeviceOffline(agentId: string, device: any): Promise<void> {
    try {
      const devices = await storage.getDevices();
      const existing = devices.find(d => d.macAddress === device.mac);
      
      if (existing) {
        await storage.updateDevice(existing.id, {
          isOnline: false,
          lastSeen: new Date()
        });
        
        console.log(`[Cloud Sync Tunnel] Marked device offline: ${existing.name} (${device.mac})`);
      }
    } catch (error) {
      console.error('[Cloud Sync Tunnel] Failed to mark device offline:', error);
    }
  }

  /**
   * Handle agent heartbeat
   */
  private async handleAgentHeartbeat(agentId: string, message: any): Promise<void> {
    const agent = this.connectedAgents.get(agentId);
    if (agent) {
      agent.lastHeartbeat = new Date();
      agent.status = 'active';
      
      // Send heartbeat response
      this.sendToAgent(agent.websocket, 'heartbeat_response', {
        timestamp: new Date(),
        status: 'acknowledged'
      });
    }
  }

  /**
   * Handle command response from agent
   */
  private async handleCommandResponse(message: any): Promise<void> {
    console.log('[Cloud Sync Tunnel] Command response received:', message.commandId);
    
    // Forward response to web app
    this.notifyWebApp('command_response', message);
  }

  /**
   * Handle error reports from agent
   */
  private async handleAgentError(agentId: string, message: any): Promise<void> {
    console.error(`[Cloud Sync Tunnel] Agent ${agentId} reported error:`, message.error);
    
    // Report to Meta-AI Monitor
    metaAIMonitor.reportError({
      systemId: 'desktop-agent',
      systemName: `Desktop Agent ${agentId}`,
      errorType: 'error',
      errorMessage: message.error,
      errorContext: { agentId, ...message.context },
      severity: message.severity || 'medium',
      affectedComponents: ['desktop-agent', 'cloud-sync-tunnel']
    });
  }

  /**
   * Send command to specific agent
   */
  sendCommandToAgent(agentId: string, command: string, parameters: any): boolean {
    const agent = this.connectedAgents.get(agentId);
    if (!agent) {
      console.warn(`[Cloud Sync Tunnel] Agent ${agentId} not connected`);
      return false;
    }
    
    const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.sendToAgent(agent.websocket, 'device_command', {
      commandId,
      command,
      parameters,
      timestamp: new Date()
    });
    
    return true;
  }

  /**
   * Request scan from all connected agents
   */
  requestScanFromAllAgents(): void {
    console.log('[Cloud Sync Tunnel] Requesting scan from all connected agents');
    
    for (const [agentId, agent] of this.connectedAgents) {
      this.sendToAgent(agent.websocket, 'scan_request', {
        timestamp: new Date(),
        scanType: 'full'
      });
    }
  }

  /**
   * Send message to specific agent
   */
  private sendToAgent(ws: WebSocket, type: string, data: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type,
        timestamp: new Date(),
        ...data
      }));
    }
  }

  /**
   * Notify web app of tunnel events
   */
  private notifyWebApp(type: string, data: any): void {
    // This would integrate with your existing WebSocket system
    // For now, just log the event
    console.log(`[Cloud Sync Tunnel] Web app notification: ${type}`, data);
  }

  /**
   * Sanitize device data before sending to web app
   */
  private sanitizeDeviceForWebApp(device: any): any {
    if (!device) return null;
    
    return {
      mac: device.mac,
      deviceName: device.deviceName,
      deviceType: device.deviceType,
      vendor: device.vendor,
      rssi: device.rssi,
      isOnline: device.isOnline,
      lastSeen: device.lastSeen,
      protocol: device.protocol
    };
  }

  /**
   * Get connected agents status
   */
  getConnectedAgents(): any[] {
    return Array.from(this.connectedAgents.values()).map(agent => ({
      id: agent.id,
      capabilities: agent.capabilities,
      version: agent.version,
      lastHeartbeat: agent.lastHeartbeat,
      status: agent.status
    }));
  }

  /**
   * Get recent device updates
   */
  getRecentDeviceUpdates(agentId?: string): any[] {
    if (agentId) {
      return this.deviceUpdates.get(agentId) || [];
    }
    
    const allUpdates: any[] = [];
    for (const updates of this.deviceUpdates.values()) {
      allUpdates.push(...updates);
    }
    
    return allUpdates.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ).slice(0, 100); // Last 100 updates
  }
}

interface AgentConnection {
  id: string;
  websocket: WebSocket;
  capabilities: string[];
  version: string;
  lastHeartbeat: Date;
  status: 'active' | 'inactive' | 'error';
}

// Global instance
export const cloudSyncTunnel = new CloudSyncTunnel();