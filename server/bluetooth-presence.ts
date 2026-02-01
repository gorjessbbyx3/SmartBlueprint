/**
 * Bluetooth Presence Detection for Raspberry Pi
 *
 * Uses the Pi's built-in Bluetooth to scan for known devices (phones, wearables)
 * to detect when residents are home. This is the most reliable method for
 * presence detection as phones typically have Bluetooth enabled.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import { storage } from './storage';

const execAsync = promisify(exec);

export interface BluetoothDevice {
  macAddress: string;
  name: string;
  rssi: number;
  lastSeen: Date;
  deviceClass?: string;
  isResident: boolean;
  residentId?: number;
}

export interface PresenceEvent {
  type: 'arrived' | 'departed' | 'detected';
  deviceMac: string;
  deviceName: string;
  residentId?: number;
  rssi?: number;
  timestamp: Date;
}

interface ScanResult {
  mac: string;
  name: string;
  rssi: number;
  deviceClass?: string;
}

export class BluetoothPresenceScanner extends EventEmitter {
  private static instance: BluetoothPresenceScanner;
  private isRunning = false;
  private scanInterval: NodeJS.Timeout | null = null;
  private knownDevices: Map<string, BluetoothDevice> = new Map();
  private residentDeviceMacs: Set<string> = new Set();
  private lastSeenThreshold = 300000; // 5 minutes - consider "departed" if not seen
  private scanIntervalMs = 15000; // Scan every 15 seconds
  private isLinux = process.platform === 'linux';

  private constructor() {
    super();
  }

  static getInstance(): BluetoothPresenceScanner {
    if (!BluetoothPresenceScanner.instance) {
      BluetoothPresenceScanner.instance = new BluetoothPresenceScanner();
    }
    return BluetoothPresenceScanner.instance;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[Bluetooth] Scanner already running');
      return;
    }

    console.log('[Bluetooth] Starting presence scanner...');

    // Load resident devices from storage
    await this.loadResidentDevices();

    // Check if Bluetooth is available
    const btAvailable = await this.checkBluetoothAvailable();
    if (!btAvailable) {
      console.log('[Bluetooth] Bluetooth not available, running in simulation mode');
    }

    this.isRunning = true;

    // Initial scan
    await this.performScan();

    // Set up periodic scanning
    this.scanInterval = setInterval(() => {
      this.performScan().catch(err => {
        console.error('[Bluetooth] Scan error:', err.message);
      });
    }, this.scanIntervalMs);

    // Check for departed devices periodically
    setInterval(() => {
      this.checkDepartedDevices();
    }, 60000); // Check every minute

    console.log('[Bluetooth] Presence scanner started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }

    console.log('[Bluetooth] Presence scanner stopped');
  }

  private async loadResidentDevices(): Promise<void> {
    try {
      const devices = await storage.getResidentDevices();
      this.residentDeviceMacs.clear();

      for (const device of devices) {
        if (device.macAddress && device.isActive) {
          this.residentDeviceMacs.add(device.macAddress.toLowerCase());
        }
      }

      console.log(`[Bluetooth] Loaded ${this.residentDeviceMacs.size} resident device MACs`);
    } catch (error) {
      console.error('[Bluetooth] Failed to load resident devices:', error);
    }
  }

  async registerResidentDevice(macAddress: string, residentId: number, deviceName: string): Promise<void> {
    const mac = macAddress.toLowerCase();
    this.residentDeviceMacs.add(mac);

    // Update known device if already seen
    const existing = this.knownDevices.get(mac);
    if (existing) {
      existing.isResident = true;
      existing.residentId = residentId;
    }

    console.log(`[Bluetooth] Registered resident device: ${deviceName} (${mac})`);
  }

  private async checkBluetoothAvailable(): Promise<boolean> {
    if (!this.isLinux) {
      return false;
    }

    try {
      await execAsync('which hcitool');
      await execAsync('hciconfig hci0 up 2>/dev/null || true');
      return true;
    } catch {
      return false;
    }
  }

  private async performScan(): Promise<void> {
    const scanResults = await this.scanForDevices();

    for (const result of scanResults) {
      await this.processDiscoveredDevice(result);
    }
  }

  private async scanForDevices(): Promise<ScanResult[]> {
    const results: ScanResult[] = [];

    if (this.isLinux) {
      // Try BLE scan first (more reliable for phones)
      const bleResults = await this.scanBLE();
      results.push(...bleResults);

      // Also do classic Bluetooth scan
      const classicResults = await this.scanClassic();
      results.push(...classicResults);
    } else {
      // Simulation mode for non-Linux systems
      results.push(...this.getSimulatedDevices());
    }

    return results;
  }

  private async scanBLE(): Promise<ScanResult[]> {
    const results: ScanResult[] = [];

    try {
      // Use hcitool lescan with timeout
      // Note: This requires root privileges
      const { stdout } = await execAsync(
        'timeout 5 hcitool lescan --duplicates 2>/dev/null || true',
        { timeout: 10000 }
      );

      // Parse BLE scan results
      const lines = stdout.split('\n');
      for (const line of lines) {
        const match = line.match(/([0-9A-Fa-f:]{17})\s+(.+)/);
        if (match) {
          results.push({
            mac: match[1].toLowerCase(),
            name: match[2].trim() || 'Unknown BLE Device',
            rssi: -70, // BLE scan doesn't give RSSI directly
            deviceClass: 'BLE'
          });
        }
      }
    } catch (error) {
      // BLE scan might fail without root - try alternative
      try {
        const { stdout } = await execAsync(
          'bluetoothctl --timeout 5 scan on 2>/dev/null; sleep 3; bluetoothctl devices 2>/dev/null || true',
          { timeout: 15000 }
        );

        const lines = stdout.split('\n');
        for (const line of lines) {
          const match = line.match(/Device\s+([0-9A-Fa-f:]{17})\s+(.+)/);
          if (match) {
            results.push({
              mac: match[1].toLowerCase(),
              name: match[2].trim(),
              rssi: -70,
              deviceClass: 'BLE'
            });
          }
        }
      } catch {
        // Silently fail if bluetooth is not available
      }
    }

    return results;
  }

  private async scanClassic(): Promise<ScanResult[]> {
    const results: ScanResult[] = [];

    try {
      // Classic Bluetooth inquiry scan
      const { stdout } = await execAsync(
        'hcitool inq --flush 2>/dev/null || true',
        { timeout: 15000 }
      );

      const lines = stdout.split('\n');
      for (const line of lines) {
        const match = line.match(/([0-9A-Fa-f:]{17})/);
        if (match) {
          const mac = match[1].toLowerCase();

          // Get device name
          let name = 'Unknown Device';
          try {
            const { stdout: nameOut } = await execAsync(
              `hcitool name ${mac} 2>/dev/null || echo "Unknown"`,
              { timeout: 5000 }
            );
            name = nameOut.trim() || 'Unknown Device';
          } catch {
            // Keep default name
          }

          // Get RSSI if possible
          let rssi = -70;
          try {
            const { stdout: rssiOut } = await execAsync(
              `hcitool rssi ${mac} 2>/dev/null || echo "-70"`,
              { timeout: 3000 }
            );
            const rssiMatch = rssiOut.match(/-?\d+/);
            if (rssiMatch) {
              rssi = parseInt(rssiMatch[0]);
            }
          } catch {
            // Keep default RSSI
          }

          results.push({ mac, name, rssi, deviceClass: 'Classic' });
        }
      }
    } catch {
      // Classic scan not available
    }

    return results;
  }

  private getSimulatedDevices(): ScanResult[] {
    // Simulation mode for development/testing
    // Returns some devices occasionally to simulate presence
    const now = Date.now();
    const devices: ScanResult[] = [];

    // Simulate a phone being detected sometimes
    if (Math.random() > 0.3) {
      devices.push({
        mac: 'aa:bb:cc:dd:ee:ff',
        name: 'Simulated Phone',
        rssi: -60 + Math.floor(Math.random() * 20),
        deviceClass: 'Simulated'
      });
    }

    return devices;
  }

  private async processDiscoveredDevice(scan: ScanResult): Promise<void> {
    const mac = scan.mac.toLowerCase();
    const now = new Date();
    const isResident = this.residentDeviceMacs.has(mac);

    // Get resident ID if this is a known device
    let residentId: number | undefined;
    if (isResident) {
      try {
        const residentDevice = await storage.getResidentDeviceByMac(mac);
        residentId = residentDevice?.residentId;
      } catch {
        // Continue without resident ID
      }
    }

    const existing = this.knownDevices.get(mac);

    if (!existing) {
      // New device detected
      const device: BluetoothDevice = {
        macAddress: mac,
        name: scan.name,
        rssi: scan.rssi,
        lastSeen: now,
        deviceClass: scan.deviceClass,
        isResident,
        residentId
      };

      this.knownDevices.set(mac, device);

      if (isResident) {
        // Resident arrived!
        this.emit('presence', {
          type: 'arrived',
          deviceMac: mac,
          deviceName: scan.name,
          residentId,
          rssi: scan.rssi,
          timestamp: now
        } as PresenceEvent);

        console.log(`[Bluetooth] Resident arrived: ${scan.name} (${mac})`);
      } else {
        // Unknown device detected
        this.emit('presence', {
          type: 'detected',
          deviceMac: mac,
          deviceName: scan.name,
          rssi: scan.rssi,
          timestamp: now
        } as PresenceEvent);
      }
    } else {
      // Update existing device
      const wasAway = (now.getTime() - existing.lastSeen.getTime()) > this.lastSeenThreshold;

      existing.lastSeen = now;
      existing.rssi = scan.rssi;
      existing.name = scan.name || existing.name;

      if (wasAway && isResident) {
        // Resident returned after being away
        this.emit('presence', {
          type: 'arrived',
          deviceMac: mac,
          deviceName: existing.name,
          residentId: existing.residentId,
          rssi: scan.rssi,
          timestamp: now
        } as PresenceEvent);

        console.log(`[Bluetooth] Resident returned: ${existing.name}`);
      }
    }
  }

  private checkDepartedDevices(): void {
    const now = Date.now();

    for (const [mac, device] of this.knownDevices.entries()) {
      const timeSinceLastSeen = now - device.lastSeen.getTime();

      if (timeSinceLastSeen > this.lastSeenThreshold && device.isResident) {
        // Resident departed
        this.emit('presence', {
          type: 'departed',
          deviceMac: mac,
          deviceName: device.name,
          residentId: device.residentId,
          timestamp: new Date()
        } as PresenceEvent);

        console.log(`[Bluetooth] Resident departed: ${device.name}`);

        // Remove from known devices so arrival is detected again
        this.knownDevices.delete(mac);
      }
    }
  }

  getKnownDevices(): BluetoothDevice[] {
    return Array.from(this.knownDevices.values());
  }

  getResidentsPresent(): BluetoothDevice[] {
    const now = Date.now();
    return Array.from(this.knownDevices.values()).filter(device => {
      if (!device.isResident) return false;
      const timeSinceLastSeen = now - device.lastSeen.getTime();
      return timeSinceLastSeen < this.lastSeenThreshold;
    });
  }

  isResidentPresent(residentId: number): boolean {
    const now = Date.now();
    for (const device of this.knownDevices.values()) {
      if (device.residentId === residentId) {
        const timeSinceLastSeen = now - device.lastSeen.getTime();
        if (timeSinceLastSeen < this.lastSeenThreshold) {
          return true;
        }
      }
    }
    return false;
  }

  isRunningStatus(): boolean {
    return this.isRunning;
  }
}

export const bluetoothPresence = BluetoothPresenceScanner.getInstance();
