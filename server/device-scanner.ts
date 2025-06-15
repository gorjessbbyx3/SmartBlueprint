import * as arp from 'node-arp';
const ping = require('ping');
import * as wifi from 'node-wifi';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ScannedDevice {
  name: string;
  macAddress: string;
  deviceType: string;
  protocol: string;
  rssi: number;
  ipAddress: string;
  manufacturer?: string;
  model?: string;
  isOnline: boolean;
}

export class NetworkDeviceScanner {
  private static instance: NetworkDeviceScanner;
  private scanning = false;
  private scanResults: ScannedDevice[] = [];

  static getInstance(): NetworkDeviceScanner {
    if (!NetworkDeviceScanner.instance) {
      NetworkDeviceScanner.instance = new NetworkDeviceScanner();
    }
    return NetworkDeviceScanner.instance;
  }

  async startScan(): Promise<ScannedDevice[]> {
    if (this.scanning) {
      throw new Error("Scan already in progress");
    }

    this.scanning = true;
    this.scanResults = [];

    try {
      console.log('Starting network device scan...');
      
      // Get network interface information
      const networkInfo = await this.getNetworkInfo();
      console.log('Network info:', networkInfo);
      
      // Scan for devices on the local network
      const devices = await this.scanLocalNetwork(networkInfo);
      
      // Get additional device information
      const enrichedDevices = await this.enrichDeviceData(devices);
      
      this.scanResults = enrichedDevices;
      console.log(`Scan completed. Found ${enrichedDevices.length} devices.`);
      
      return this.scanResults;
    } catch (error) {
      console.error('Device scan failed:', error);
      throw error;
    } finally {
      this.scanning = false;
    }
  }

  private async getNetworkInfo(): Promise<{ gateway: string; subnet: string }> {
    try {
      // Try to get default gateway
      const { stdout } = await execAsync('ip route | grep default');
      const gatewayMatch = stdout.match(/default via ([\d.]+)/);
      const gateway = gatewayMatch ? gatewayMatch[1] : '192.168.1.1';
      
      // Calculate subnet from gateway
      const gatewayParts = gateway.split('.');
      const subnet = `${gatewayParts[0]}.${gatewayParts[1]}.${gatewayParts[2]}`;
      
      return { gateway, subnet };
    } catch (error) {
      console.warn('Could not determine network info, using defaults:', error);
      return { gateway: '192.168.1.1', subnet: '192.168.1' };
    }
  }

  private async scanLocalNetwork(networkInfo: { gateway: string; subnet: string }): Promise<{ ip: string; mac: string; isAlive: boolean }[]> {
    const devices: { ip: string; mac: string; isAlive: boolean }[] = [];
    const { subnet } = networkInfo;
    
    console.log(`Scanning subnet ${subnet}.0/24...`);
    
    // Ping sweep to discover active hosts
    const pingPromises: Promise<void>[] = [];
    
    for (let i = 1; i <= 254; i++) {
      const ip = `${subnet}.${i}`;
      
      pingPromises.push(
        ping.promise.probe(ip, { timeout: 1, min_reply: 1 })
          .then(async (result: any) => {
            if (result.alive) {
              console.log(`Found active host: ${ip}`);
              
              // Get MAC address using ARP
              try {
                const mac = await this.getMacAddress(ip);
                if (mac) {
                  devices.push({ ip, mac, isAlive: true });
                }
              } catch (error) {
                console.warn(`Could not get MAC for ${ip}:`, error);
              }
            }
          })
          .catch((error: any) => {
            // Ignore ping failures for individual IPs
          })
      );
    }
    
    // Wait for all ping operations with a reasonable timeout
    await Promise.allSettled(pingPromises);
    
    console.log(`Network scan found ${devices.length} active devices`);
    return devices;
  }

  private async getMacAddress(ip: string): Promise<string | null> {
    return new Promise((resolve) => {
      arp.getMAC(ip, (err: any, mac: string) => {
        if (err || !mac) {
          resolve(null);
        } else {
          resolve(mac.toUpperCase());
        }
      });
    });
  }

  private async enrichDeviceData(devices: { ip: string; mac: string; isAlive: boolean }[]): Promise<ScannedDevice[]> {
    const enrichedDevices: ScannedDevice[] = [];
    
    for (const device of devices) {
      try {
        const deviceInfo = await this.getDeviceInfo(device.ip, device.mac);
        if (deviceInfo && deviceInfo.name && deviceInfo.deviceType && deviceInfo.protocol && typeof deviceInfo.rssi === 'number') {
          enrichedDevices.push({
            name: deviceInfo.name,
            deviceType: deviceInfo.deviceType,
            protocol: deviceInfo.protocol,
            rssi: deviceInfo.rssi,
            manufacturer: deviceInfo.manufacturer,
            model: deviceInfo.model,
            ipAddress: device.ip,
            macAddress: device.mac,
            isOnline: device.isAlive,
          });
        }
      } catch (error) {
        console.warn(`Could not enrich device ${device.ip}:`, error);
      }
    }
    
    return enrichedDevices;
  }

