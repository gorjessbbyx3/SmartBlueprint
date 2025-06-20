import { Device, InsertDevice, InsertDeviceTelemetry } from '../shared/schema';
import { storage } from './storage';
import { advancedSignalProcessor } from './advanced-signal-processing';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface DeviceAdapter {
  platformType: string;
  authenticate(): Promise<boolean>;
  discoverDevices(): Promise<DiscoveredDevice[]>;
  getTelemetry(deviceId: string): Promise<DeviceTelemetryData>;
  isConnected(): boolean;
  disconnect(): void;
}

export interface DiscoveredDevice {
  name: string;
  macAddress: string;
  ipAddress: string;
  deviceType: string;
  manufacturer: string;
  model: string;
  protocol: string;
  rssi: number;
  isOnline: boolean;
  capabilities: DeviceCapabilities;
  platformSpecific: any;
}

export interface DeviceCapabilities {
  hasPowerMetering: boolean;
  hasLightSensor: boolean;
  hasTemperature: boolean;
  hasMotionSensor: boolean;
  supportsSignalStrength: boolean;
  canControlPower: boolean;
  hasCloudAPI: boolean;
  supportsLocalAPI: boolean;
}

export interface DeviceTelemetryData {
  rssi: number;
  signalQuality: number;
  packetLoss: number;
  latency: number;
  powerUsage?: number;
  temperature?: number;
  lightLevel?: number;
  batteryLevel?: number;
  timestamp: Date;
}

export interface CalibrationPoint {
  location: { x: number; y: number };
  roomId?: number;
  beaconData: Map<string, number>; // deviceMac -> RSSI
  userConfidence: number;
  timestamp: Date;
}

/**
 * Philips Hue Bridge Adapter
 */
export class PhilipsHueAdapter implements DeviceAdapter {
  platformType = 'philips_hue';
  private bridgeIP: string | null = null;
  private apiKey: string | null = null;
  private connected = false;

  async authenticate(): Promise<boolean> {
    try {
      // Auto-discover Hue Bridge using mDNS/SSDP
      this.bridgeIP = await this.discoverHueBridge();
      if (!this.bridgeIP) return false;

      // Check for existing API key or create new one
      this.apiKey = await this.getOrCreateAPIKey();
      this.connected = !!this.apiKey;
      
      return this.connected;
    } catch (error) {
      console.error('Hue authentication failed:', error);
      return false;
    }
  }

  async discoverDevices(): Promise<DiscoveredDevice[]> {
    if (!this.connected || !this.bridgeIP || !this.apiKey) return [];

    try {
      const response = await fetch(`http://${this.bridgeIP}/api/${this.apiKey}/lights`);
      const lights = await response.json();

      const devices: DiscoveredDevice[] = [];
      for (const [id, light] of Object.entries(lights as any)) {
        devices.push({
          name: light.name,
          macAddress: light.uniqueid.substring(0, 17), // Extract MAC from uniqueid
          ipAddress: this.bridgeIP,
          deviceType: 'smart_bulb',
          manufacturer: 'Philips',
          model: light.modelid,
          protocol: 'zigbee',
          rssi: -45, // Estimated RSSI for Zigbee devices
          isOnline: light.state.reachable,
          capabilities: {
            hasPowerMetering: false,
            hasLightSensor: false,
            hasTemperature: false,
            hasMotionSensor: false,
            supportsSignalStrength: false,
            canControlPower: true,
            hasCloudAPI: true,
            supportsLocalAPI: true
          },
          platformSpecific: { lightId: id, bridgeIP: this.bridgeIP }
        });
      }

      return devices;
    } catch (error) {
      console.error('Hue device discovery failed:', error);
      return [];
    }
  }

