import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface NetworkDevice {
  ip: string;
  mac: string;
  hostname?: string;
  vendor?: string;
  deviceType: string;
  deviceName: string;
  isOnline: boolean;
  lastSeen: Date;
  services: string[];
}

export interface NetworkScanRequest {
  userConsent: boolean;
  scanIntensive: boolean;
  includeVendorLookup: boolean;
}

export interface NetworkScanResult {
  devices: NetworkDevice[];
  networkInfo: {
    gateway: string;
    subnet: string;
    totalHosts: number;
  };
  scanDuration: number;
  privacy: {
    dataStaysLocal: boolean;
    noExternalTransmission: boolean;
  };
}

/**
 * Network Device Discovery Service
 * Scans local network for smart devices using standard protocols
 * All data remains local - no external transmission
 */
export class NetworkDiscoveryService {
  private vendorDatabase = new Map([
    ['00:50:43', 'Amazon'],
    ['FC:65:DE', 'Amazon Echo'],
    ['68:37:E9', 'Amazon Fire TV'],
    ['18:74:2E', 'Google'],
    ['54:60:09', 'Google Nest'],
    ['F4:F5:D8', 'Google Chromecast'],
    ['B8:27:EB', 'Raspberry Pi'],
    ['DC:A6:32', 'Raspberry Pi'],
    ['B0:34:95', 'Apple'],
    ['28:CF:E9', 'Apple TV'],
    ['7C:D1:C3', 'Apple HomePod'],
    ['00:17:88', 'Philips Hue'],
    ['EC:FA:BC', 'Philips Hue'],
    ['00:0B:57', 'Samsung Smart TV'],
    ['E8:50:8B', 'Samsung SmartThings'],
    ['5C:E0:C5', 'LIFX'],
    ['94:18:82', 'Sonos'],
    ['B8:E9:37', 'Ring Doorbell'],
    ['54:2A:1B', 'Nest Thermostat'],
    ['00:1A:22', 'TP-Link'],
    ['50:C7:BF', 'TP-Link Kasa'],
    ['44:61:32', 'Ubiquiti']
  ]);

  private deviceClassifiers = {
    'smart_tv': ['samsung', 'lg', 'sony', 'roku', 'apple tv', 'chromecast', 'fire tv'],
    'smart_speaker': ['echo', 'alexa', 'google home', 'homepod', 'sonos'],
    'smart_light': ['hue', 'lifx', 'kasa', 'wyze bulb'],
    'thermostat': ['nest', 'ecobee', 'honeywell'],
    'security_camera': ['ring', 'arlo', 'wyze cam', 'nest cam'],
    'smart_plug': ['kasa plug', 'wyze plug', 'smart plug'],
    'router': ['router', 'gateway', 'ubiquiti', 'netgear', 'linksys'],
    'streaming_device': ['roku', 'chromecast', 'fire tv', 'apple tv']
  };

