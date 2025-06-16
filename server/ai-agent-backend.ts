import { metaAIMonitor } from './meta-ai-monitor';
import { storage } from './storage';
import { cloudSyncTunnel } from './cloud-sync-tunnel';
import { mlAnomalyDetection } from './ml-anomaly-detection';

/**
 * AI Agent Backend - Advanced Intelligence Layer
 * Implements multiple specialized AI agents for monitoring, prediction, and automation
 */
export class AIAgentBackend {
  private agents: Map<string, AIAgent> = new Map();
  private isRunning = false;
  private processingInterval?: NodeJS.Timeout;

  constructor() {
    this.initializeAgents();
  }

  /**
   * Initialize all AI agents
   */
  private initializeAgents(): void {
    console.log('[AI Agent Backend] Initializing specialized AI agents...');

    // Device Offline Anomaly Detection Agent
    this.agents.set('offline-detector', new OfflineDetectionAgent());
    
    // WiFi Signal Prediction Agent  
    this.agents.set('signal-predictor', new SignalPredictionAgent());
    
    // Network Anomaly Detection Agent
    this.agents.set('network-anomaly', new NetworkAnomalyAgent());
    
    // Self-Healing Automation Agent
    this.agents.set('self-healing', new SelfHealingAgent());
    
    // User Coaching Agent
    this.agents.set('user-coaching', new UserCoachingAgent());
    
    // Mapping Intelligence Agent
    this.agents.set('mapping-intelligence', new MappingIntelligenceAgent());

    console.log(`[AI Agent Backend] Initialized ${this.agents.size} AI agents`);
  }

  /**
   * Start all AI agents
   */
  start(): void {
    if (this.isRunning) return;
    
    console.log('[AI Agent Backend] Starting AI agent processing...');
    this.isRunning = true;
    
    // Start all agents
    for (const [name, agent] of this.agents) {
      try {
        agent.start();
        console.log(`[AI Agent Backend] Started agent: ${name}`);
      } catch (error) {
        console.error(`[AI Agent Backend] Failed to start agent ${name}:`, error);
      }
    }
    
    // Start main processing loop
    this.processingInterval = setInterval(() => {
      this.processAgents();
    }, 30000); // Process every 30 seconds
  }

  /**
   * Stop all AI agents
   */
  stop(): void {
    if (!this.isRunning) return;
    
    console.log('[AI Agent Backend] Stopping AI agents...');
    this.isRunning = false;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    
    for (const [name, agent] of this.agents) {
      try {
        agent.stop();
        console.log(`[AI Agent Backend] Stopped agent: ${name}`);
      } catch (error) {
        console.error(`[AI Agent Backend] Failed to stop agent ${name}:`, error);
      }
    }
  }

  /**
   * Process all agents
   */
  private async processAgents(): Promise<void> {
    if (!this.isRunning) return;
    
    try {
      // Get current system data
      const devices = await storage.getDevices();
      const anomalies = await storage.getAnomalies();
      const rooms = await storage.getRooms();
      const connectedAgents = cloudSyncTunnel.getConnectedAgents();
      
      const context: AgentContext = {
        devices,
        anomalies,
        rooms,
        connectedAgents,
        timestamp: new Date()
      };
      
      // Process each agent
      for (const [name, agent] of this.agents) {
        try {
          await agent.process(context);
        } catch (error) {
          console.error(`[AI Agent Backend] Agent ${name} processing failed:`, error);
          
          // Report agent failure to Meta-AI
          metaAIMonitor.reportError({
            systemId: `ai-agent-${name}`,
            systemName: `AI Agent: ${name}`,
            errorType: 'error',
            errorMessage: `Agent processing failed: ${error}`,
            errorContext: { agentName: name, error: error.toString() },
            severity: 'medium',
            affectedComponents: ['ai-agents', 'monitoring']
          });
        }
      }
      
    } catch (error) {
      console.error('[AI Agent Backend] Agent processing cycle failed:', error);
    }
  }

