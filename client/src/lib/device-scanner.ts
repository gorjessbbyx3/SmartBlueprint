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
      // Simulate device discovery process
      await this.simulateNetworkScan();
      return this.scanResults;
    } finally {
      this.scanning = false;
    }
  }

  private async simulateNetworkScan(): Promise<void> {
    // Simulate scanning delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate discovered devices
    const mockDevices: ScannedDevice[] = [
      {
        name: "Amazon Echo Dot",
        macAddress: "DD:EE:FF:00:11:22",
        deviceType: "smart_speaker",
        protocol: "wifi",
        rssi: -48,
        manufacturer: "Amazon",
        model: "Echo Dot 4th Gen"
      },
      {
        name: "Samsung Smart Fridge",
        macAddress: "33:44:55:66:77:88",
        deviceType: "smart_fridge",
        protocol: "wifi",
        rssi: -41,
        manufacturer: "Samsung",
        model: "RF28T5001SR"
      },
      {
        name: "Ring Video Doorbell",
        macAddress: "99:AA:BB:CC:DD:EE",
        deviceType: "doorbell",
        protocol: "wifi",
        rssi: -55,
        manufacturer: "Ring",
        model: "Video Doorbell Pro"
      },
      {
        name: "TP-Link Smart Plug",
        macAddress: "FF:EE:DD:CC:BB:AA",
        deviceType: "smart_plug",
        protocol: "wifi",
        rssi: -39,
        manufacturer: "TP-Link",
        model: "Kasa HS105"
      }
    ];

    // Randomly select 2-4 devices to simulate realistic discovery
    const numDevices = Math.floor(Math.random() * 3) + 2;
    this.scanResults = mockDevices.slice(0, numDevices);
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