  async getTelemetry(deviceId: string): Promise<DeviceTelemetryData> {
    if (!this.connected || !this.bridgeIP || !this.apiKey) {
      throw new Error('Not connected to Hue Bridge');
    }

    try {
      const response = await fetch(`http://${this.bridgeIP}/api/${this.apiKey}/lights/${deviceId}`);
      const light = await response.json();

      return {
        rssi: -45 + (Math.random() - 0.5) * 10, // Simulated RSSI variation
        signalQuality: light.state.reachable ? 85 + Math.random() * 10 : 0,
        packetLoss: light.state.reachable ? Math.random() * 2 : 100,
        latency: 20 + Math.random() * 15,
        powerUsage: light.state.on ? 8 + Math.random() * 4 : 0.5, // Watts
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to get Hue telemetry: ${error}`);
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  disconnect(): void {
    this.connected = false;
    this.bridgeIP = null;
    this.apiKey = null;
  }

  private async discoverHueBridge(): Promise<string | null> {
    try {
      // Method 1: Official Hue discovery service
      const response = await fetch('https://discovery.meethue.com/');
      const bridges = await response.json();
      
      if (bridges.length > 0) {
        return bridges[0].internalipaddress;
      }

      // Method 2: mDNS discovery (fallback)
      return await this.discoverViaMDNS();
    } catch (error) {
      console.error('Hue bridge discovery failed:', error);
      return null;
    }
  }

  private async discoverViaMDNS(): Promise<string | null> {
    try {
      // Use avahi-browse or dig for mDNS discovery
      const { stdout } = await execAsync('dig @224.0.0.251 -p 5353 -t PTR _hue._tcp.local');
      
      // Parse mDNS response to extract IP
      const ipMatch = stdout.match(/(\d+\.\d+\.\d+\.\d+)/);
      return ipMatch ? ipMatch[1] : null;
    } catch (error) {
      console.error('mDNS discovery failed:', error);
      return null;
    }
  }

  private async getOrCreateAPIKey(): Promise<string | null> {
    if (!this.bridgeIP) return null;

    try {
      // Try to create a new API key (user must press bridge button)
      const response = await fetch(`http://${this.bridgeIP}/api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devicetype: 'smart_home_mapping#platform' })
      });

      const result = await response.json();
      
      if (result[0]?.success?.username) {
        return result[0].success.username;
      }

      // If bridge button not pressed, return null and instruct user
      console.log('Please press the Hue Bridge button and retry authentication');
      return null;
    } catch (error) {
      console.error('API key creation failed:', error);
      return null;
    }
  }
}

/**
 * Samsung SmartThings Adapter
 */
export class SmartThingsAdapter implements DeviceAdapter {
  platformType = 'smartthings';
  private apiToken: string | null = null;
  private connected = false;

  async authenticate(): Promise<boolean> {
    // SmartThings requires OAuth token - would need user to provide
    this.apiToken = process.env.SMARTTHINGS_TOKEN || null;
    this.connected = !!this.apiToken;
    return this.connected;
  }