  /**
   * Get agent status and insights
   */
  getAgentStatus(): any[] {
    return Array.from(this.agents.entries()).map(([name, agent]) => ({
      name,
      type: agent.getType(),
      status: agent.getStatus(),
      insights: agent.getInsights(),
      lastProcessed: agent.getLastProcessed()
    }));
  }

  /**
   * Get specific agent by name
   */
  getAgent(name: string): AIAgent | undefined {
    return this.agents.get(name);
  }
}

/**
 * Base AI Agent interface
 */
abstract class AIAgent {
  protected isActive = false;
  protected lastProcessed?: Date;
  protected insights: AgentInsight[] = [];

  abstract getType(): string;
  abstract process(context: AgentContext): Promise<void>;

  start(): void {
    this.isActive = true;
  }

  stop(): void {
    this.isActive = false;
  }

  getStatus(): string {
    return this.isActive ? 'active' : 'inactive';
  }

  getInsights(): AgentInsight[] {
    return this.insights.slice(-10); // Last 10 insights
  }

  getLastProcessed(): Date | undefined {
    return this.lastProcessed;
  }

  protected addInsight(insight: Omit<AgentInsight, 'timestamp'>): void {
    this.insights.push({
      ...insight,
      timestamp: new Date()
    });
    
    // Keep only last 50 insights
    if (this.insights.length > 50) {
      this.insights = this.insights.slice(-50);
    }
  }
}

/**
 * Device Offline Detection Agent
 */
class OfflineDetectionAgent extends AIAgent {
  private lastSeen: Map<number, Date> = new Map();

  getType(): string {
    return 'offline-detection';
  }

  async process(context: AgentContext): Promise<void> {
    this.lastProcessed = new Date();
    
    const currentTime = new Date();
    const offlineThreshold = 5 * 60 * 1000; // 5 minutes
    
    for (const device of context.devices) {
      const deviceLastSeen = device.lastSeen || new Date(0);
      const timeSinceLastSeen = currentTime.getTime() - deviceLastSeen.getTime();
      
      // Update tracking
      this.lastSeen.set(device.id, deviceLastSeen);
      
      // Check for offline devices
      if (timeSinceLastSeen > offlineThreshold && device.isOnline) {
        const insight: Omit<AgentInsight, 'timestamp'> = {
          type: 'anomaly',
          severity: 'medium',
          title: 'Device Offline Detected',
          description: `${device.name} has been offline for ${Math.round(timeSinceLastSeen / 60000)} minutes`,
          actionable: true,
          action: 'Check device connection and power status',
          confidence: 0.9,
          deviceId: device.id
        };
        
        this.addInsight(insight);
        
        // Create anomaly record
        await storage.createAnomaly({
          deviceId: device.id,
          type: 'device_offline',
          severity: 'medium',
          description: insight.description
        });
        
        console.log(`[Offline Detection] ${device.name} detected offline`);
      }
    }
  }
}

/**
 * WiFi Signal Prediction Agent
 */
class SignalPredictionAgent extends AIAgent {
  private signalHistory: Map<number, number[]> = new Map();

  getType(): string {
    return 'signal-prediction';
  }

  async process(context: AgentContext): Promise<void> {
    this.lastProcessed = new Date();
    
    for (const device of context.devices) {
      // Track signal history
      if (!this.signalHistory.has(device.id)) {
        this.signalHistory.set(device.id, []);
      }
      
      const history = this.signalHistory.get(device.id)!;
      history.push(device.rssi);
      
      // Keep only last 100 readings
      if (history.length > 100) {
        history.shift();
      }
      
      // Analyze signal trends if we have enough data
      if (history.length >= 10) {
        const trend = this.calculateSignalTrend(history);
        
        if (trend.direction === 'declining' && trend.strength > 0.7) {
          const insight: Omit<AgentInsight, 'timestamp'> = {
            type: 'prediction',
            severity: 'medium',
            title: 'Signal Degradation Predicted',
            description: `${device.name} signal strength is declining (trend: ${trend.strength.toFixed(2)})`,
            actionable: true,
            action: 'Check for interference or consider repositioning device',
            confidence: trend.strength,
            deviceId: device.id
          };
          
          this.addInsight(insight);
          console.log(`[Signal Prediction] Signal degradation predicted for ${device.name}`);
        }
      }
    }
  }

