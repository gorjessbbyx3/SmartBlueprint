// Device scanning utilities for smart home devices
export interface ScannedDevice {
  name: string;
  macAddress: string;
  deviceType: string;
  protocol: string;
  rssi: number;
  manufacturer?: string;
  model?: string;
}

export class DeviceScanner {
  private static instance: DeviceScanner;
  private scanning = false;
  private scanResults: ScannedDevice[] = [];

  static getInstance(): DeviceScanner {
    if (!DeviceScanner.instance) {
      DeviceScanner.instance = new DeviceScanner();
    }
    return DeviceScanner.instance;
  }

  async startScan(): Promise<ScannedDevice[]> {
    if (this.scanning) {
      throw new Error("Scan already in progress");
    }

    this.scanning = true;
    this.scanResults = [];

    try {
      // Browser security prevents direct network scanning
      // Require desktop agent for authentic device discovery
      await this.requestDesktopAgentScan();
      return this.scanResults;
    } finally {
      this.scanning = false;
    }
  }

  private async requestDesktopAgentScan(): Promise<void> {
    try {
      // Call server API which interfaces with desktop agent
      const response = await fetch('/api/device-discovery/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocols: ['mdns', 'ssdp', 'arp'],
          timeout: 10000
        })
      });

      if (!response.ok) {
        throw new Error('Desktop agent not available - network scanning requires local agent');
      }

      const data = await response.json();
      
      if (data.success && data.devices) {
        // Only use authentic devices discovered by desktop agent
        this.scanResults = data.devices.map((device: any) => ({
          name: device.name,
          macAddress: device.mac,
          deviceType: device.deviceType,
          protocol: device.protocol,
          rssi: device.rssi || -50,
          manufacturer: device.vendor,
          model: device.model
        }));
      } else {
        // No devices found - legitimate empty result
        this.scanResults = [];
      }
    } catch (error) {
      console.error('Network scan failed:', error);
      throw new Error('Network scanning requires desktop agent - please run desktop-agent-ping.js');
    }
  }

  isScanning(): boolean {
    return this.scanning;
  }

  getLastScanResults(): ScannedDevice[] {
    return [...this.scanResults];
  }

  // Device type detection based on common characteristics
  static detectDeviceType(name: string, manufacturer?: string): string {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('tv') || nameLower.includes('television')) {
      return 'smart_tv';
    }
    if (nameLower.includes('echo') || nameLower.includes('alexa') || nameLower.includes('speaker')) {
      return 'smart_speaker';
    }
    if (nameLower.includes('thermostat') || nameLower.includes('nest')) {
      return 'thermostat';
    }
    if (nameLower.includes('hue') || nameLower.includes('bridge')) {
      return 'hue_bridge';
    }
    if (nameLower.includes('light') || nameLower.includes('bulb')) {
      return 'smart_light';
    }
    if (nameLower.includes('plug') || nameLower.includes('outlet')) {
      return 'smart_plug';
    }
    if (nameLower.includes('camera') || nameLower.includes('cam')) {
      return 'security_camera';
    }
    if (nameLower.includes('doorbell')) {
      return 'doorbell';
    }
    if (nameLower.includes('fridge') || nameLower.includes('refrigerator')) {
      return 'smart_fridge';
    }
    
    return 'unknown_device';
  }

  // Protocol detection based on device characteristics
  static detectProtocol(name: string, rssi: number): string {
    const nameLower = name.toLowerCase();
    
    // Zigbee devices typically have specific naming patterns
    if (nameLower.includes('hue') || nameLower.includes('zigbee')) {
      return 'zigbee';
    }
    
    // Bluetooth LE devices typically have weaker signal strength
    if (rssi > -40 && (nameLower.includes('beacon') || nameLower.includes('tile'))) {
      return 'bluetooth';
    }
    
    // Default to Wi-Fi for most smart home devices
    return 'wifi';
  }
}

export const deviceScanner = DeviceScanner.getInstance();