  /**
   * Start network device discovery with user consent
   */
  async startNetworkScan(request: NetworkScanRequest): Promise<NetworkScanResult> {
    if (!request.userConsent) {
      throw new Error('User consent required for network scanning');
    }

    const startTime = Date.now();
    console.log('🔍 Starting network device discovery...');
    console.log('🔒 Privacy: All data stays local, no external transmission');

    try {
      // Get network information
      const networkInfo = await this.getNetworkInfo();
      console.log(`🌐 Scanning network: ${networkInfo.subnet}.0/24`);

      // Perform network scan
      const devices = await this.performNetworkScan(networkInfo, request);

      // Classify and enrich devices
      const enrichedDevices = await this.enrichDevices(devices, request);

      const scanDuration = Date.now() - startTime;

      return {
        devices: enrichedDevices,
        networkInfo: {
          gateway: networkInfo.gateway,
          subnet: networkInfo.subnet,
          totalHosts: enrichedDevices.length
        },
        scanDuration,
        privacy: {
          dataStaysLocal: true,
          noExternalTransmission: true
        }
      };

    } catch (error) {
      console.error('Network scan failed:', error);
      throw new Error(`Network scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get local network information
   */
  private async getNetworkInfo(): Promise<{ gateway: string; subnet: string }> {
    try {
      // Try different methods for different OS
      const methods = [
        this.getNetworkInfoLinux.bind(this),
        this.getNetworkInfoMacOS.bind(this),
        this.getNetworkInfoWindows.bind(this)
      ];

      for (const method of methods) {
        try {
          const result = await method();
          if (result.gateway && result.subnet) {
            return result;
          }
        } catch (err) {
          continue;
        }
      }

      // Fallback to common network ranges
      return { gateway: '192.168.1.1', subnet: '192.168.1' };
    } catch (error) {
      return { gateway: '192.168.1.1', subnet: '192.168.1' };
    }
  }

  private async getNetworkInfoLinux(): Promise<{ gateway: string; subnet: string }> {
    const { stdout } = await execAsync('ip route | grep default');
    const match = stdout.match(/default via ([\d.]+)/);
    
    if (match) {
      const gateway = match[1];
      const subnet = gateway.substring(0, gateway.lastIndexOf('.'));
      return { gateway, subnet };
    }
    
    throw new Error('Could not parse Linux network info');
  }

  private async getNetworkInfoMacOS(): Promise<{ gateway: string; subnet: string }> {
    const { stdout } = await execAsync('route -n get default');
    const match = stdout.match(/gateway: ([\d.]+)/);
    
    if (match) {
      const gateway = match[1];
      const subnet = gateway.substring(0, gateway.lastIndexOf('.'));
      return { gateway, subnet };
    }
    
    throw new Error('Could not parse macOS network info');
  }

  private async getNetworkInfoWindows(): Promise<{ gateway: string; subnet: string }> {
    const { stdout } = await execAsync('ipconfig');
    const match = stdout.match(/Default Gateway[.\s]*: ([\d.]+)/);
    
    if (match) {
      const gateway = match[1];
      const subnet = gateway.substring(0, gateway.lastIndexOf('.'));
      return { gateway, subnet };
    }
    
    throw new Error('Could not parse Windows network info');
  }

  /**
   * Perform network scan using available tools
   */
  private async performNetworkScan(
    networkInfo: { gateway: string; subnet: string }, 
    request: NetworkScanRequest
  ): Promise<NetworkDevice[]> {
    const networkRange = `${networkInfo.subnet}.0/24`;
    
    // Try different scanning methods
    const scanMethods = [
      () => this.nmapScan(networkRange),
      () => this.pingScan(networkInfo),
      () => this.arpTableScan(networkInfo)
    ];

    for (const method of scanMethods) {
      try {
        const devices = await method();
        if (devices.length > 0) {
          console.log(`✅ Found ${devices.length} devices using network scan`);
          return devices;
        }
      } catch (err) {
        console.log('Scan method failed, trying next...');
      }
    }

    return [];
  }

  private async nmapScan(networkRange: string): Promise<NetworkDevice[]> {
    try {
      const { stdout } = await execAsync(`nmap -sn ${networkRange}`);
      return this.parseNmapOutput(stdout);
    } catch (error) {
      throw new Error('nmap not available');
    }
  }

  private async pingScan(networkInfo: { subnet: string }): Promise<NetworkDevice[]> {
    const devices: NetworkDevice[] = [];
    const promises: Promise<void>[] = [];

    // Ping common device IPs
    for (let i = 1; i <= 254; i++) {
      const ip = `${networkInfo.subnet}.${i}`;
      promises.push(
        this.pingHost(ip).then(isAlive => {
          if (isAlive) {
            devices.push(this.createBasicDevice(ip));
          }
        }).catch(() => {
          // Ignore ping failures
        })
      );
    }

    await Promise.allSettled(promises);
    return devices;
  }

  private async arpTableScan(networkInfo: { subnet: string }): Promise<NetworkDevice[]> {
    try {
      const { stdout } = await execAsync('arp -a');
      return this.parseArpOutput(stdout, networkInfo.subnet);
    } catch (error) {
      throw new Error('ARP table not available');
    }
  }

  private async pingHost(ip: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`ping -c 1 -W 1000 ${ip}`);
      return stdout.includes('1 packets transmitted, 1 received');
    } catch (error) {
      return false;
    }
  }

  /**
   * Parse nmap output to extract device information
   */
  private parseNmapOutput(output: string): NetworkDevice[] {
    const devices: NetworkDevice[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      const ipMatch = line.match(/Nmap scan report for .* \(([\d.]+)\)/);
      if (ipMatch) {
        devices.push(this.createBasicDevice(ipMatch[1]));
      }
    }
    
    return devices;
  }

  /**
   * Parse ARP table output
   */
  private parseArpOutput(output: string, subnet: string): NetworkDevice[] {
    const devices: NetworkDevice[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      const match = line.match(/\(([\d.]+)\) at ([a-fA-F0-9:]{17})/);
      if (match) {
        const [, ip, mac] = match;
        if (ip.startsWith(subnet)) {
          devices.push(this.createDeviceFromARP(ip, mac));
        }
      }
    }
    
    return devices;
  }

  /**
   * Create basic device from IP
   */
  private createBasicDevice(ip: string): NetworkDevice {
    return {
      ip,
      mac: this.generateMACFromIP(ip),
      deviceType: 'unknown_device',
      deviceName: 'Unknown Device',
      isOnline: true,
      lastSeen: new Date(),
      services: []
    };
  }

  /**
   * Create device from ARP entry
   */
  private createDeviceFromARP(ip: string, mac: string): NetworkDevice {
    const normalizedMac = mac.toUpperCase();
    const vendor = this.getVendorFromMAC(normalizedMac);
    
    return {
      ip,
      mac: normalizedMac,
      vendor,
      deviceType: 'unknown_device',
      deviceName: 'Unknown Device',
      isOnline: true,
      lastSeen: new Date(),
      services: []
    };
  }

  /**
   * Generate consistent MAC from IP for devices where MAC isn't available
   */
  private generateMACFromIP(ip: string): string {
    const parts = ip.split('.');
    return `02:00:${parts[2].padStart(2, '0')}:${parts[3].padStart(2, '0')}:00:01`;
  }

  /**
   * Get vendor from MAC address prefix
   */
  private getVendorFromMAC(mac: string): string | undefined {
    const prefix = mac.substring(0, 8);
    return this.vendorDatabase.get(prefix);
  }

  /**
   * Enrich devices with additional information
   */
  private async enrichDevices(devices: NetworkDevice[], request: NetworkScanRequest): Promise<NetworkDevice[]> {
    const enrichedDevices: NetworkDevice[] = [];

    for (const device of devices) {
      try {
        // Try to get hostname
        if (!device.hostname) {
          device.hostname = await this.getHostname(device.ip);
        }

        // Classify device type
        device.deviceType = this.classifyDeviceType(device);
        device.deviceName = this.generateDeviceName(device);

        enrichedDevices.push(device);
      } catch (error) {
        // Add device even if enrichment fails
        enrichedDevices.push(device);
      }
    }

    return enrichedDevices;
  }

  private async getHostname(ip: string): Promise<string | undefined> {
    try {
      const { stdout } = await execAsync(`nslookup ${ip}`);
      const match = stdout.match(/name = ([^\s]+)/);
      return match ? match[1] : undefined;
    } catch (error) {
      return undefined;
    }
  }

  private classifyDeviceType(device: NetworkDevice): string {
    const indicators = [
      device.hostname?.toLowerCase() || '',
      device.vendor?.toLowerCase() || '',
      device.deviceName.toLowerCase()
    ].join(' ');

    for (const [type, keywords] of Object.entries(this.deviceClassifiers)) {
      for (const keyword of keywords) {
        if (indicators.includes(keyword)) {
          return type;
        }
      }
    }

    return 'unknown_device';
  }

  private generateDeviceName(device: NetworkDevice): string {
    if (device.hostname && device.hostname !== device.ip) {
      return device.hostname;
    }

    if (device.vendor) {
      const typeMap: { [key: string]: string } = {
        'smart_tv': 'Smart TV',
        'smart_speaker': 'Smart Speaker',
        'smart_light': 'Smart Light',
        'thermostat': 'Thermostat',
        'security_camera': 'Security Camera',
        'smart_plug': 'Smart Plug',
        'router': 'Router',
        'streaming_device': 'Streaming Device'
      };

      const typeName = typeMap[device.deviceType] || 'Device';
      return `${device.vendor} ${typeName}`;
    }

    return 'Unknown Device';
  }
}

export const networkDiscoveryService = new NetworkDiscoveryService();