  private calculateSignalTrend(history: number[]): { direction: 'improving' | 'declining' | 'stable', strength: number } {
    if (history.length < 5) return { direction: 'stable', strength: 0 };
    
    const recent = history.slice(-5);
    const older = history.slice(-10, -5);
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    const change = recentAvg - olderAvg;
    const strength = Math.abs(change) / 10; // Normalize to 0-1
    
    return {
      direction: change > 1 ? 'improving' : change < -1 ? 'declining' : 'stable',
      strength: Math.min(strength, 1)
    };
  }
}

/**
 * Network Anomaly Detection Agent
 */
class NetworkAnomalyAgent extends AIAgent {
  private deviceFingerprints: Map<string, DeviceFingerprint> = new Map();

  getType(): string {
    return 'network-anomaly';
  }

  async process(context: AgentContext): Promise<void> {
    this.lastProcessed = new Date();
    
    for (const device of context.devices) {
      const fingerprint = this.createDeviceFingerprint(device);
      const existing = this.deviceFingerprints.get(device.macAddress);
      
      if (!existing) {
        // New device detected
        this.deviceFingerprints.set(device.macAddress, fingerprint);
        
        const insight: Omit<AgentInsight, 'timestamp'> = {
          type: 'anomaly',
          severity: 'low',
          title: 'New Device Detected',
          description: `New device "${device.name}" joined the network`,
          actionable: true,
          action: 'Verify this is an authorized device',
          confidence: 1.0,
          deviceId: device.id
        };
        
        this.addInsight(insight);
        console.log(`[Network Anomaly] New device detected: ${device.name}`);
        
      } else if (this.isAnomalousChange(existing, fingerprint)) {
        // Suspicious change detected
        const insight: Omit<AgentInsight, 'timestamp'> = {
          type: 'anomaly',
          severity: 'high',
          title: 'Suspicious Device Behavior',
          description: `Device "${device.name}" showed unusual network behavior`,
          actionable: true,
          action: 'Investigate device for potential security issues',
          confidence: 0.8,
          deviceId: device.id
        };
        
        this.addInsight(insight);
        console.log(`[Network Anomaly] Suspicious behavior: ${device.name}`);
      }
      
      // Update fingerprint
      this.deviceFingerprints.set(device.macAddress, fingerprint);
    }
  }

  private createDeviceFingerprint(device: any): DeviceFingerprint {
    return {
      deviceType: device.deviceType,
      vendor: device.telemetryData?.vendor || 'unknown',
      protocol: device.protocol,
      signalRange: this.categorizeSignal(device.rssi),
      lastSeen: device.lastSeen || new Date()
    };
  }

  private categorizeSignal(rssi: number): string {
    if (rssi > -50) return 'excellent';
    if (rssi > -70) return 'good';
    if (rssi > -85) return 'fair';
    return 'poor';
  }

  private isAnomalousChange(old: DeviceFingerprint, new_: DeviceFingerprint): boolean {
    // Check for significant changes that might indicate spoofing or compromise
    return old.deviceType !== new_.deviceType || 
           old.vendor !== new_.vendor ||
           old.protocol !== new_.protocol;
  }
}

/**
 * Self-Healing Automation Agent
 */
class SelfHealingAgent extends AIAgent {
  private healingAttempts: Map<number, number> = new Map();

  getType(): string {
    return 'self-healing';
  }

  async process(context: AgentContext): Promise<void> {
    this.lastProcessed = new Date();
    
    // Look for devices that need healing
    for (const device of context.devices) {
      if (!device.isOnline && this.shouldAttemptHealing(device.id)) {
        await this.attemptDeviceHealing(device);
      }
    }
    
    // Check for disconnected agents
    const expectedAgents = 1; // Expected number of agents
    if (context.connectedAgents.length < expectedAgents) {
      const insight: Omit<AgentInsight, 'timestamp'> = {
        type: 'automation',
        severity: 'medium',
        title: 'Desktop Agent Disconnected',
        description: 'Desktop agent lost connection - attempting automatic recovery',
        actionable: false,
        action: '',
        confidence: 1.0
      };
      
      this.addInsight(insight);
      console.log('[Self-Healing] Desktop agent disconnection detected');
    }
  }

