import { exec } from 'child_process';
import { promisify } from 'util';
import dgram from 'dgram';
import dns from 'dns';
import net from 'net';

const execAsync = promisify(exec);

export interface DiscoveredNetworkDevice {
  ip: string;
  mac: string;
  hostname?: string;
  vendor?: string;
  deviceType: string;
  deviceName: string;
  protocol: string;
  services: string[];
  capabilities: DeviceCapabilities;
  rssi?: number;
  lastSeen: Date;
  isOnline: boolean;
}

export interface DeviceCapabilities {
  hasUPnP: boolean;
  hasmDNS: boolean;
  hasSSDP: boolean;
  hasHTTP: boolean;
  hasSSH: boolean;
  hasWebUI: boolean;
  supportedServices: string[];
}

export interface NetworkInfo {
  gateway: string;
  subnet: string;
  networkRange: string;
}

/**
 * Comprehensive Network Device Discovery Service
 * Uses SSDP, mDNS, UPnP, and ARP scanning to find all smart devices
 */
export class ComprehensiveDeviceDiscovery {
  private discoveredDevices: Map<string, DiscoveredNetworkDevice> = new Map();
  private isScanning = false;
  private scanInterval?: NodeJS.Timeout;

  // Known vendor MAC prefixes for device identification
  private vendorDatabase = new Map([
    // Gaming Systems
    ['00:0D:3A', 'Microsoft Xbox'],
    ['A4:C3:61', 'Sony PlayStation'],
    ['98:B6:E9', 'Nintendo Switch'],
    ['00:17:AB', 'Nintendo Wii'],
    ['00:19:1D', 'Sony PlayStation'],
    ['00:24:E4', 'Valve Steam Deck'],
    
    // Printers & Office Equipment
    ['00:A0:D1', 'Canon Printer'],
    ['00:60:B0', 'Hewlett Packard'],
    ['00:C0:EE', 'HP LaserJet'],
    ['08:00:20', 'Epson Printer'],
    ['00:80:77', 'Brother Printer'],
    ['00:04:76', 'Kyocera Printer'],
    ['00:1B:A9', 'Xerox Printer'],
    ['00:E0:81', 'Lexmark Printer'],
    
    // Smart TVs & Streaming
    ['D8:31:34', 'Samsung Smart TV'],
    ['CC:32:E5', 'LG Smart TV'],
    ['3C:28:6D', 'Sony Bravia TV'],
    ['B8:27:EB', 'Raspberry Pi'],
    ['DC:A6:32', 'Roku Device'],
    ['18:B4:30', 'Amazon Fire TV'],
    ['F4:F5:D8', 'Google Chromecast'],
    ['AC:63:BE', 'Apple TV'],
    
    // Network Infrastructure
    ['00:1D:D9', 'Ubiquiti Networks'],
    ['24:A4:3C', 'Netgear Router'],
    ['00:50:F2', 'Linksys Router'],
    ['BC:14:01', 'ASUS Router'],
    ['E8:DE:27', 'TP-Link Router'],
    ['00:26:62', 'D-Link Router'],
    
    // Smart Home Devices
    ['EC:FA:BC', 'Philips Hue Bridge'],
    ['00:17:88', 'Nest Thermostat'],
    ['FC:65:DE', 'Amazon Echo'],
    ['B4:75:0E', 'Google Nest'],
    ['18:B7:9E', 'Ring Doorbell'],
    
    // Computers & Mobile
    ['00:1B:63', 'Apple MacBook'],
    ['AC:DE:48', 'Apple iMac'],
    ['00:50:56', 'VMware Virtual'],
    ['08:00:27', 'VirtualBox'],
    ['00:15:5D', 'Microsoft Hyper-V'],
    
    // IoT & Sensors
    ['5C:CF:7F', 'Espressif ESP32'],
    ['98:F4:AB', 'Arduino WiFi'],
    ['B8:27:EB', 'Raspberry Pi Foundation'],
    ['00:50:43', 'Amazon'],
    ['FC:65:DE', 'Amazon Echo'],
    ['68:37:E9', 'Amazon Fire TV'],
    ['18:74:2E', 'Google'],
    ['54:60:09', 'Google Nest'],
    ['F4:F5:D8', 'Google Chromecast'],
    ['AA:BB:CC', 'Google Home'],
    ['B8:27:EB', 'Raspberry Pi'],
    ['DC:A6:32', 'Raspberry Pi'],
    ['E4:5F:01', 'Raspberry Pi'],
    ['B0:34:95', 'Apple'],
    ['28:CF:E9', 'Apple TV'],
    ['7C:D1:C3', 'Apple HomePod'],
    ['00:17:88', 'Philips Hue'],
    ['EC:FA:BC', 'Philips Hue'],
    ['00:0B:57', 'Samsung Smart TV'],
    ['E8:50:8B', 'Samsung SmartThings'],
    ['F8:04:2E', 'Samsung'],
    ['5C:E0:C5', 'LIFX'],
    ['D0:73:D5', 'LIFX'],
    ['94:18:82', 'Sonos'],
    ['00:0E:58', 'Sonos'],
    ['B8:E9:37', 'Ring Doorbell'],
    ['FC:99:47', 'Ring'],
    ['54:2A:1B', 'Nest Thermostat'],
    ['18:B4:30', 'Nest'],
    ['00:1A:22', 'TP-Link'],
    ['50:C7:BF', 'TP-Link Kasa'],
    ['AC:84:C6', 'TP-Link'],
    ['44:61:32', 'Ubiquiti'],
    ['78:8A:20', 'Ubiquiti'],
    ['24:A4:3C', 'Ubiquiti']
  ]);

