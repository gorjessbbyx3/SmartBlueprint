/**
 * Multi-Device Triangulation System
 *
 * Uses multiple devices (phones, tablets, smart speakers, etc.) placed around
 * the home as passive sensors. When someone moves through the space, their body
 * affects the WiFi signal strength between these devices and the router differently,
 * allowing us to triangulate approximate position and detect movement patterns.
 *
 * This works best with 3+ devices positioned in different areas of the home.
 */

import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface SensorDevice {
  id: string;
  name: string;
  ipAddress: string;
  macAddress?: string;
  location: {
    room: string;
    x: number; // Relative position (0-100)
    y: number;
  };
  lastRssi: number;
  baselineRssi: number;
  isActive: boolean;
  lastSeen: Date;
}

export interface TriangulationEvent {
  type: 'movement' | 'presence' | 'zone_entry' | 'zone_exit';
  estimatedPosition: { x: number; y: number };
  affectedZones: string[];
  confidence: number;
  sensorReadings: Map<string, number>;
  timestamp: Date;
}

interface Zone {
  id: string;
  name: string;
  bounds: { x1: number; y1: number; x2: number; y2: number };
  sensorIds: string[];
}

export class MultiDeviceTriangulation extends EventEmitter {
  private static instance: MultiDeviceTriangulation;
  private isRunning = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private pollIntervalMs = 3000; // Check every 3 seconds
  private sensors: Map<string, SensorDevice> = new Map();
  private zones: Map<string, Zone> = new Map();
  private lastPosition: { x: number; y: number } | null = null;
  private movementHistory: Array<{ position: { x: number; y: number }; timestamp: Date }> = [];
  private historyMaxLength = 20;
  private isLinux = process.platform === 'linux';

  // Triangulation parameters
  private signalChangeThreshold = 2; // dBm change to consider movement
  private baselineAdaptRate = 0.05; // Slow adaptation to environment changes

  private constructor() {
    super();
    this.initializeDefaultZones();
  }

  static getInstance(): MultiDeviceTriangulation {
    if (!MultiDeviceTriangulation.instance) {
      MultiDeviceTriangulation.instance = new MultiDeviceTriangulation();
    }
    return MultiDeviceTriangulation.instance;
  }