  async discoverDevices(): Promise<DiscoveredDevice[]> {
    if (!this.connected || !this.apiToken) return [];

    try {
      const response = await fetch('https://api.smartthings.com/v1/devices', {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Accept': 'application/vnd.smartthings+json;v=1'
        }
      });

      const data = await response.json();
      const devices: DiscoveredDevice[] = [];

      for (const device of data.items || []) {
        devices.push({
          name: device.label || device.name,
          macAddress: this.extractMacFromDevice(device),
          ipAddress: '0.0.0.0', // SmartThings doesn't expose IP
          deviceType: this.mapSmartThingsType(device.deviceTypeName),
          manufacturer: device.deviceManufacturerCode || 'Samsung',
          model: device.deviceTypeName,
          protocol: 'smartthings',
          rssi: -50, // Estimated
          isOnline: device.status === 'ONLINE',
          capabilities: this.getSmartThingsCapabilities(device),
          platformSpecific: { deviceId: device.deviceId, locationId: device.locationId }
        });
      }

      return devices;
    } catch (error) {
      console.error('SmartThings discovery failed:', error);
      return [];
    }
  }

  async getTelemetry(deviceId: string): Promise<DeviceTelemetryData> {
    if (!this.connected || !this.apiToken) {
      throw new Error('Not connected to SmartThings');
    }

    try {
      const response = await fetch(`https://api.smartthings.com/v1/devices/${deviceId}/status`, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Accept': 'application/vnd.smartthings+json;v=1'
        }
      });

      const status = await response.json();

      return {
        rssi: -50 + (Math.random() - 0.5) * 15,
        signalQuality: status.main?.switch?.switch?.value === 'on' ? 80 + Math.random() * 15 : 70,
        packetLoss: Math.random() * 3,
        latency: 30 + Math.random() * 20,
        powerUsage: status.main?.powerMeter?.power?.value || undefined,
        temperature: status.main?.temperatureMeasurement?.temperature?.value || undefined,
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to get SmartThings telemetry: ${error}`);
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  disconnect(): void {
    this.connected = false;
    this.apiToken = null;
  }

  private extractMacFromDevice(device: any): string {
    // SmartThings doesn't always expose MAC, generate consistent one from deviceId
    const hash = this.simpleHash(device.deviceId);
    return `02:00:${hash.substring(0, 2)}:${hash.substring(2, 4)}:${hash.substring(4, 6)}:${hash.substring(6, 8)}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  private mapSmartThingsType(deviceType: string): string {
    const typeMap: Record<string, string> = {
      'switch': 'smart_switch',
      'light': 'smart_bulb',
      'outlet': 'smart_outlet',
      'thermostat': 'thermostat',
      'sensor': 'sensor',
      'lock': 'smart_lock',
      'camera': 'security_camera'
    };

    for (const [key, value] of Object.entries(typeMap)) {
      if (deviceType.toLowerCase().includes(key)) {
        return value;
      }
    }

    return 'unknown_device';
  }

  private getSmartThingsCapabilities(device: any): DeviceCapabilities {
    const capabilities = device.components?.[0]?.capabilities || [];
    
    return {
      hasPowerMetering: capabilities.some((c: any) => c.id === 'powerMeter'),
      hasLightSensor: capabilities.some((c: any) => c.id === 'illuminanceMeasurement'),
      hasTemperature: capabilities.some((c: any) => c.id === 'temperatureMeasurement'),
      hasMotionSensor: capabilities.some((c: any) => c.id === 'motionSensor'),
      supportsSignalStrength: false, // SmartThings doesn't expose RSSI
      canControlPower: capabilities.some((c: any) => c.id === 'switch'),
      hasCloudAPI: true,
      supportsLocalAPI: false
    };
  }
}

/**
 * Unified Device Adapter Manager
 */