  // Device type classification based on various indicators
  private deviceTypeClassifier = {
    'smart_tv': ['samsung', 'lg', 'sony', 'tcl', 'roku', 'apple tv', 'chromecast', 'fire tv', 'bravia', 'smart tv'],
    'smart_speaker': ['echo', 'alexa', 'google home', 'homepod', 'sonos', 'nest audio', 'speaker'],
    'smart_light': ['hue', 'lifx', 'kasa', 'wyze bulb', 'sengled', 'smart bulb', 'light'],
    'thermostat': ['nest', 'ecobee', 'honeywell', 'thermostat'],
    'security_camera': ['ring', 'arlo', 'wyze cam', 'nest cam', 'camera', 'doorbell'],
    'smart_plug': ['kasa plug', 'wyze plug', 'amazon plug', 'smart plug', 'outlet'],
    'router': ['router', 'gateway', 'access point', 'ubiquiti', 'netgear', 'linksys', 'asus', 'd-link', 'tp-link'],
    'game_console': ['xbox', 'playstation', 'nintendo', 'steam deck', 'switch', 'wii'],
    'streaming_device': ['roku', 'chromecast', 'fire tv', 'apple tv', 'nvidia shield'],
    'smart_hub': ['smartthings', 'hubitat', 'wink', 'vera', 'home assistant', 'hub'],
    'printer': ['canon', 'hp', 'epson', 'brother', 'xerox', 'lexmark', 'kyocera', 'printer', 'laserjet'],
    'computer': ['macbook', 'imac', 'laptop', 'desktop', 'pc', 'workstation', 'server'],
    'mobile_device': ['iphone', 'ipad', 'android', 'tablet', 'phone'],
    'iot_sensor': ['esp32', 'arduino', 'raspberry pi', 'sensor', 'monitor'],
    'nas_storage': ['synology', 'qnap', 'drobo', 'nas', 'storage'],
    'media_server': ['plex', 'jellyfin', 'kodi', 'media server'],
    'smart_switch': ['switch', 'dimmer', 'outlet', 'wall switch'],
    'smart_lock': ['august', 'yale', 'schlage', 'kwikset', 'lock'],
    'garage_door': ['myq', 'chamberlain', 'liftmaster', 'garage'],
    'vacuum': ['roomba', 'shark', 'eufy', 'roborock', 'vacuum'],
    'air_quality': ['awair', 'purple air', 'air quality', 'purifier'],
    'smart_blinds': ['lutron', 'somfy', 'blinds', 'shades'],
    'doorbell': ['ring', 'nest hello', 'arlo', 'doorbell'],
    'security_system': ['simplisafe', 'adt', 'vivint', 'security'],
    'weather_station': ['ambient', 'davis', 'weather', 'station']
  };