  private initializeDefaultZones(): void {
    // Default zones - can be customized per home
    this.zones.set('living-room', {
      id: 'living-room',
      name: 'Living Room',
      bounds: { x1: 0, y1: 0, x2: 50, y2: 50 },
      sensorIds: []
    });
    this.zones.set('kitchen', {
      id: 'kitchen',
      name: 'Kitchen',
      bounds: { x1: 50, y1: 0, x2: 100, y2: 50 },
      sensorIds: []
    });
    this.zones.set('bedroom', {
      id: 'bedroom',
      name: 'Bedroom',
      bounds: { x1: 0, y1: 50, x2: 50, y2: 100 },
      sensorIds: []
    });
    this.zones.set('bathroom', {
      id: 'bathroom',
      name: 'Bathroom',
      bounds: { x1: 50, y1: 50, x2: 100, y2: 100 },
      sensorIds: []
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[Triangulation] Already running');
      return;
    }

    console.log('[Triangulation] Starting multi-device triangulation...');

    // Load configured sensors
    await this.discoverSensors();

    this.isRunning = true;

    // Initial readings
    await this.pollSensorSignals();

    // Start polling
    this.pollInterval = setInterval(async () => {
      try {
        await this.pollSensorSignals();
        this.analyzeMovement();
      } catch (err: any) {
        console.error('[Triangulation] Poll error:', err.message);
      }
    }, this.pollIntervalMs);

    console.log('[Triangulation] Started with', this.sensors.size, 'sensors');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    console.log('[Triangulation] Stopped');
  }

  async addSensor(device: Omit<SensorDevice, 'lastRssi' | 'baselineRssi' | 'isActive' | 'lastSeen'>): Promise<void> {
    const sensor: SensorDevice = {
      ...device,
      lastRssi: -70,
      baselineRssi: -70,
      isActive: true,
      lastSeen: new Date()
    };

    this.sensors.set(device.id, sensor);

    // Add to zone's sensor list
    for (const zone of this.zones.values()) {
      if (this.isPositionInZone(device.location, zone)) {
        zone.sensorIds.push(device.id);
        break;
      }
    }

    console.log(`[Triangulation] Added sensor: ${device.name} in ${device.location.room}`);
  }

  removeSensor(sensorId: string): void {
    this.sensors.delete(sensorId);

    // Remove from zones
    for (const zone of this.zones.values()) {
      zone.sensorIds = zone.sensorIds.filter(id => id !== sensorId);
    }
  }

  async discoverSensors(): Promise<void> {
    if (!this.isLinux) {
      // Add simulated sensors for development
      this.addSimulatedSensors();
      return;
    }

    try {
      // Discover devices on the network
      const { stdout } = await execAsync(
        'arp -a 2>/dev/null || cat /proc/net/arp 2>/dev/null || true',
        { timeout: 5000 }
      );

      const lines = stdout.split('\n');
      let sensorCount = 0;

      for (const line of lines) {
        // Parse ARP output: hostname (ip) at mac [ether] on interface
        const match = line.match(/\((\d+\.\d+\.\d+\.\d+)\)\s+at\s+([0-9a-f:]{17})/i) ||
          line.match(/(\d+\.\d+\.\d+\.\d+)\s+.*\s+([0-9a-f:]{17})/i);

        if (match) {
          const ip = match[1];
          const mac = match[2].toLowerCase();

          // Auto-add as sensor with estimated position
          const gridPos = this.calculateGridPosition(sensorCount);
          const sensor: SensorDevice = {
            id: mac,
            name: `Device ${ip}`,
            ipAddress: ip,
            macAddress: mac,
            location: {
              room: 'Unknown',
              x: gridPos.x,
              y: gridPos.y
            },
            lastRssi: -70,
            baselineRssi: -70,
            isActive: true,
            lastSeen: new Date()
          };

          this.sensors.set(mac, sensor);
          sensorCount++;
        }
      }

      console.log(`[Triangulation] Discovered ${sensorCount} potential sensors`);
    } catch (error) {
      console.error('[Triangulation] Discovery error:', error);
    }
  }

  private addSimulatedSensors(): void {
    // Add some simulated sensors for development/testing
    const simulatedDevices = [
      { id: 'sim-1', name: 'Living Room TV', room: 'Living Room', x: 25, y: 25 },
      { id: 'sim-2', name: 'Kitchen Speaker', room: 'Kitchen', x: 75, y: 25 },
      { id: 'sim-3', name: 'Bedroom Phone', room: 'Bedroom', x: 25, y: 75 },
      { id: 'sim-4', name: 'Office Laptop', room: 'Office', x: 75, y: 75 }
    ];

    for (const device of simulatedDevices) {
      this.sensors.set(device.id, {
        id: device.id,
        name: device.name,
        ipAddress: `192.168.1.${10 + simulatedDevices.indexOf(device)}`,
        location: {
          room: device.room,
          x: device.x,
          y: device.y
        },
        lastRssi: -60 - Math.random() * 20,
        baselineRssi: -65,
        isActive: true,
        lastSeen: new Date()
      });
    }

    console.log('[Triangulation] Added', simulatedDevices.length, 'simulated sensors');
  }

  private calculateGridPosition(index: number): { x: number; y: number } {
    // Distribute sensors in a grid pattern
    const cols = 3;
    const col = index % cols;
    const row = Math.floor(index / cols);

    return {
      x: (col + 0.5) * (100 / cols),
      y: (row + 0.5) * 33 + 16
    };
  }

  private async pollSensorSignals(): Promise<void> {
    const now = new Date();

    for (const sensor of this.sensors.values()) {
      const rssi = await this.getSensorSignal(sensor);

      if (rssi !== null) {
        // Update baseline with exponential moving average
        sensor.baselineRssi = this.baselineAdaptRate * rssi +
          (1 - this.baselineAdaptRate) * sensor.baselineRssi;

        sensor.lastRssi = rssi;
        sensor.lastSeen = now;
        sensor.isActive = true;
      } else {
        // Check if sensor is stale
        const staleness = now.getTime() - sensor.lastSeen.getTime();
        if (staleness > 30000) { // 30 seconds
          sensor.isActive = false;
        }
      }
    }
  }

  private async getSensorSignal(sensor: SensorDevice): Promise<number | null> {
    if (!this.isLinux) {
      return this.getSimulatedSignal(sensor);
    }

    try {
      // Try to get signal strength via ping RTT (rough proxy for signal quality)
      const { stdout } = await execAsync(
        `ping -c 1 -W 1 ${sensor.ipAddress} 2>/dev/null | grep 'time=' || true`,
        { timeout: 2000 }
      );

      const match = stdout.match(/time[=<](\d+\.?\d*)/);
      if (match) {
        // Convert RTT to pseudo-RSSI (lower RTT = stronger signal)
        const rtt = parseFloat(match[1]);
        // Map RTT (1-100ms) to RSSI (-40 to -90 dBm)
        const rssi = -40 - (Math.min(rtt, 100) / 100) * 50;
        return rssi;
      }

      // If device is reachable but no time, assume moderate signal
      if (stdout.includes('bytes from')) {
        return -65;
      }

      return null;
    } catch {
      return null;
    }
  }

  private getSimulatedSignal(sensor: SensorDevice): number {
    // Simulate natural variation
    const variation = (Math.random() - 0.5) * 4;
    let rssi = sensor.baselineRssi + variation;

    // Occasionally simulate movement affecting signal
    if (Math.random() < 0.15) {
      rssi -= 3 + Math.random() * 5;
    }

    return rssi;
  }

  private analyzeMovement(): void {
    const activeSensors = Array.from(this.sensors.values()).filter(s => s.isActive);

    if (activeSensors.length < 2) {
      return; // Need at least 2 sensors for triangulation
    }

    // Calculate signal deviations from baseline
    const deviations: Map<string, number> = new Map();
    let significantChanges = 0;

    for (const sensor of activeSensors) {
      const deviation = sensor.baselineRssi - sensor.lastRssi;
      deviations.set(sensor.id, deviation);

      if (Math.abs(deviation) > this.signalChangeThreshold) {
        significantChanges++;
      }
    }

    // If significant changes detected, estimate position
    if (significantChanges > 0) {
      const position = this.triangulatePosition(activeSensors, deviations);
      const affectedZones = this.getZonesAtPosition(position);

      // Detect zone transitions
      const previousZones = this.lastPosition ?
        this.getZonesAtPosition(this.lastPosition) : [];

      const enteredZones = affectedZones.filter(z => !previousZones.includes(z));
      const exitedZones = previousZones.filter(z => !affectedZones.includes(z));

      // Calculate confidence based on sensor agreement
      const confidence = this.calculateConfidence(deviations, significantChanges, activeSensors.length);

      if (confidence > 0.3) {
        // Store position in history
        this.movementHistory.push({ position, timestamp: new Date() });
        if (this.movementHistory.length > this.historyMaxLength) {
          this.movementHistory.shift();
        }

        // Emit appropriate events
        if (enteredZones.length > 0) {
          this.emit('triangulation', {
            type: 'zone_entry',
            estimatedPosition: position,
            affectedZones: enteredZones,
            confidence,
            sensorReadings: deviations,
            timestamp: new Date()
          } as TriangulationEvent);
        }

        if (exitedZones.length > 0) {
          this.emit('triangulation', {
            type: 'zone_exit',
            estimatedPosition: position,
            affectedZones: exitedZones,
            confidence,
            sensorReadings: deviations,
            timestamp: new Date()
          } as TriangulationEvent);
        }

        if (enteredZones.length === 0 && exitedZones.length === 0) {
          this.emit('triangulation', {
            type: 'movement',
            estimatedPosition: position,
            affectedZones,
            confidence,
            sensorReadings: deviations,
            timestamp: new Date()
          } as TriangulationEvent);
        }

        this.lastPosition = position;
      }
    }
  }

  private triangulatePosition(
    sensors: SensorDevice[],
    deviations: Map<string, number>
  ): { x: number; y: number } {
    // Weighted centroid calculation
    // Sensors with larger signal drops are weighted more heavily
    let totalWeight = 0;
    let weightedX = 0;
    let weightedY = 0;

    for (const sensor of sensors) {
      const deviation = deviations.get(sensor.id) || 0;

      if (deviation > 0) {
        // Signal dropped - person is near this sensor
        const weight = Math.pow(deviation, 1.5); // Emphasize larger drops
        weightedX += sensor.location.x * weight;
        weightedY += sensor.location.y * weight;
        totalWeight += weight;
      }
    }

    if (totalWeight === 0) {
      // No significant drops - return center
      return { x: 50, y: 50 };
    }

    return {
      x: weightedX / totalWeight,
      y: weightedY / totalWeight
    };
  }

  private calculateConfidence(
    deviations: Map<string, number>,
    significantChanges: number,
    totalSensors: number
  ): number {
    let confidence = 0;

    // More sensors affected = higher confidence
    const affectedRatio = significantChanges / totalSensors;
    confidence += affectedRatio * 0.4;

    // Consistent direction of changes = higher confidence
    const deviationValues = Array.from(deviations.values()).filter(d => Math.abs(d) > 1);
    const positiveDeviations = deviationValues.filter(d => d > 0).length;
    const consistencyRatio = Math.max(positiveDeviations, deviationValues.length - positiveDeviations) /
      Math.max(deviationValues.length, 1);
    confidence += consistencyRatio * 0.3;

    // Magnitude of changes
    const avgDeviation = deviationValues.reduce((sum, d) => sum + Math.abs(d), 0) /
      Math.max(deviationValues.length, 1);
    if (avgDeviation > 3) confidence += 0.1;
    if (avgDeviation > 5) confidence += 0.1;
    if (avgDeviation > 8) confidence += 0.1;

    return Math.min(1, confidence);
  }

  private isPositionInZone(position: { x: number; y: number; room?: string }, zone: Zone): boolean {
    return position.x >= zone.bounds.x1 &&
      position.x <= zone.bounds.x2 &&
      position.y >= zone.bounds.y1 &&
      position.y <= zone.bounds.y2;
  }

  private getZonesAtPosition(position: { x: number; y: number }): string[] {
    const zones: string[] = [];
    for (const zone of this.zones.values()) {
      if (this.isPositionInZone(position, zone)) {
        zones.push(zone.name);
      }
    }
    return zones;
  }

  // Public getters
  getSensors(): SensorDevice[] {
    return Array.from(this.sensors.values());
  }

  getActiveSensors(): SensorDevice[] {
    return Array.from(this.sensors.values()).filter(s => s.isActive);
  }

  getZones(): Zone[] {
    return Array.from(this.zones.values());
  }

  getMovementHistory(): Array<{ position: { x: number; y: number }; timestamp: Date }> {
    return [...this.movementHistory];
  }

  getLastPosition(): { x: number; y: number } | null {
    return this.lastPosition;
  }

  isRunningStatus(): boolean {
    return this.isRunning;
  }

  // Configuration methods
  updateSensorLocation(sensorId: string, location: { room: string; x: number; y: number }): void {
    const sensor = this.sensors.get(sensorId);
    if (sensor) {
      sensor.location = location;
      console.log(`[Triangulation] Updated sensor ${sensor.name} location to ${location.room}`);
    }
  }

  addZone(zone: Zone): void {
    this.zones.set(zone.id, zone);
    console.log(`[Triangulation] Added zone: ${zone.name}`);
  }

  removeZone(zoneId: string): void {
    this.zones.delete(zoneId);
  }
}

export const multiDeviceTriangulation = MultiDeviceTriangulation.getInstance();