  private shouldAttemptHealing(deviceId: number): boolean {
    const attempts = this.healingAttempts.get(deviceId) || 0;
    return attempts < 3; // Max 3 healing attempts
  }

  private async attemptDeviceHealing(device: any): Promise<void> {
    const attempts = this.healingAttempts.get(device.id) || 0;
    this.healingAttempts.set(device.id, attempts + 1);
    
    // Try to send wake-up command via agent
    cloudSyncTunnel.requestScanFromAllAgents();
    
    const insight: Omit<AgentInsight, 'timestamp'> = {
      type: 'automation',
      severity: 'low',
      title: 'Self-Healing Attempt',
      description: `Attempting to reconnect ${device.name} (attempt ${attempts + 1}/3)`,
      actionable: false,
      action: '',
      confidence: 0.6,
      deviceId: device.id
    };
    
    this.addInsight(insight);
    console.log(`[Self-Healing] Healing attempt for ${device.name}`);
  }
}

/**
 * User Coaching Agent
 */
class UserCoachingAgent extends AIAgent {
  getType(): string {
    return 'user-coaching';
  }

  async process(context: AgentContext): Promise<void> {
    this.lastProcessed = new Date();
    
    // Analyze room coverage
    const roomAnalysis = this.analyzeRoomCoverage(context.devices, context.rooms);
    
    for (const analysis of roomAnalysis) {
      if (analysis.needsImprovement) {
        const insight: Omit<AgentInsight, 'timestamp'> = {
          type: 'coaching',
          severity: 'low',
          title: 'Network Optimization Suggestion',
          description: analysis.suggestion,
          actionable: true,
          action: analysis.action,
          confidence: analysis.confidence
        };
        
        this.addInsight(insight);
        console.log(`[User Coaching] ${analysis.suggestion}`);
      }
    }
  }

  private analyzeRoomCoverage(devices: any[], rooms: any[]): RoomAnalysis[] {
    return rooms.map(room => {
      const roomDevices = devices.filter(d => 
        d.x !== null && d.y !== null && this.isDeviceInRoom(d, room)
      );
      
      if (roomDevices.length === 0) {
        return {
          roomId: room.id,
          roomName: room.name,
          needsImprovement: true,
          suggestion: `No devices detected in ${room.name}`,
          action: 'Consider adding smart devices or improving network coverage in this room',
          confidence: 0.8
        };
      }
      
      const avgSignal = roomDevices.reduce((sum, d) => sum + d.rssi, 0) / roomDevices.length;
      
      if (avgSignal < -80) {
        return {
          roomId: room.id,
          roomName: room.name,
          needsImprovement: true,
          suggestion: `Poor WiFi coverage in ${room.name} (avg: ${avgSignal.toFixed(0)} dBm)`,
          action: 'Consider moving router closer or adding a WiFi extender',
          confidence: 0.9
        };
      }
      
      return {
        roomId: room.id,
        roomName: room.name,
        needsImprovement: false,
        suggestion: '',
        action: '',
        confidence: 0
      };
    });
  }

  private isDeviceInRoom(device: any, room: any): boolean {
    // Simple point-in-polygon check (assumes rectangular rooms)
    try {
      const boundaries = JSON.parse(room.boundaries);
      if (boundaries.length < 3) return false;
      
      // For simplicity, just check if device is within bounding box
      const xs = boundaries.map((p: any) => p.x);
      const ys = boundaries.map((p: any) => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      
      return device.x >= minX && device.x <= maxX && 
             device.y >= minY && device.y <= maxY;
    } catch {
      return false;
    }
  }
}

/**
 * Mapping Intelligence Agent
 */
class MappingIntelligenceAgent extends AIAgent {
  getType(): string {
    return 'mapping-intelligence';
  }