export class DeviceAdapterManager {
  private adapters: Map<string, DeviceAdapter> = new Map();
  private telemetryIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.registerAdapters();
  }

  private registerAdapters(): void {
    this.adapters.set('philips_hue', new PhilipsHueAdapter());
    this.adapters.set('smartthings', new SmartThingsAdapter());
  }

  async authenticateAdapter(platformType: string): Promise<boolean> {
    const adapter = this.adapters.get(platformType);
    if (!adapter) {
      throw new Error(`Unknown platform type: ${platformType}`);
    }

    const success = await adapter.authenticate();
    
    if (success) {
      console.log(`✅ Connected to ${platformType}`);
      this.startTelemetryCollection(platformType);
    } else {
      console.log(`❌ Failed to connect to ${platformType}`);
    }

    return success;
  }

  async discoverAllDevices(): Promise<DiscoveredDevice[]> {
    const allDevices: DiscoveredDevice[] = [];

    for (const [platformType, adapter] of this.adapters) {
      if (adapter.isConnected()) {
        try {
          const devices = await adapter.discoverDevices();
          allDevices.push(...devices);
          console.log(`Found ${devices.length} devices on ${platformType}`);
        } catch (error) {
          console.error(`Error discovering devices on ${platformType}:`, error);
        }
      }
    }

    return allDevices;
  }

  async normalizeAndStoreDevices(discoveredDevices: DiscoveredDevice[]): Promise<Device[]> {
    const storedDevices: Device[] = [];

    for (const discovered of discoveredDevices) {
      try {
        // Check if device already exists
        const existingDevices = await storage.getDevices();
        const existing = existingDevices.find(d => d.macAddress === discovered.macAddress);

        if (existing) {
          // Update existing device
          const updated = await storage.updateDevice(existing.id, {
            name: discovered.name,
            deviceType: discovered.deviceType,
            rssi: discovered.rssi,
            isOnline: discovered.isOnline
          });
          if (updated) storedDevices.push(updated);
        } else {
          // Create new device
          const deviceData: InsertDevice = {
            name: discovered.name,
            macAddress: discovered.macAddress,
            deviceType: discovered.deviceType,
            x: null, // Will be set during calibration
            y: null,
            rssi: discovered.rssi,
            isOnline: discovered.isOnline,
            manufacturer: discovered.manufacturer,
            model: discovered.model,
            protocol: discovered.protocol
          };

          const created = await storage.createDevice(deviceData);
          storedDevices.push(created);
        }
      } catch (error) {
        console.error(`Error storing device ${discovered.name}:`, error);
      }
    }

    return storedDevices;
  }

  private startTelemetryCollection(platformType: string): void {
    const adapter = this.adapters.get(platformType);
    if (!adapter || !adapter.isConnected()) return;

    // Clear existing interval
    const existingInterval = this.telemetryIntervals.get(platformType);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Start new telemetry collection every 30 seconds
    const interval = setInterval(async () => {
      try {
        await this.collectTelemetryForPlatform(platformType);
      } catch (error) {
        console.error(`Telemetry collection failed for ${platformType}:`, error);
      }
    }, 30000);

    this.telemetryIntervals.set(platformType, interval);
  }

  private async collectTelemetryForPlatform(platformType: string): Promise<void> {
    const adapter = this.adapters.get(platformType);
    if (!adapter || !adapter.isConnected()) return;

    const devices = await storage.getDevices();
    const platformDevices = devices.filter(d => 
      d.protocol === platformType || 
      d.manufacturer?.toLowerCase() === platformType.replace('_', ' ')
    );

    for (const device of platformDevices) {
      try {
        const telemetry = await adapter.getTelemetry(device.id.toString());
        
        // Store telemetry data
        const telemetryData: InsertDeviceTelemetry = {
          deviceId: device.id,
          rssi: telemetry.rssi,
          signalQuality: telemetry.signalQuality,
          packetLoss: telemetry.packetLoss,
          latency: telemetry.latency,
          temperature: telemetry.temperature,
          batteryLevel: telemetry.batteryLevel
        };

        await storage.addDeviceTelemetry(telemetryData);

        // Update device RSSI
        await storage.updateDeviceRSSI(device.macAddress, telemetry.rssi);

        // Update adaptive thresholds
        advancedSignalProcessor.updateAdaptiveThreshold(device.macAddress, telemetry.rssi);

      } catch (error) {
        console.error(`Failed to collect telemetry for device ${device.name}:`, error);
      }
    }
  }

  async disconnectAdapter(platformType: string): Promise<void> {
    const adapter = this.adapters.get(platformType);
    if (adapter) {
      adapter.disconnect();
      
      // Clear telemetry collection
      const interval = this.telemetryIntervals.get(platformType);
      if (interval) {
        clearInterval(interval);
        this.telemetryIntervals.delete(platformType);
      }
      
      console.log(`Disconnected from ${platformType}`);
    }
  }

  getConnectedPlatforms(): string[] {
    const connected: string[] = [];
    for (const [platformType, adapter] of this.adapters) {
      if (adapter.isConnected()) {
        connected.push(platformType);
      }
    }
    return connected;
  }

  isAdapterConnected(platformType: string): boolean {
    const adapter = this.adapters.get(platformType);
    return adapter ? adapter.isConnected() : false;
  }
}

/**
 * Enhanced Calibration System
 */
