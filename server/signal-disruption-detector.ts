/**
 * WiFi Signal Disruption Detector
 *
 * Detects human presence by monitoring WiFi signal strength (RSSI) changes.
 * When a person walks between the router and devices, their body blocks/absorbs
 * some of the WiFi signal, causing a temporary drop in RSSI (typically 3-8 dBm).
 *
 * This is a passive detection method that works with standard routers and devices.
 */

import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface SignalReading {
  deviceMac: string;
  deviceName: string;
  rssi: number;
  timestamp: Date;
  interface?: string;
}

export interface DisruptionEvent {
  type: 'disruption_detected' | 'movement_detected' | 'presence_detected';
  affectedDevices: string[];
  rssiDrops: Map<string, number>;
  confidence: number; // 0-1 based on number of devices affected and drop magnitude
  timestamp: Date;
  location?: string; // Estimated location based on affected devices
}

interface DeviceSignalHistory {
  mac: string;
  name: string;
  readings: SignalReading[];
  baseline: number;
  variance: number;
  lastReading: number;
  lastUpdate: Date;
}

export class SignalDisruptionDetector extends EventEmitter {
  private static instance: SignalDisruptionDetector;
  private isRunning = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private pollIntervalMs = 2000; // Poll every 2 seconds for responsiveness
  private signalHistory: Map<string, DeviceSignalHistory> = new Map();
  private historyWindowSize = 30; // Keep last 30 readings (~1 minute of history)
  private disruptionThreshold = 3; // dBm drop to consider a disruption
  private isLinux = process.platform === 'linux';
  private networkInterface = 'wlan0';

  // Moving average parameters for baseline
  private baselineAlpha = 0.1; // Slow adaptation for baseline
  private varianceAlpha = 0.2; // Faster adaptation for variance

  private constructor() {
    super();
  }

  static getInstance(): SignalDisruptionDetector {
    if (!SignalDisruptionDetector.instance) {
      SignalDisruptionDetector.instance = new SignalDisruptionDetector();
    }
    return SignalDisruptionDetector.instance;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[SignalDisruption] Detector already running');
      return;
    }

    console.log('[SignalDisruption] Starting signal disruption detector...');

    // Detect network interface
    await this.detectNetworkInterface();

    this.isRunning = true;

    // Initial readings
    await this.pollSignalStrengths();

    // Start polling
    this.pollInterval = setInterval(async () => {
      try {
        await this.pollSignalStrengths();
        this.analyzeSignalPatterns();
      } catch (err: any) {
        console.error('[SignalDisruption] Poll error:', err.message);
      }
    }, this.pollIntervalMs);

    console.log('[SignalDisruption] Detector started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    console.log('[SignalDisruption] Detector stopped');
  }

  private async detectNetworkInterface(): Promise<void> {
    if (!this.isLinux) return;

    try {
      // Find wireless interface
      const { stdout } = await execAsync('iw dev 2>/dev/null | grep Interface | head -1 | awk \'{print $2}\'');
      const iface = stdout.trim();
      if (iface) {
        this.networkInterface = iface;
        console.log(`[SignalDisruption] Using interface: ${this.networkInterface}`);
      }
    } catch {
      // Keep default wlan0
    }
  }

  private async pollSignalStrengths(): Promise<void> {
    const readings = await this.getSignalReadings();

    for (const reading of readings) {
      this.updateDeviceHistory(reading);
    }
  }

  private async getSignalReadings(): Promise<SignalReading[]> {
    if (this.isLinux) {
      return this.getLinuxSignalReadings();
    }
    return this.getSimulatedReadings();
  }