  constructor() {
    this.startPeriodicScanning();
  }

  /**
   * Start comprehensive network discovery
   */
  async startDeviceDiscovery(): Promise<DiscoveredNetworkDevice[]> {
    if (this.isScanning) {
      console.log('Device discovery already in progress...');
      return Array.from(this.discoveredDevices.values());
    }

    this.isScanning = true;
    console.log('🔍 Starting comprehensive network device discovery...');

    try {
      // Get network information
      const networkInfo = await this.getNetworkInfo();
      console.log(`🌐 Scanning network: ${networkInfo.networkRange}`);

      // Run parallel discovery methods
      const discoveryPromises = [
        this.performARPScan(networkInfo),
        this.performSSDPDiscovery(),
        this.performmDNSDiscovery(),
        this.performUPnPDiscovery(),
        this.performPortScan(networkInfo)
      ];

      // Wait for all discovery methods to complete
      const results = await Promise.allSettled(discoveryPromises);
      
      // Log results
      results.forEach((result, index) => {
        const methods = ['ARP', 'SSDP', 'mDNS', 'UPnP', 'Port Scan'];
        if (result.status === 'fulfilled') {
          console.log(`✅ ${methods[index]} discovery completed`);
        } else {
          console.log(`❌ ${methods[index]} discovery failed:`, result.reason);
        }
      });

      // Enrich discovered devices with additional information
      await this.enrichDeviceInformation();

      console.log(`🎉 Discovery complete! Found ${this.discoveredDevices.size} devices`);
      return Array.from(this.discoveredDevices.values());

    } catch (error) {
      console.error('❌ Device discovery failed:', error);
      throw error;
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Get network information (gateway, subnet, etc.)
   */
  private async getNetworkInfo(): Promise<NetworkInfo> {
    try {
      // Try multiple methods to get network info
      const methods = [
        () => this.getNetworkInfoLinux(),
        () => this.getNetworkInfoMacOS(),
        () => this.getNetworkInfoWindows(),
        () => this.getNetworkInfoFallback()
      ];

      for (const method of methods) {
        try {
          const result = await method();
          if (result.gateway && result.subnet) {
            return result;
          }
        } catch (err) {
          console.log('Network info method failed, trying next...');
        }
      }

      throw new Error('Could not determine network information');
    } catch (error) {
      console.error('Failed to get network info:', error);
      // Fallback to common home network ranges
      return {
        gateway: '192.168.1.1',
        subnet: '192.168.1',
        networkRange: '192.168.1.0/24'
      };
    }
  }

  private async getNetworkInfoLinux(): Promise<NetworkInfo> {
    const { stdout } = await execAsync('ip route | grep default');
    const match = stdout.match(/default via ([\d.]+) dev \w+ src ([\d.]+)/);
    
    if (match) {
      const gateway = match[1];
      const localIP = match[2];
      const subnet = localIP.substring(0, localIP.lastIndexOf('.'));
      
      return {
        gateway,
        subnet,
        networkRange: `${subnet}.0/24`
      };
    }
    
    throw new Error('Could not parse Linux network info');
  }

  private async getNetworkInfoMacOS(): Promise<NetworkInfo> {
    const { stdout } = await execAsync('route -n get default');
    const gatewayMatch = stdout.match(/gateway: ([\d.]+)/);
    
    if (gatewayMatch) {
      const gateway = gatewayMatch[1];
      const subnet = gateway.substring(0, gateway.lastIndexOf('.'));
      
      return {
        gateway,
        subnet,
        networkRange: `${subnet}.0/24`
      };
    }
    
    throw new Error('Could not parse macOS network info');
  }

  private async getNetworkInfoWindows(): Promise<NetworkInfo> {
    const { stdout } = await execAsync('ipconfig');
    const gatewayMatch = stdout.match(/Default Gateway[.\s]*: ([\d.]+)/);
    
    if (gatewayMatch) {
      const gateway = gatewayMatch[1];
      const subnet = gateway.substring(0, gateway.lastIndexOf('.'));
      
      return {
        gateway,
        subnet,
        networkRange: `${subnet}.0/24`
      };
    }
    
    throw new Error('Could not parse Windows network info');
  }

  private async getNetworkInfoFallback(): Promise<NetworkInfo> {
    // Try to connect to common gateways to determine our network
    const commonGateways = ['192.168.1.1', '192.168.0.1', '10.0.1.1', '172.16.1.1'];
    
    for (const gateway of commonGateways) {
      try {
        const socket = new net.Socket();
        await new Promise<void>((resolve, reject) => {
          socket.setTimeout(1000);
          socket.connect(80, gateway, resolve);
          socket.on('error', reject);
          socket.on('timeout', reject);
        });
        socket.destroy();
        
        const subnet = gateway.substring(0, gateway.lastIndexOf('.'));
        return {
          gateway,
          subnet,
          networkRange: `${subnet}.0/24`
        };
      } catch (err) {
        // Continue to next gateway
      }
    }
    
    throw new Error('Could not determine network via fallback method');
  }

  /**
   * Perform ARP scan to find all devices on the network
   */
  private async performARPScan(networkInfo: NetworkInfo): Promise<void> {
    try {
      console.log(`🔍 Performing ARP scan on ${networkInfo.networkRange}...`);
      
      // Try multiple ARP scan methods
      const scanMethods = [
        () => this.arpScanNmap(networkInfo.networkRange),
        () => this.arpScanArpScan(networkInfo.networkRange),
        () => this.arpScanPing(networkInfo),
        () => this.arpScanManual(networkInfo)
      ];

      for (const method of scanMethods) {
        try {
          const devices = await method();
          devices.forEach(device => this.addDiscoveredDevice(device));
          if (devices.length > 0) {
            console.log(`✅ ARP scan found ${devices.length} devices`);
            return;
          }
        } catch (err) {
          console.log('ARP scan method failed, trying next...');
        }
      }
    } catch (error) {
      console.error('ARP scan failed:', error);
    }
  }

  private async arpScanNmap(networkRange: string): Promise<DiscoveredNetworkDevice[]> {
    const { stdout } = await execAsync(`nmap -sn ${networkRange}`);
    return this.parseNmapOutput(stdout);
  }

  private async arpScanArpScan(networkRange: string): Promise<DiscoveredNetworkDevice[]> {
    const { stdout } = await execAsync(`arp-scan ${networkRange}`);
    return this.parseArpScanOutput(stdout);
  }

  private async arpScanPing(networkInfo: NetworkInfo): Promise<DiscoveredNetworkDevice[]> {
    const devices: DiscoveredNetworkDevice[] = [];
    const promises: Promise<void>[] = [];

    // Ping each IP in the subnet
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

  private async arpScanManual(networkInfo: NetworkInfo): Promise<DiscoveredNetworkDevice[]> {
    const devices: DiscoveredNetworkDevice[] = [];
    
    try {
      // Check ARP table
      const { stdout } = await execAsync('arp -a');
      const arpEntries = stdout.split('\n');
      
      for (const entry of arpEntries) {
        const match = entry.match(/\(([\d.]+)\) at ([a-fA-F0-9:]{17})/);
        if (match) {
          const [, ip, mac] = match;
          if (ip.startsWith(networkInfo.subnet)) {
            devices.push(this.createDeviceFromARP(ip, mac));
          }
        }
      }
    } catch (error) {
      console.log('Manual ARP scan failed, using network probing...');
    }
    
    return devices;
  }

  /**
   * Perform SSDP (Simple Service Discovery Protocol) discovery
   */
  private async performSSDPDiscovery(): Promise<void> {
    return new Promise((resolve) => {
      console.log('🔍 Performing SSDP discovery...');
      
      const socket = dgram.createSocket('udp4');
      const ssdpMessage = 
        'M-SEARCH * HTTP/1.1\r\n' +
        'HOST: 239.255.255.250:1900\r\n' +
        'MAN: "ssdp:discover"\r\n' +
        'ST: upnp:rootdevice\r\n' +
        'MX: 3\r\n\r\n';

      socket.on('message', (msg, rinfo) => {
        try {
          const response = msg.toString();
          const device = this.parseSSDP Response(response, rinfo.address);
          if (device) {
            this.addDiscoveredDevice(device);
          }
        } catch (error) {
          console.error('Error parsing SSDP response:', error);
        }
      });

      socket.bind(() => {
        socket.addMembership('239.255.255.250');
        socket.send(ssdpMessage, 1900, '239.255.255.250', (err) => {
          if (err) {
            console.error('SSDP send error:', err);
          }
        });

        // Close socket after 5 seconds
        setTimeout(() => {
          socket.close();
          resolve();
        }, 5000);
      });
    });
  }

  /**
   * Perform mDNS (Multicast DNS) discovery
   */
  private async performmDNSDiscovery(): Promise<void> {
    console.log('🔍 Performing mDNS discovery...');
    
    try {
      // Common mDNS service types
      const serviceTypes = [
        '_http._tcp.local',
        '_https._tcp.local',
        '_airplay._tcp.local',
        '_chromecast._tcp.local',
        '_googlecast._tcp.local',
        '_spotify-connect._tcp.local',
        '_sonos._tcp.local',
        '_hap._tcp.local', // HomeKit
        '_homekit._tcp.local',
        '_hue._tcp.local',
        '_philips-hue._tcp.local'
      ];

      for (const serviceType of serviceTypes) {
        try {
          await this.querymDNSService(serviceType);
        } catch (error) {
          // Continue with other service types
        }
      }
    } catch (error) {
      console.error('mDNS discovery failed:', error);
    }
  }

  private async querymDNSService(serviceType: string): Promise<void> {
    return new Promise((resolve, reject) => {
      dns.resolve(serviceType, 'PTR', (err, addresses) => {
        if (err) {
          reject(err);
          return;
        }

        addresses.forEach(address => {
          // Parse mDNS response and create device
          const device = this.parsemDNSResponse(address, serviceType);
          if (device) {
            this.addDiscoveredDevice(device);
          }
        });

        resolve();
      });
    });
  }

  /**
   * Perform UPnP discovery
   */
  private async performUPnPDiscovery(): Promise<void> {
    console.log('🔍 Performing UPnP discovery...');
    
    // UPnP discovery is similar to SSDP but looks for specific UPnP devices
    return new Promise((resolve) => {
      const socket = dgram.createSocket('udp4');
      const upnpMessage = 
        'M-SEARCH * HTTP/1.1\r\n' +
        'HOST: 239.255.255.250:1900\r\n' +
        'MAN: "ssdp:discover"\r\n' +
        'ST: urn:schemas-upnp-org:device:MediaRenderer:1\r\n' +
        'MX: 3\r\n\r\n';

      socket.on('message', (msg, rinfo) => {
        try {
          const response = msg.toString();
          const device = this.parseUPnPResponse(response, rinfo.address);
          if (device) {
            this.addDiscoveredDevice(device);
          }
        } catch (error) {
          console.error('Error parsing UPnP response:', error);
        }
      });

      socket.bind(() => {
        socket.send(upnpMessage, 1900, '239.255.255.250', (err) => {
          if (err) {
            console.error('UPnP send error:', err);
          }
        });

        setTimeout(() => {
          socket.close();
          resolve();
        }, 5000);
      });
    });
  }

  /**
   * Perform port scan to identify device capabilities
   */
  private async performPortScan(networkInfo: NetworkInfo): Promise<void> {
    console.log('🔍 Performing service port scan...');
    
    const commonPorts = [22, 23, 53, 80, 443, 554, 1900, 8080, 8443, 9000];
    const devices = Array.from(this.discoveredDevices.values());

    for (const device of devices) {
      try {
        const openPorts = await this.scanPorts(device.ip, commonPorts);
        this.updateDeviceCapabilities(device.ip, openPorts);
      } catch (error) {
        // Continue with other devices
      }
    }
  }

  private async scanPorts(ip: string, ports: number[]): Promise<number[]> {
    const openPorts: number[] = [];
    const promises = ports.map(port => 
      this.checkPort(ip, port).then(isOpen => {
        if (isOpen) openPorts.push(port);
      }).catch(() => {
        // Port is closed or filtered
      })
    );

    await Promise.allSettled(promises);
    return openPorts;
  }

  private async checkPort(ip: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.on('error', () => {
        resolve(false);
      });
      
      socket.connect(port, ip);
    });
  }

  /**
   * Enrich device information with additional details
   */
  private async enrichDeviceInformation(): Promise<void> {
    console.log('🔍 Enriching device information...');
    
    for (const [ip, device] of this.discoveredDevices) {
      try {
        // Try to get hostname
        if (!device.hostname) {
          device.hostname = await this.getHostname(ip);
        }

        // Classify device type based on various indicators
        device.deviceType = this.classifyDeviceType(device);
        device.deviceName = this.generateDeviceName(device);

        // Update the device in our map
        this.discoveredDevices.set(ip, device);
      } catch (error) {
        // Continue with other devices
      }
    }
  }

  private async getHostname(ip: string): Promise<string | undefined> {
    try {
      const hostname = await new Promise<string>((resolve, reject) => {
        dns.reverse(ip, (err, hostnames) => {
          if (err) reject(err);
          else resolve(hostnames[0] || '');
        });
      });
      return hostname;
    } catch (error) {
      return undefined;
    }
  }

  private classifyDeviceType(device: DiscoveredNetworkDevice): string {
    const indicators = [
      device.hostname?.toLowerCase() || '',
      device.vendor?.toLowerCase() || '',
      device.services.join(' ').toLowerCase(),
      device.deviceName.toLowerCase()
    ].join(' ');

    for (const [type, keywords] of Object.entries(this.deviceTypeClassifier)) {
      for (const keyword of keywords) {
        if (indicators.includes(keyword)) {
          return type;
        }
      }
    }

    return 'unknown_device';
  }

  private generateDeviceName(device: DiscoveredNetworkDevice): string {
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
        'game_console': 'Game Console',
        'streaming_device': 'Streaming Device',
        'smart_hub': 'Smart Hub'
      };

      const typeName = typeMap[device.deviceType] || 'Device';
      return `${device.vendor} ${typeName}`;
    }