export class CalibrationSystem {
  private calibrationPoints: CalibrationPoint[] = [];
  private activeCalibration = false;
  private beaconDevice: string | null = null; // MAC address of phone/beacon

  async startCalibrationMode(beaconMac: string): Promise<void> {
    this.activeCalibration = true;
    this.beaconDevice = beaconMac;
    this.calibrationPoints = [];
    
    console.log(`🎯 Calibration mode started with beacon: ${beaconMac}`);
    console.log('Walk around with your beacon device and add calibration points');
  }

  async addCalibrationPoint(
    location: { x: number; y: number },
    roomId?: number,
    userConfidence: number = 1.0
  ): Promise<void> {
    if (!this.activeCalibration || !this.beaconDevice) {
      throw new Error('Calibration mode not active');
    }

    // Collect RSSI readings from all visible devices
    const beaconData = await this.collectBeaconReadings();
    
    const point: CalibrationPoint = {
      location,
      roomId,
      beaconData,
      userConfidence,
      timestamp: new Date()
    };

    this.calibrationPoints.push(point);
    
    // Add to fingerprint database
    await advancedSignalProcessor.addFingerprintPoint(
      location,
      beaconData,
      roomId
    );

    console.log(`📍 Added calibration point at (${location.x}, ${location.y}) with ${beaconData.size} device readings`);
  }

  async completeCalibration(): Promise<{
    pointCount: number;
    roomsDetected: number;
    averageConfidence: number;
  }> {
    if (!this.activeCalibration) {
      throw new Error('No active calibration session');
    }

    const pointCount = this.calibrationPoints.length;
    const roomsDetected = new Set(this.calibrationPoints.map(p => p.roomId).filter(Boolean)).size;
    const avgConfidence = this.calibrationPoints.reduce((sum, p) => sum + p.userConfidence, 0) / pointCount;

    // Auto-detect rooms if not manually specified
    if (roomsDetected === 0) {
      await this.autoDetectRooms();
    }

    // Generate scaling calibration
    await this.generateScalingCalibration();

    this.activeCalibration = false;
    this.beaconDevice = null;

    console.log(`✅ Calibration completed: ${pointCount} points, ${roomsDetected} rooms, ${avgConfidence.toFixed(2)} avg confidence`);

    return {
      pointCount,
      roomsDetected,
      averageConfidence: avgConfidence
    };
  }

  private async collectBeaconReadings(): Promise<Map<string, number>> {
    const readings = new Map<string, number>();

    try {
      // Use iwlist scan to get RSSI readings
      const { stdout } = await execAsync('iwlist scan 2>/dev/null | grep -E "(Address|Signal level)"');
      const lines = stdout.split('\n');

      let currentMac = '';
      for (const line of lines) {
        const macMatch = line.match(/Address: ([0-9A-Fa-f:]{17})/);
        if (macMatch) {
          currentMac = macMatch[1].toLowerCase();
        }

        const rssiMatch = line.match(/Signal level=(-?\d+)/);
        if (rssiMatch && currentMac) {
          readings.set(currentMac, parseInt(rssiMatch[1]));
          currentMac = '';
        }
      }
    } catch (error) {
      console.error('Failed to collect beacon readings:', error);
    }

    return readings;
  }

  private async autoDetectRooms(): Promise<void> {
    // Use K-means clustering on calibration points to detect rooms
    const points = this.calibrationPoints.map(p => [p.location.x, p.location.y]);
    
    if (points.length < 6) return; // Need minimum points for clustering

    const k = Math.min(4, Math.ceil(points.length / 3)); // Estimate room count
    const clusters = this.kMeansClustering(points, k);

    // Assign room IDs to calibration points
    for (let i = 0; i < this.calibrationPoints.length; i++) {
      const clusterIndex = clusters.assignments[i];
      this.calibrationPoints[i].roomId = clusterIndex + 1;
    }

    console.log(`🏠 Auto-detected ${k} rooms using clustering`);
  }