  async process(context: AgentContext): Promise<void> {
    this.lastProcessed = new Date();
    
    // Analyze mapping completeness
    const mappingAnalysis = this.analyzeMappingCompleteness(context.devices, context.rooms);
    
    if (mappingAnalysis.completeness < 0.7) {
      const insight: Omit<AgentInsight, 'timestamp'> = {
        type: 'coaching',
        severity: 'low',
        title: 'Mapping Data Insufficient',
        description: `Floor plan mapping is ${(mappingAnalysis.completeness * 100).toFixed(0)}% complete`,
        actionable: true,
        action: mappingAnalysis.suggestion,
        confidence: 0.8
      };
      
      this.addInsight(insight);
      console.log(`[Mapping Intelligence] ${insight.description}`);
    }
    
    // Suggest optimal sampling points
    const suggestedPoints = this.suggestSamplingPoints(context.devices, context.rooms);
    
    if (suggestedPoints.length > 0) {
      const insight: Omit<AgentInsight, 'timestamp'> = {
        type: 'coaching',
        severity: 'low',
        title: 'Additional Sampling Recommended',
        description: `Recommend collecting RSSI samples at ${suggestedPoints.length} locations for better coverage analysis`,
        actionable: true,
        action: 'Use the calibration mode to collect signal data at suggested locations',
        confidence: 0.7
      };
      
      this.addInsight(insight);
    }
  }

  private analyzeMappingCompleteness(devices: any[], rooms: any[]): MappingAnalysis {
    const mappedDevices = devices.filter(d => d.x !== null && d.y !== null);
    const completeness = devices.length > 0 ? mappedDevices.length / devices.length : 0;
    
    let suggestion = '';
    if (completeness < 0.3) {
      suggestion = 'Place devices on the floor plan using the mapping interface';
    } else if (completeness < 0.7) {
      suggestion = 'Continue positioning remaining devices for complete coverage analysis';
    } else {
      suggestion = 'Mapping is nearly complete - consider fine-tuning device positions';
    }
    
    return { completeness, suggestion };
  }

  private suggestSamplingPoints(devices: any[], rooms: any[]): Point[] {
    // Simple grid-based sampling suggestion
    const points: Point[] = [];
    
    for (const room of rooms) {
      try {
        const boundaries = JSON.parse(room.boundaries);
        if (boundaries.length < 3) continue;
        
        const xs = boundaries.map((p: any) => p.x);
        const ys = boundaries.map((p: any) => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        
        // Suggest center point if no devices in room
        const roomDevices = devices.filter(d => 
          d.x !== null && d.y !== null &&
          d.x >= minX && d.x <= maxX && 
          d.y >= minY && d.y <= maxY
        );
        
        if (roomDevices.length === 0) {
          points.push({
            x: (minX + maxX) / 2,
            y: (minY + maxY) / 2
          });
        }
      } catch {
        continue;
      }
    }
    
    return points.slice(0, 5); // Limit to 5 suggestions
  }
}

// Type definitions
interface AgentContext {
  devices: any[];
  anomalies: any[];
  rooms: any[];
  connectedAgents: any[];
  timestamp: Date;
}

interface AgentInsight {
  type: 'anomaly' | 'prediction' | 'automation' | 'coaching';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  actionable: boolean;
  action: string;
  confidence: number;
  deviceId?: number;
  timestamp: Date;
}

interface DeviceFingerprint {
  deviceType: string;
  vendor: string;
  protocol: string;
  signalRange: string;
  lastSeen: Date;
}

interface RoomAnalysis {
  roomId: number;
  roomName: string;
  needsImprovement: boolean;
  suggestion: string;
  action: string;
  confidence: number;
}

interface MappingAnalysis {
  completeness: number;
  suggestion: string;
}

interface Point {
  x: number;
  y: number;
}

// Global instance
export const aiAgentBackend = new AIAgentBackend();