  private async getLinuxSignalReadings(): Promise<SignalReading[]> {
    const readings: SignalReading[] = [];
    const now = new Date();

    try {
      // Method 1: Get connected station info (if running as AP)
      try {
        const { stdout: stationDump } = await execAsync(
          `iw dev ${this.networkInterface} station dump 2>/dev/null || true`
        );

        const stationBlocks = stationDump.split('Station ').slice(1);
        for (const block of stationBlocks) {
          const macMatch = block.match(/^([0-9a-f:]{17})/i);
          const signalMatch = block.match(/signal:\s*(-\d+)/);

          if (macMatch && signalMatch) {
            readings.push({
              deviceMac: macMatch[1].toLowerCase(),
              deviceName: 'WiFi Station',
              rssi: parseInt(signalMatch[1]),
              timestamp: now,
              interface: this.networkInterface
            });
          }
        }
      } catch {
        // Not running as AP, try other methods
      }

      // Method 2: Scan for nearby access points and their signal strengths
      try {
        const { stdout: scanResult } = await execAsync(
          `iwlist ${this.networkInterface} scan 2>/dev/null | grep -E 'Address:|Signal level' || true`,
          { timeout: 10000 }
        );

        const lines = scanResult.split('\n');
        let currentMac = '';

        for (const line of lines) {
          const macMatch = line.match(/Address:\s*([0-9A-Fa-f:]{17})/);
          const signalMatch = line.match(/Signal level[=:]?\s*(-?\d+)/);

          if (macMatch) {
            currentMac = macMatch[1].toLowerCase();
          }
          if (signalMatch && currentMac) {
            readings.push({
              deviceMac: currentMac,
              deviceName: 'Access Point',
              rssi: parseInt(signalMatch[1]),
              timestamp: now,
              interface: this.networkInterface
            });
            currentMac = '';
          }
        }
      } catch {
        // Scan might fail without root
      }

      // Method 3: Check connection to current AP
      try {
        const { stdout: linkInfo } = await execAsync(
          `iw dev ${this.networkInterface} link 2>/dev/null || true`
        );

        const macMatch = linkInfo.match(/Connected to ([0-9a-f:]{17})/i);
        const signalMatch = linkInfo.match(/signal:\s*(-\d+)/);

        if (macMatch && signalMatch) {
          // Check if we already have this reading
          const mac = macMatch[1].toLowerCase();
          if (!readings.find(r => r.deviceMac === mac)) {
            readings.push({
              deviceMac: mac,
              deviceName: 'Connected AP',
              rssi: parseInt(signalMatch[1]),
              timestamp: now,
              interface: this.networkInterface
            });
          }
        }
      } catch {
        // No connection info available
      }

      // Method 4: Get signal from /proc/net/wireless
      try {
        const { stdout: procWireless } = await execAsync(
          'cat /proc/net/wireless 2>/dev/null || true'
        );

        const lines = procWireless.split('\n');
        for (const line of lines) {
          if (line.includes(this.networkInterface)) {
            const match = line.match(/-?\d+\./g);
            if (match && match.length >= 2) {
              const signal = parseInt(match[1]);
              if (signal < 0) {
                readings.push({
                  deviceMac: 'current-connection',
                  deviceName: 'Current WiFi',
                  rssi: signal,
                  timestamp: now,
                  interface: this.networkInterface
                });
              }
            }
          }
        }
      } catch {
        // /proc/net/wireless not available
      }

    } catch (error) {
      console.error('[SignalDisruption] Error getting readings:', error);
    }

    return readings;
  }

  private getSimulatedReadings(): SignalReading[] {
    const now = new Date();
    const readings: SignalReading[] = [];

    // Simulate a few devices with some natural variation
    const devices = [
      { mac: '11:22:33:44:55:66', name: 'Living Room Router', baseRssi: -45 },
      { mac: '22:33:44:55:66:77', name: 'Kitchen AP', baseRssi: -55 },
      { mac: '33:44:55:66:77:88', name: 'Bedroom Repeater', baseRssi: -60 }
    ];

    // Occasionally simulate a disruption (person walking through)
    const simulateDisruption = Math.random() < 0.1; // 10% chance
    const disruptionTarget = Math.floor(Math.random() * devices.length);

    for (let i = 0; i < devices.length; i++) {
      const device = devices[i];
      let rssi = device.baseRssi;

      // Natural variation (-2 to +2 dBm)
      rssi += (Math.random() - 0.5) * 4;

      // Apply disruption if this is the target
      if (simulateDisruption && i === disruptionTarget) {
        rssi -= 4 + Math.random() * 4; // 4-8 dBm drop
      }

      readings.push({
        deviceMac: device.mac,
        deviceName: device.name,
        rssi: Math.round(rssi),
        timestamp: now
      });
    }

    return readings;
  }