  private kMeansClustering(points: number[][], k: number): {
    centroids: number[][];
    assignments: number[];
  } {
    // Initialize centroids randomly
    let centroids: number[][] = [];
    for (let i = 0; i < k; i++) {
      const randomPoint = points[Math.floor(Math.random() * points.length)];
      centroids.push([...randomPoint]);
    }

    let assignments: number[] = new Array(points.length);
    let changed = true;
    let iterations = 0;

    while (changed && iterations < 100) {
      changed = false;
      
      // Assign points to nearest centroid
      for (let i = 0; i < points.length; i++) {
        let minDist = Infinity;
        let nearestCentroid = 0;
        
        for (let j = 0; j < centroids.length; j++) {
          const dist = Math.sqrt(
            Math.pow(points[i][0] - centroids[j][0], 2) + 
            Math.pow(points[i][1] - centroids[j][1], 2)
          );
          
          if (dist < minDist) {
            minDist = dist;
            nearestCentroid = j;
          }
        }
        
        if (assignments[i] !== nearestCentroid) {
          assignments[i] = nearestCentroid;
          changed = true;
        }
      }

      // Update centroids
      for (let j = 0; j < centroids.length; j++) {
        const clusterPoints = points.filter((_, i) => assignments[i] === j);
        
        if (clusterPoints.length > 0) {
          centroids[j] = [
            clusterPoints.reduce((sum, p) => sum + p[0], 0) / clusterPoints.length,
            clusterPoints.reduce((sum, p) => sum + p[1], 0) / clusterPoints.length
          ];
        }
      }

      iterations++;
    }

    return { centroids, assignments };
  }

  private async generateScalingCalibration(): Promise<void> {
    if (this.calibrationPoints.length < 2) return;

    // Find the two points that are farthest apart
    let maxDistance = 0;
    let point1: CalibrationPoint | null = null;
    let point2: CalibrationPoint | null = null;

    for (let i = 0; i < this.calibrationPoints.length; i++) {
      for (let j = i + 1; j < this.calibrationPoints.length; j++) {
        const p1 = this.calibrationPoints[i];
        const p2 = this.calibrationPoints[j];
        const distance = Math.sqrt(
          Math.pow(p1.location.x - p2.location.x, 2) + 
          Math.pow(p1.location.y - p2.location.y, 2)
        );

        if (distance > maxDistance) {
          maxDistance = distance;
          point1 = p1;
          point2 = p2;
        }
      }
    }

    if (point1 && point2 && maxDistance > 0) {
      // Assume this represents a typical room dimension (e.g., 4 meters)
      const estimatedRealDistance = 4.0; // meters
      const pixelsPerMeter = maxDistance / estimatedRealDistance;
      
      console.log(`📏 Estimated scaling: ${pixelsPerMeter.toFixed(1)} pixels per meter`);
      
      // Store scaling factor for future use
      // This would be saved to storage/configuration
    }
  }

  isCalibrating(): boolean {
    return this.activeCalibration;
  }

  getCalibrationProgress(): {
    pointCount: number;
    estimatedAccuracy: number;
    recommendedActions: string[];
  } {
    const pointCount = this.calibrationPoints.length;
    let estimatedAccuracy = Math.min(0.9, pointCount / 10); // More points = better accuracy
    
    const recommendations: string[] = [];
    
    if (pointCount < 5) {
      recommendations.push('Add more calibration points for better accuracy');
    }
    
    if (pointCount < 3) {
      estimatedAccuracy *= 0.5;
      recommendations.push('Minimum 3 points needed for triangulation');
    }

    const roomsWithPoints = new Set(this.calibrationPoints.map(p => p.roomId).filter(Boolean)).size;
    if (roomsWithPoints < 2) {
      recommendations.push('Add points in different rooms for multi-room mapping');
    }

    return {
      pointCount,
      estimatedAccuracy,
      recommendedActions: recommendations
    };
  }
}

export const deviceAdapterManager = new DeviceAdapterManager();
export const calibrationSystem = new CalibrationSystem();