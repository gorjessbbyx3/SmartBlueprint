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
    const networkRanges = [
      { gateway: '192.168.1.1', subnet: '192.168.1' },
      { gateway: '192.168.0.1', subnet: '192.168.0' },
      { gateway: '10.0.0.1', subnet: '10.0.0' },
      { gateway: '172.16.0.1', subnet: '172.16.0' },
      { gateway: '192.168.2.1', subnet: '192.168.2' }
    ];

    try {
      // Try to detect current network interface
      const { stdout } = await execAsync('hostname -I 2>/dev/null || echo "127.0.0.1"');
      const localIps = stdout.trim().split(' ').filter(ip => ip.match(/^\d+\.\d+\.\d+\.\d+$/));
      
      if (localIps.length > 0) {
        for (const ip of localIps) {
          if (!ip.startsWith('127.')) {
            const parts = ip.split('.');
            const subnet = `${parts[0]}.${parts[1]}.${parts[2]}`;
            const gateway = `${subnet}.1`;
            console.log(`Detected local network: ${subnet}.0/24`);
            return { gateway, subnet };
          }
        }
      }

      // Try multiple detection methods
      const methods = [
        'cat /proc/net/route 2>/dev/null | awk \'NR>1 && $2=="00000000" {printf "%d.%d.%d.%d\\n", ("0x" substr($3,7,2)), ("0x" substr($3,5,2)), ("0x" substr($3,3,2)), ("0x" substr($3,1,2))}\'',
        'netstat -rn 2>/dev/null | grep "^0.0.0.0" | awk \'{print $2}\'',
        'route -n 2>/dev/null | grep "^0.0.0.0" | awk \'{print $2}\''
      ];

      for (const method of methods) {
        try {
          const { stdout } = await execAsync(method);
          const gateway = stdout.trim().split('\n')[0];
          if (gateway && gateway.match(/^\d+\.\d+\.\d+\.\d+$/)) {
            const subnet = gateway.substring(0, gateway.lastIndexOf('.'));
            console.log(`Detected gateway via ${method.split(' ')[0]}: ${gateway}`);
            return { gateway, subnet };
          }
        } catch (e) {
          continue;
        }
      }
    } catch (error) {
      console.warn('Network detection failed:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Default to most common network range
    console.log('Using default network range: 192.168.1.0/24');
    return networkRanges[0];
  }

  private async scanLocalNetwork(networkInfo: { gateway: string; subnet: string }): Promise<{ ip: string; mac: string; isAlive: boolean }[]> {
    const devices: { ip: string; mac: string; isAlive: boolean }[] = [];
    const { subnet } = networkInfo;
    
    console.log(`Scanning subnet ${subnet}.0/24...`);
    
    try {
      // Try multiple network discovery methods
      const discoveryMethods = [
        // Method 1: nmap if available
        async () => {
          const { stdout } = await execAsync(`nmap -sn ${subnet}.0/24 2>/dev/null || true`);
          const lines = stdout.split('\n');
          const foundIps: string[] = [];
          
          for (const line of lines) {
            const ipMatch = line.match(/Nmap scan report for (\d+\.\d+\.\d+\.\d+)/);
            if (ipMatch) {
              foundIps.push(ipMatch[1]);
            }
          }
          return foundIps;
        },
        
        // Method 2: arp-scan if available  
        async () => {
          const { stdout } = await execAsync(`arp-scan -l 2>/dev/null || arp-scan ${subnet}.0/24 2>/dev/null || true`);
          const lines = stdout.split('\n');
          const foundIps: string[] = [];
          
          for (const line of lines) {
            const ipMatch = line.match(/^(\d+\.\d+\.\d+\.\d+)\s+([0-9a-fA-F:]{17})/);
            if (ipMatch) {
              foundIps.push(ipMatch[1]);
            }
          }
          return foundIps;
        },
        
        // Method 3: Check ARP table for existing entries
        async () => {
          const { stdout } = await execAsync(`arp -a 2>/dev/null || cat /proc/net/arp 2>/dev/null || true`);
          const lines = stdout.split('\n');
          const foundIps: string[] = [];
          
          for (const line of lines) {
            const ipMatch = line.match(/(\d+\.\d+\.\d+\.\d+)/);
            if (ipMatch && ipMatch[1].startsWith(subnet)) {
              foundIps.push(ipMatch[1]);
            }
          }
          return foundIps;
        }
      ];

      let discoveredIps: string[] = [];
      
      for (let i = 0; i < discoveryMethods.length; i++) {
        try {
          const ips = await discoveryMethods[i]();
          if (ips.length > 0) {
            console.log(`Discovery method ${i + 1} found ${ips.length} hosts`);
            const uniqueIps = new Set([...discoveredIps, ...ips]);
            discoveredIps = [];
            uniqueIps.forEach(ip => discoveredIps.push(ip));
          }
        } catch (error) {
          console.log(`Discovery method ${i + 1} failed:`, error instanceof Error ? error.message : 'Unknown error');
        }
      }

      // Process discovered IPs
      if (discoveredIps.length > 0) {
        console.log(`Processing ${discoveredIps.length} discovered hosts...`);
        
        for (const ip of discoveredIps) {
          console.log(`Found active host: ${ip}`);
          const mac = await this.getMacAddress(ip);
          if (mac) {
            devices.push({ ip, mac, isAlive: true });
          }
        }
      } else {
        console.warn('No hosts discovered with automated methods, using ping sweep...');
        
        // In container environments, demonstrate with localhost scanning
        console.log('Scanning container environment for available services...');
        
        // Check for commonly used ports and services that might indicate device presence
        const commonPorts = [22, 80, 443, 8080, 5000, 3000, 1883, 502, 161];
        const localhost = '127.0.0.1';
        
        for (const port of commonPorts) {
          try {
            const { stdout } = await execAsync(`timeout 1 bash -c "</dev/tcp/${localhost}/${port}" 2>/dev/null && echo "open" || echo "closed"`);
            if (stdout.includes('open')) {
              console.log(`Found service on localhost:${port}`);
              // This demonstrates the scanning capability
            }
          } catch (e) {
            // Port not available
          }
        }
        
        // Attempt to discover actual network devices through comprehensive scanning
        const scanPromises: Promise<void>[] = [];
        const batchSize = 20;
        
        for (let i = 1; i <= 254; i += batchSize) {
          const batch = [];
          for (let j = 0; j < batchSize && (i + j) <= 254; j++) {
            const ip = `${subnet}.${i + j}`;
            batch.push(
              this.pingHost(ip).then(async (isAlive) => {
                if (isAlive) {
                  console.log(`Active host found: ${ip}`);
                  const mac = await this.getMacAddress(ip);
                  if (mac) {
                    devices.push({ ip, mac, isAlive: true });
                  } else {
                    // Generate MAC for active hosts where ARP lookup fails
                    const lastOctet = ip.split('.').pop() || '1';
                    const generatedMac = `02:00:00:00:00:${parseInt(lastOctet).toString(16).padStart(2, '0')}`;
                    devices.push({ ip, mac: generatedMac.toUpperCase(), isAlive: true });
                  }
                }
              }).catch(() => {
                // Host not reachable
              })
            );
          }
          scanPromises.push(Promise.allSettled(batch).then(() => {}));
        }
        
        await Promise.allSettled(scanPromises);
        console.log(`Ping sweep completed. Found ${devices.length} active hosts`);
        
        // In container environments, also check for common smart home device ports
        const commonDeviceChecks = [
          { ip: networkInfo.gateway, port: 80, deviceType: 'router', name: 'Network Router' },
          { ip: `${subnet}.100`, port: 7001, deviceType: 'smart_tv', name: 'Smart TV' },
          { ip: `${subnet}.101`, port: 1883, deviceType: 'iot_hub', name: 'IoT Hub' },
          { ip: `${subnet}.102`, port: 5353, deviceType: 'smart_speaker', name: 'Smart Speaker' }
        ];
        
        for (const check of commonDeviceChecks) {
          try {
            const { stdout } = await execAsync(`timeout 2 bash -c "echo >/dev/tcp/${check.ip}/${check.port}" 2>/dev/null && echo "open" || echo "closed"`);
            if (stdout.includes('open')) {
              console.log(`Found ${check.deviceType} service at ${check.ip}:${check.port}`);
              const mac = await this.getMacAddress(check.ip) || `02:${check.ip.split('.').slice(1).map(n => parseInt(n).toString(16).padStart(2, '0')).join(':')}`;
              devices.push({ ip: check.ip, mac: mac.toUpperCase(), isAlive: true });
            }
          } catch (e) {
            // Service not available
          }
        }
      }
    } catch (error) {
      console.error('Network scan failed:', error);
    }
    
    console.log(`Network scan found ${devices.length} active devices`);
    return devices;
  }

  private async pingHost(ip: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`ping -c 1 -W 1 ${ip} 2>/dev/null || true`);
      return stdout.includes('1 received') || stdout.includes('1 packets transmitted, 1 received');
    } catch {
      return false;
    }
  }

  private async getMacAddress(ip: string): Promise<string | null> {
    try {
      // Use system ARP table to get MAC address
      const { stdout } = await execAsync(`arp -n ${ip} 2>/dev/null || true`);
      const macMatch = stdout.match(/([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}/);
      
      if (macMatch) {
        return macMatch[0].toUpperCase().replace(/:/g, ':');
      }
      
      // Alternative: try ip neighbor command
      try {
        const { stdout: ipOutput } = await execAsync(`ip neighbor show ${ip} 2>/dev/null || true`);
        const ipMacMatch = ipOutput.match(/([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}/);
        
        if (ipMacMatch) {
          return ipMacMatch[0].toUpperCase().replace(/:/g, ':');
        }
      } catch {
        // Ignore error
      }
      
      return null;
    } catch (error) {
      console.warn(`Could not get MAC for ${ip}:`, error);
      return null;
    }
  }

  private async enrichDeviceData(devices: { ip: string; mac: string; isAlive: boolean }[]): Promise<ScannedDevice[]> {
    const enrichedDevices: ScannedDevice[] = [];
    
    for (const device of devices) {
      try {
        const deviceInfo = await this.getDeviceInfo(device.ip, device.mac);
        const rssi = await this.estimateRSSI(device.ip);
        
        const enrichedDevice: ScannedDevice = {
          name: deviceInfo?.name || `Device-${device.ip.split('.').pop()}`,
          macAddress: device.mac,
          deviceType: deviceInfo?.deviceType || this.detectDeviceType(deviceInfo?.name || '', device.mac),
          protocol: deviceInfo?.protocol || this.detectProtocol(device.ip, deviceInfo?.deviceType || 'unknown'),
          rssi,
          ipAddress: device.ip,
          manufacturer: deviceInfo?.manufacturer || this.getManufacturerFromMAC(device.mac),
          model: deviceInfo?.model || 'Unknown',
          isOnline: device.isAlive
        };
        
        enrichedDevices.push(enrichedDevice);
        console.log(`Enriched device: ${enrichedDevice.name} (${enrichedDevice.deviceType})`);
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
      // Use ping to estimate signal quality based on response time
      const { stdout } = await execAsync(`ping -c 3 -W 2 ${ip} 2>/dev/null || true`);
      
      const timeMatch = stdout.match(/time=(\d+\.?\d*)/g);
      if (timeMatch && timeMatch.length > 0) {
        // Calculate average ping time
        const times = timeMatch.map(t => parseFloat(t.replace('time=', '')));
        const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
        
        // Convert ping time to estimated RSSI
        // Lower ping time = better signal = higher RSSI
        const rssi = Math.max(-80, -30 - (avgTime * 2)); // Rough estimation
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