    return `Unknown Device`;
  }

  // Helper methods for parsing different protocol responses
  private parseNmapOutput(output: string): DiscoveredNetworkDevice[] {
    const devices: DiscoveredNetworkDevice[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      const ipMatch = line.match(/Nmap scan report for .* \(([\d.]+)\)/);
      if (ipMatch) {
        devices.push(this.createBasicDevice(ipMatch[1]));
      }
    }
    
    return devices;
  }

  private parseArpScanOutput(output: string): DiscoveredNetworkDevice[] {
    const devices: DiscoveredNetworkDevice[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      const match = line.match(/([\d.]+)\s+([a-fA-F0-9:]{17})\s+(.*)/);
      if (match) {
        const [, ip, mac, vendor] = match;
        devices.push(this.createDeviceFromARP(ip, mac, vendor));
      }
    }
    
    return devices;
  }

  private parseSSDP Response(response: string, ip: string): DiscoveredNetworkDevice | null {
    try {
      const lines = response.split('\r\n');
      const headers: { [key: string]: string } = {};
      
      for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).toLowerCase();
          const value = line.substring(colonIndex + 1).trim();
          headers[key] = value;
        }
      }

      if (headers.location || headers.server) {
        return this.createDeviceFromSSDP(ip, headers);
      }
    } catch (error) {
      console.error('Error parsing SSDP response:', error);
    }
    
    return null;
  }

  private parsemDNSResponse(address: string, serviceType: string): DiscoveredNetworkDevice | null {
    // Extract IP from mDNS response
    const ipMatch = address.match(/([\d.]+)/);
    if (ipMatch) {
      return this.createDeviceFrommDNS(ipMatch[1], serviceType);
    }
    return null;
  }

  private parseUPnPResponse(response: string, ip: string): DiscoveredNetworkDevice | null {
    // Similar to SSDP but specifically for UPnP devices
    return this.parseSSDP Response(response, ip);
  }

  // Device creation helpers
  private createBasicDevice(ip: string): DiscoveredNetworkDevice {
    return {
      ip,
      mac: this.generateMACFromIP(ip),
      deviceType: 'unknown_device',
      deviceName: 'Unknown Device',
      protocol: 'icmp',
      services: [],
      capabilities: this.createBasicCapabilities(),
      lastSeen: new Date(),
      isOnline: true
    };
  }

  private createDeviceFromARP(ip: string, mac: string, vendor?: string): DiscoveredNetworkDevice {
    const normalizedMac = mac.toUpperCase();
    const vendorFromMac = this.getVendorFromMAC(normalizedMac);
    
    return {
      ip,
      mac: normalizedMac,
      vendor: vendor || vendorFromMac,
      deviceType: 'unknown_device',
      deviceName: 'Unknown Device',
      protocol: 'arp',
      services: [],
      capabilities: this.createBasicCapabilities(),
      lastSeen: new Date(),
      isOnline: true
    };
  }

  private createDeviceFromSSDP(ip: string, headers: { [key: string]: string }): DiscoveredNetworkDevice {
    return {
      ip,
      mac: this.generateMACFromIP(ip),
      vendor: this.extractVendorFromHeaders(headers),
      deviceType: 'upnp_device',
      deviceName: headers.server || 'UPnP Device',
      protocol: 'ssdp',
      services: ['upnp'],
      capabilities: {
        ...this.createBasicCapabilities(),
        hasSSDP: true,
        hasUPnP: true
      },
      lastSeen: new Date(),
      isOnline: true
    };
  }

  private createDeviceFrommDNS(ip: string, serviceType: string): DiscoveredNetworkDevice {
    return {
      ip,
      mac: this.generateMACFromIP(ip),
      deviceType: this.getDeviceTypeFromService(serviceType),
      deviceName: 'mDNS Device',
      protocol: 'mdns',
      services: [serviceType],
      capabilities: {
        ...this.createBasicCapabilities(),
        hasmDNS: true
      },
      lastSeen: new Date(),
      isOnline: true
    };
  }

  private createBasicCapabilities(): DeviceCapabilities {
    return {
      hasUPnP: false,
      hasmDNS: false,
      hasSSDP: false,
      hasHTTP: false,
      hasSSH: false,
      hasWebUI: false,
      supportedServices: []
    };
  }

  // Utility methods
  private generateMACFromIP(ip: string): string {
    // Generate a consistent fake MAC based on IP for devices where MAC isn't available
    const parts = ip.split('.');
    return `02:00:${parts[2].padStart(2, '0')}:${parts[3].padStart(2, '0')}:00:01`;
  }

  private getVendorFromMAC(mac: string): string | undefined {
    const prefix = mac.substring(0, 8);
    return this.vendorDatabase.get(prefix);
  }

  private extractVendorFromHeaders(headers: { [key: string]: string }): string | undefined {
    const server = headers.server?.toLowerCase();
    if (server) {
      for (const [prefix, vendor] of this.vendorDatabase) {
        if (server.includes(vendor.toLowerCase())) {
          return vendor;
        }
      }
    }
    return undefined;
  }

  private getDeviceTypeFromService(serviceType: string): string {
    const serviceMap: { [key: string]: string } = {
      '_airplay._tcp.local': 'smart_speaker',
      '_chromecast._tcp.local': 'streaming_device',
      '_googlecast._tcp.local': 'streaming_device',
      '_sonos._tcp.local': 'smart_speaker',
      '_hap._tcp.local': 'smart_light',
      '_hue._tcp.local': 'smart_light'
    };
    
    return serviceMap[serviceType] || 'unknown_device';
  }

  private async pingHost(ip: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`ping -c 1 -W 1000 ${ip}`);
      return stdout.includes('1 packets transmitted, 1 received');
    } catch (error) {
      return false;
    }
  }

  private updateDeviceCapabilities(ip: string, openPorts: number[]): void {
    const device = this.discoveredDevices.get(ip);
    if (!device) return;

    const capabilities = device.capabilities;
    
    if (openPorts.includes(22)) capabilities.hasSSH = true;
    if (openPorts.includes(80) || openPorts.includes(8080)) {
      capabilities.hasHTTP = true;
      capabilities.hasWebUI = true;
    }
    if (openPorts.includes(443) || openPorts.includes(8443)) capabilities.hasWebUI = true;
    if (openPorts.includes(1900)) {
      capabilities.hasSSDP = true;
      capabilities.hasUPnP = true;
    }

    capabilities.supportedServices = openPorts.map(port => `port-${port}`);
  }

  private addDiscoveredDevice(device: DiscoveredNetworkDevice): void {
    const existing = this.discoveredDevices.get(device.ip);
    if (existing) {
      // Merge information from multiple discovery methods
      existing.services = [...new Set([...existing.services, ...device.services])];
      existing.vendor = existing.vendor || device.vendor;
      existing.hostname = existing.hostname || device.hostname;
      existing.lastSeen = new Date();
      
      // Merge capabilities
      Object.assign(existing.capabilities, device.capabilities);
    } else {
      this.discoveredDevices.set(device.ip, device);
    }
  }

  /**
   * Start periodic scanning to keep device list updated
   */
  private startPeriodicScanning(): void {
    // Scan every 5 minutes
    this.scanInterval = setInterval(async () => {
      try {
        await this.startDeviceDiscovery();
      } catch (error) {
        console.error('Periodic scan failed:', error);
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Stop periodic scanning
   */
  stopPeriodicScanning(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = undefined;
    }
  }

  /**
   * Get all discovered devices
   */
  getAllDiscoveredDevices(): DiscoveredNetworkDevice[] {
    return Array.from(this.discoveredDevices.values());
  }

  /**
   * Get devices by type
   */
  getDevicesByType(deviceType: string): DiscoveredNetworkDevice[] {
    return Array.from(this.discoveredDevices.values())
      .filter(device => device.deviceType === deviceType);
  }

  /**
   * Clear discovered devices
   */
  clearDiscoveredDevices(): void {
    this.discoveredDevices.clear();
  }

  /**
   * Check if scanning is in progress
   */
  isCurrentlyScanning(): boolean {
    return this.isScanning;
  }
}

// Export singleton instance
export const comprehensiveDeviceDiscovery = new ComprehensiveDeviceDiscovery();