  private async getDeviceInfo(ip: string, mac: string): Promise<Partial<ScannedDevice> | null> {
    try {
      // Get hostname
      let hostname = 'Unknown Device';
      try {
        const { stdout } = await execAsync(`nslookup ${ip} | grep 'name ='`);
        const nameMatch = stdout.match(/name = (.+)/);
        if (nameMatch) {
          hostname = nameMatch[1].trim().replace(/\.$/, '');
        }
      } catch {
        // Try alternative method
        try {
          const { stdout } = await execAsync(`dig -x ${ip} +short`);
          if (stdout.trim()) {
            hostname = stdout.trim().replace(/\.$/, '');
          }
        } catch {
          // Keep default hostname
        }
      }

      // Detect device type and protocol
      const deviceType = this.detectDeviceType(hostname, mac);
      const protocol = this.detectProtocol(ip, deviceType);
      
      // Estimate RSSI based on ping response time
      const rssi = await this.estimateRSSI(ip);
      
      // Get manufacturer from MAC OUI
      const manufacturer = this.getManufacturerFromMAC(mac);

      return {
        name: hostname,
        deviceType,
        protocol,
        rssi,
        manufacturer,
      };
    } catch (error) {
      console.warn(`Error getting device info for ${ip}:`, error);
      return null;
    }
  }

  private async estimateRSSI(ip: string): Promise<number> {
    try {
      const result: any = await ping.promise.probe(ip, { timeout: 2 });
      if (result.alive && result.time !== 'unknown') {
        // Convert ping time to estimated RSSI
        // Lower ping time = better signal = higher RSSI
        const pingTime = typeof result.time === 'number' ? result.time : parseFloat(result.time as string);
        const rssi = Math.max(-80, -30 - (pingTime * 2)); // Rough estimation
        return Math.round(rssi);
      }
    } catch (error) {
      console.warn(`Could not estimate RSSI for ${ip}:`, error);
    }
    return -60; // Default moderate signal strength
  }

  private detectDeviceType(hostname: string, mac: string): string {
    const name = hostname.toLowerCase();
    
    if (name.includes('tv') || name.includes('samsung') || name.includes('lg') || name.includes('sony')) {
      return 'smart_tv';
    }
    if (name.includes('echo') || name.includes('alexa') || name.includes('speaker') || name.includes('sonos')) {
      return 'smart_speaker';
    }
    if (name.includes('thermostat') || name.includes('nest') || name.includes('ecobee')) {
      return 'thermostat';
    }
    if (name.includes('hue') || name.includes('bridge') || name.includes('philips')) {
      return 'hue_bridge';
    }
    if (name.includes('light') || name.includes('bulb') || name.includes('lamp')) {
      return 'smart_light';
    }
    if (name.includes('plug') || name.includes('outlet') || name.includes('switch')) {
      return 'smart_plug';
    }
    if (name.includes('camera') || name.includes('cam') || name.includes('ring') || name.includes('arlo')) {
      return 'security_camera';
    }
    if (name.includes('doorbell')) {
      return 'doorbell';
    }
    if (name.includes('fridge') || name.includes('refrigerator')) {
      return 'smart_fridge';
    }
    if (name.includes('router') || name.includes('gateway') || name.includes('modem')) {
      return 'network_device';
    }
    if (name.includes('iphone') || name.includes('android') || name.includes('phone')) {
      return 'mobile_device';
    }
    if (name.includes('laptop') || name.includes('macbook') || name.includes('pc')) {
      return 'computer';
    }
    
    return 'unknown_device';
  }

  private detectProtocol(ip: string, deviceType: string): string {
    // Most modern smart home devices use Wi-Fi
    if (['hue_bridge', 'smart_light'].includes(deviceType)) {
      return 'zigbee';
    }
    
    return 'wifi';
  }

  private getManufacturerFromMAC(mac: string): string {
    // Get OUI (first 3 octets) from MAC address
    const oui = mac.substring(0, 8).toUpperCase();
    
    // Common smart home device OUIs
    const ouiMap: { [key: string]: string } = {
      '00:17:88': 'Philips',
      '00:1A:22': 'Philips',
      'B8:27:EB': 'Raspberry Pi Foundation',
      '18:B4:30': 'Nest Labs',
      '64:16:66': 'Amazon',
      '68:37:E9': 'Amazon',
      '44:65:0D': 'Amazon',
      'FC:A6:67': 'Amazon',
      '50:F5:DA': 'LIFX',
      '28:6D:CD': 'Sonos',
      '5C:AA:FD': 'Sonos',
      '00:0E:58': 'Sonos',
      '08:00:69': 'Samsung',
      '00:16:32': 'Samsung',
      '28:CD:C1': 'Samsung',
      '18:F0:E4': 'LG Electronics',
      '64:BC:0C': 'LG Electronics',
    };
    
    return ouiMap[oui] || 'Unknown';
  }

  isScanning(): boolean {
    return this.scanning;
  }

  getLastScanResults(): ScannedDevice[] {
    return [...this.scanResults];
  }
}

export const networkScanner = NetworkDeviceScanner.getInstance();