  private updateDeviceHistory(reading: SignalReading): void {
    let history = this.signalHistory.get(reading.deviceMac);

    if (!history) {
      // New device
      history = {
        mac: reading.deviceMac,
        name: reading.deviceName,
        readings: [],
        baseline: reading.rssi,
        variance: 2, // Start with reasonable variance
        lastReading: reading.rssi,
        lastUpdate: reading.timestamp
      };
      this.signalHistory.set(reading.deviceMac, history);
    }

    // Add reading to history
    history.readings.push(reading);
    if (history.readings.length > this.historyWindowSize) {
      history.readings.shift();
    }

    // Update exponential moving average baseline
    const oldBaseline = history.baseline;
    history.baseline = this.baselineAlpha * reading.rssi + (1 - this.baselineAlpha) * history.baseline;

    // Update variance estimate
    const deviation = Math.abs(reading.rssi - oldBaseline);
    history.variance = this.varianceAlpha * deviation + (1 - this.varianceAlpha) * history.variance;

    history.lastReading = reading.rssi;
    history.lastUpdate = reading.timestamp;
  }

  private analyzeSignalPatterns(): void {
    const now = Date.now();
    const affectedDevices: string[] = [];
    const rssiDrops = new Map<string, number>();

    for (const [mac, history] of this.signalHistory.entries()) {
      // Skip if data is stale
      if (now - history.lastUpdate.getTime() > 10000) continue;

      // Calculate drop from baseline
      const drop = history.baseline - history.lastReading;

      // Check if drop exceeds threshold and is significant compared to normal variance
      if (drop > this.disruptionThreshold && drop > history.variance * 1.5) {
        affectedDevices.push(mac);
        rssiDrops.set(mac, drop);
      }
    }

    // If multiple devices show drops simultaneously, high confidence of presence
    if (affectedDevices.length > 0) {
      const confidence = this.calculateConfidence(affectedDevices.length, rssiDrops);

      if (confidence > 0.3) { // Only emit if reasonably confident
        const event: DisruptionEvent = {
          type: affectedDevices.length >= 2 ? 'presence_detected' : 'movement_detected',
          affectedDevices,
          rssiDrops,
          confidence,
          timestamp: new Date(),
          location: this.estimateLocation(affectedDevices)
        };

        this.emit('disruption', event);
        console.log(`[SignalDisruption] ${event.type}: ${affectedDevices.length} devices affected, confidence: ${(confidence * 100).toFixed(0)}%`);
      }
    }
  }

  private calculateConfidence(deviceCount: number, drops: Map<string, number>): number {
    let confidence = 0;

    // More devices affected = higher confidence
    if (deviceCount === 1) confidence += 0.3;
    else if (deviceCount === 2) confidence += 0.5;
    else if (deviceCount >= 3) confidence += 0.7;

    // Larger drops = higher confidence
    let totalDrop = 0;
    for (const drop of drops.values()) {
      totalDrop += drop;
    }
    const avgDrop = totalDrop / deviceCount;

    if (avgDrop >= 3) confidence += 0.1;
    if (avgDrop >= 5) confidence += 0.1;
    if (avgDrop >= 7) confidence += 0.1;

    return Math.min(1, confidence);
  }

  private estimateLocation(affectedDevices: string[]): string {
    // In a real implementation, this would use device locations
    // For now, return based on which devices are affected
    if (affectedDevices.length === 0) return 'Unknown';

    const deviceNames = affectedDevices
      .map(mac => this.signalHistory.get(mac)?.name || mac)
      .join(', ');

    return `Near: ${deviceNames}`;
  }

  getDeviceSignalHistory(mac: string): SignalReading[] {
    return this.signalHistory.get(mac)?.readings || [];
  }

  getAllDeviceBaselines(): Map<string, { baseline: number; variance: number; lastReading: number }> {
    const result = new Map();
    for (const [mac, history] of this.signalHistory.entries()) {
      result.set(mac, {
        baseline: history.baseline,
        variance: history.variance,
        lastReading: history.lastReading
      });
    }
    return result;
  }

  isRunningStatus(): boolean {
    return this.isRunning;
  }

  setDisruptionThreshold(threshold: number): void {
    this.disruptionThreshold = threshold;
    console.log(`[SignalDisruption] Threshold set to ${threshold} dBm`);
  }

  setPollInterval(intervalMs: number): void {
    if (intervalMs < 500) intervalMs = 500; // Minimum 500ms
    this.pollIntervalMs = intervalMs;

    // Restart polling if running
    if (this.isRunning && this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = setInterval(async () => {
        try {
          await this.pollSignalStrengths();
          this.analyzeSignalPatterns();
        } catch (err: any) {
          console.error('[SignalDisruption] Poll error:', err.message);
        }
      }, this.pollIntervalMs);
    }

    console.log(`[SignalDisruption] Poll interval set to ${intervalMs}ms`);
  }
}

export const signalDisruptionDetector = SignalDisruptionDetector.getInstance();
