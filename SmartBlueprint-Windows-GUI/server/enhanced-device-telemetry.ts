import { exec } from 'child_process';
import { promisify } from 'util';
import dgram from 'dgram';
import net from 'net';
import axios from 'axios';
import WebSocket from 'ws';

const execAsync = promisify(exec);

export interface DeviceTelemetryData {
  deviceId: string;
  mac: string;
  ip: string;
  timestamp: Date;
  rssi?: number;
  signalQuality?: number;
  packetLoss?: number;
  latency?: number;
  powerDraw?: number;
  temperature?: number;
  batteryLevel?: number;
  deviceSpecific: Record<string, any>;
}

export interface mDNSService {
  name: string;
  type: string;
  port: number;
  txt: Record<string, string>;
  addresses: string[];
  host: string;
}

export interface SSDPDevice {
  location: string;
  usn: string;
  st: string;
  server: string;
  cacheControl: string;
  ext: string;
  bootId?: string;
  configId?: string;
}

export interface UPnPDevice {
  friendlyName: string;
  manufacturer: string;
  modelName: string;
  modelNumber: string;
  serialNumber: string;
  udn: string;
  deviceType: string;
  services: UPnPService[];
  presentationURL?: string;
}

export interface UPnPService {
  serviceType: string;
  serviceId: string;
  controlURL: string;
  eventSubURL: string;
  scpdURL: string;
}

/**
 * Enhanced Device Telemetry Collection System
 * Implements mDNS, SSDP, UPnP discovery with real-time telemetry ingestion
 */
export class EnhancedDeviceTelemetry {
  private telemetryBuffer: Map<string, DeviceTelemetryData[]> = new Map();
  private deviceAPIs: Map<string, DeviceAPIAdapter> = new Map();
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring = false;

  constructor() {
    this.initializeMonitoring();
  }

  /**
   * Comprehensive mDNS service discovery
   */
  async discoverMDNSServices(): Promise<mDNSService[]> {
    console.log('🔍 Starting mDNS service discovery...');
    const services: mDNSService[] = [];

    try {
      // Use avahi-browse on Linux or dns-sd on macOS
      const command = process.platform === 'darwin' 
        ? 'dns-sd -B _services._dns-sd._udp local.' 
        : 'avahi-browse -rt _services._dns-sd._udp';
      
      const { stdout } = await execAsync(command);
      const lines = stdout.split('\n');

      for (const line of lines) {
        if (line.includes('_')) {
          const serviceType = line.match(/_[^.]+\._[^.]+/)?.[0];
          if (serviceType) {
            const serviceDetails = await this.resolveMDNSService(serviceType);
            if (serviceDetails) {
              services.push(serviceDetails);
            }
          }
        }
      }
    } catch (error) {
      console.log('mDNS discovery fallback to manual scanning...');
      // Fallback to common service scanning
      const commonServices = [
        '_http._tcp', '_https._tcp', '_printer._tcp', '_ipp._tcp',
        '_airplay._tcp', '_spotify-connect._tcp', '_googlecast._tcp',
        '_hue._tcp', '_philips-hue._tcp', '_smartthings._tcp'
      ];

      for (const serviceType of commonServices) {
        const service = await this.resolveMDNSService(serviceType);
        if (service) services.push(service);
      }
    }

    return services;
  }

  /**
   * Resolve specific mDNS service details
   */
  private async resolveMDNSService(serviceType: string): Promise<mDNSService | null> {
    try {
      const command = process.platform === 'darwin'
        ? `dns-sd -L "${serviceType}" local.`
        : `avahi-resolve-host-name "${serviceType}.local"`;
      
      const { stdout } = await execAsync(command);
      
      // Parse service resolution response
      const lines = stdout.split('\n');
      const serviceData: Partial<mDNSService> = {
        type: serviceType,
        txt: {},
        addresses: []
      };

      for (const line of lines) {
        if (line.includes('can be reached at')) {
          const match = line.match(/(\S+)\s+(\d+)/);
          if (match) {
            serviceData.host = match[1];
            serviceData.port = parseInt(match[2]);
          }
        }
        if (line.includes('txtvers=')) {
          const txtMatch = line.match(/txtvers=(\d+)/);
          if (txtMatch) {
            serviceData.txt!['txtvers'] = txtMatch[1];
          }
        }
      }

      return serviceData as mDNSService;
    } catch (error) {
      return null;
    }
  }

  /**
   * Enhanced SSDP discovery with device description parsing
   */
  async performEnhancedSSDPDiscovery(): Promise<SSDPDevice[]> {
    return new Promise((resolve) => {
      console.log('🔍 Enhanced SSDP discovery starting...');
      const devices: SSDPDevice[] = [];
      const socket = dgram.createSocket('udp4');

      const searchTargets = [
        'upnp:rootdevice',
        'ssdp:all',
        'urn:schemas-upnp-org:device:MediaRenderer:1',
        'urn:schemas-upnp-org:device:MediaServer:1',
        'urn:dial-multiscreen-org:service:dial:1',
        'urn:samsung.com:device:RemoteControlReceiver:1'
      ];

      let completedSearches = 0;

      for (const st of searchTargets) {
        const ssdpMessage = 
          'M-SEARCH * HTTP/1.1\r\n' +
          'HOST: 239.255.255.250:1900\r\n' +
          'MAN: "ssdp:discover"\r\n' +
          `ST: ${st}\r\n` +
          'MX: 3\r\n\r\n';

        socket.on('message', (msg, rinfo) => {
          const response = msg.toString();
          const device = this.parseSSDP(response, rinfo.address);
          if (device && !devices.find(d => d.usn === device.usn)) {
            devices.push(device);
          }
        });

        socket.send(ssdpMessage, 1900, '239.255.255.250', (err) => {
          if (!err) {
            completedSearches++;
            if (completedSearches === searchTargets.length) {
              setTimeout(() => {
                socket.close();
                resolve(devices);
              }, 3000);
            }
          }
        });
      }
    });
  }

  /**
   * Parse SSDP response into device object
   */
  private parseSSDP(response: string, sourceIP: string): SSDPDevice | null {
    const lines = response.split('\r\n');
    const device: Partial<SSDPDevice> = {};

    for (const line of lines) {
      const [key, ...valueParts] = line.split(': ');
      const value = valueParts.join(': ');

      switch (key.toUpperCase()) {
        case 'LOCATION':
          device.location = value;
          break;
        case 'USN':
          device.usn = value;
          break;
        case 'ST':
          device.st = value;
          break;
        case 'SERVER':
          device.server = value;
          break;
        case 'CACHE-CONTROL':
          device.cacheControl = value;
          break;
        case 'EXT':
          device.ext = value;
          break;
        case 'BOOTID.UPNP.ORG':
          device.bootId = value;
          break;
        case 'CONFIGID.UPNP.ORG':
          device.configId = value;
          break;
      }
    }

    return device.location && device.usn ? device as SSDPDevice : null;
  }

  /**
   * Fetch and parse UPnP device description
   */
  async fetchUPnPDescription(location: string): Promise<UPnPDevice | null> {
    try {
      const response = await axios.get(location, { timeout: 5000 });
      const xmlData = response.data;

      // Simple XML parsing for device information
      const device: Partial<UPnPDevice> = {
        services: []
      };

      // Extract basic device info
      device.friendlyName = this.extractXMLValue(xmlData, 'friendlyName');
      device.manufacturer = this.extractXMLValue(xmlData, 'manufacturer');
      device.modelName = this.extractXMLValue(xmlData, 'modelName');
      device.modelNumber = this.extractXMLValue(xmlData, 'modelNumber');
      device.serialNumber = this.extractXMLValue(xmlData, 'serialNumber');
      device.udn = this.extractXMLValue(xmlData, 'UDN');
      device.deviceType = this.extractXMLValue(xmlData, 'deviceType');
      device.presentationURL = this.extractXMLValue(xmlData, 'presentationURL');

      // Extract services
      const serviceMatches = xmlData.match(/<service>(.*?)<\/service>/gs);
      if (serviceMatches) {
        for (const serviceXML of serviceMatches) {
          const service: UPnPService = {
            serviceType: this.extractXMLValue(serviceXML, 'serviceType') || '',
            serviceId: this.extractXMLValue(serviceXML, 'serviceId') || '',
            controlURL: this.extractXMLValue(serviceXML, 'controlURL') || '',
            eventSubURL: this.extractXMLValue(serviceXML, 'eventSubURL') || '',
            scpdURL: this.extractXMLValue(serviceXML, 'SCPDURL') || ''
          };
          device.services!.push(service);
        }
      }

      return device as UPnPDevice;
    } catch (error) {
      console.log(`Failed to fetch UPnP description from ${location}:`, error.message);
      return null;
    }
  }

  /**
   * Simple XML value extraction
   */
  private extractXMLValue(xml: string, tag: string): string | null {
    const match = xml.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`, 's'));
    return match ? match[1].trim() : null;
  }

  /**
   * Initialize device-specific API adapters
   */
  private initializeDeviceAPIs(devices: any[]): void {
    for (const device of devices) {
      const adapter = this.createDeviceAdapter(device);
      if (adapter) {
        this.deviceAPIs.set(device.mac || device.ip, adapter);
      }
    }
  }

  /**
   * Create device-specific API adapter
   */
  private createDeviceAdapter(device: any): DeviceAPIAdapter | null {
    const deviceType = device.deviceType?.toLowerCase() || '';
    const vendor = device.vendor?.toLowerCase() || '';

    // Printer adapters
    if (deviceType.includes('printer') || vendor.includes('hp') || vendor.includes('canon')) {
      return new PrinterAPIAdapter(device);
    }

    // Gaming console adapters
    if (deviceType.includes('xbox') || deviceType.includes('playstation')) {
      return new GamingConsoleAdapter(device);
    }

    // Smart TV adapters
    if (deviceType.includes('tv') || vendor.includes('samsung') || vendor.includes('lg')) {
      return new SmartTVAdapter(device);
    }

    // Router/Network equipment
    if (deviceType.includes('router') || deviceType.includes('gateway')) {
      return new NetworkEquipmentAdapter(device);
    }

    // Generic HTTP API adapter
    if (device.capabilities?.hasHTTP) {
      return new GenericHTTPAdapter(device);
    }

    return null;
  }

  /**
   * Start continuous telemetry monitoring
   */
  private initializeMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(async () => {
      await this.collectTelemetryFromDevices();
    }, 5000); // Collect telemetry every 5 seconds

    console.log('📊 Device telemetry monitoring started');
  }

  /**
   * Collect telemetry from all registered devices
   */
  private async collectTelemetryFromDevices(): Promise<void> {
    const promises = Array.from(this.deviceAPIs.entries()).map(async ([deviceId, adapter]) => {
      try {
        const telemetry = await adapter.collectTelemetry();
        if (telemetry) {
          this.storeTelemetryData(deviceId, telemetry);
        }
      } catch (error) {
        console.log(`Telemetry collection failed for device ${deviceId}:`, error.message);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Store telemetry data in buffer
   */
  private storeTelemetryData(deviceId: string, telemetry: DeviceTelemetryData): void {
    if (!this.telemetryBuffer.has(deviceId)) {
      this.telemetryBuffer.set(deviceId, []);
    }

    const buffer = this.telemetryBuffer.get(deviceId)!;
    buffer.push(telemetry);

    // Keep only last 100 readings per device
    if (buffer.length > 100) {
      buffer.shift();
    }
  }

  /**
   * Get latest telemetry for device
   */
  getLatestTelemetry(deviceId: string): DeviceTelemetryData | null {
    const buffer = this.telemetryBuffer.get(deviceId);
    return buffer && buffer.length > 0 ? buffer[buffer.length - 1] : null;
  }

  /**
   * Get telemetry history for device
   */
  getTelemetryHistory(deviceId: string, limit: number = 50): DeviceTelemetryData[] {
    const buffer = this.telemetryBuffer.get(deviceId);
    if (!buffer) return [];
    
    return buffer.slice(-limit);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.isMonitoring = false;
    console.log('📊 Device telemetry monitoring stopped');
  }
}

/**
 * Base class for device API adapters
 */
abstract class DeviceAPIAdapter {
  protected device: any;
  protected baseURL: string;

  constructor(device: any) {
    this.device = device;
    this.baseURL = `http://${device.ip}`;
  }

  abstract collectTelemetry(): Promise<DeviceTelemetryData | null>;

  protected async httpGet(endpoint: string, timeout: number = 5000): Promise<any> {
    try {
      const response = await axios.get(`${this.baseURL}${endpoint}`, { timeout });
      return response.data;
    } catch (error) {
      throw new Error(`HTTP GET failed: ${error.message}`);
    }
  }

  protected async httpPost(endpoint: string, data: any, timeout: number = 5000): Promise<any> {
    try {
      const response = await axios.post(`${this.baseURL}${endpoint}`, data, { timeout });
      return response.data;
    } catch (error) {
      throw new Error(`HTTP POST failed: ${error.message}`);
    }
  }
}

/**
 * Printer API adapter for HP, Canon, Epson printers
 */
class PrinterAPIAdapter extends DeviceAPIAdapter {
  async collectTelemetry(): Promise<DeviceTelemetryData | null> {
    try {
      let telemetryData: any = {};

      // Try common printer API endpoints
      const endpoints = ['/DevMgmt/ProductStatusDyn.xml', '/status', '/api/status', '/ipp/status'];
      
      for (const endpoint of endpoints) {
        try {
          const data = await this.httpGet(endpoint, 3000);
          telemetryData = { ...telemetryData, ...this.parsePrinterStatus(data) };
          break;
        } catch (error) {
          continue; // Try next endpoint
        }
      }

      return {
        deviceId: this.device.mac || this.device.ip,
        mac: this.device.mac,
        ip: this.device.ip,
        timestamp: new Date(),
        deviceSpecific: {
          inkLevels: telemetryData.inkLevels,
          paperStatus: telemetryData.paperStatus,
          printerStatus: telemetryData.status,
          pageCount: telemetryData.pageCount,
          errorCode: telemetryData.errorCode
        }
      };
    } catch (error) {
      return null;
    }
  }

  private parsePrinterStatus(data: any): any {
    // Parse printer-specific status data
    if (typeof data === 'string' && data.includes('<')) {
      // XML response
      return {
        status: this.extractXMLValue(data, 'Status') || 'unknown',
        inkLevels: this.extractInkLevels(data),
        paperStatus: this.extractXMLValue(data, 'PaperStatus') || 'unknown'
      };
    } else if (typeof data === 'object') {
      // JSON response
      return {
        status: data.status || data.printerStatus || 'unknown',
        inkLevels: data.inkLevels || data.supplies,
        paperStatus: data.paperStatus || data.media
      };
    }
    return {};
  }

  private extractXMLValue(xml: string, tag: string): string | null {
    const match = xml.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`, 's'));
    return match ? match[1].trim() : null;
  }

  private extractInkLevels(xml: string): any {
    const inkMatches = xml.match(/<Consumable>(.*?)<\/Consumable>/gs);
    const levels: any = {};
    
    if (inkMatches) {
      for (const match of inkMatches) {
        const color = this.extractXMLValue(match, 'Color');
        const level = this.extractXMLValue(match, 'Level');
        if (color && level) {
          levels[color.toLowerCase()] = parseInt(level);
        }
      }
    }
    
    return levels;
  }
}

/**
 * Gaming console adapter for Xbox, PlayStation
 */
class GamingConsoleAdapter extends DeviceAPIAdapter {
  async collectTelemetry(): Promise<DeviceTelemetryData | null> {
    try {
      // Gaming consoles typically don't expose detailed APIs
      // We can check basic connectivity and power state
      const isReachable = await this.checkConnectivity();
      
      return {
        deviceId: this.device.mac || this.device.ip,
        mac: this.device.mac,
        ip: this.device.ip,
        timestamp: new Date(),
        deviceSpecific: {
          powerState: isReachable ? 'on' : 'standby',
          isReachable,
          consoleType: this.device.deviceType
        }
      };
    } catch (error) {
      return null;
    }
  }

  private async checkConnectivity(): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = 3000;

      socket.setTimeout(timeout);
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

      socket.connect(80, this.device.ip);
    });
  }
}

/**
 * Smart TV adapter for Samsung, LG, Sony TVs
 */
class SmartTVAdapter extends DeviceAPIAdapter {
  async collectTelemetry(): Promise<DeviceTelemetryData | null> {
    try {
      let telemetryData: any = {};

      // Try TV-specific endpoints
      const endpoints = ['/api/v2/', '/ws/apps', '/sony/', '/webos/'];
      
      for (const endpoint of endpoints) {
        try {
          const data = await this.httpGet(endpoint, 3000);
          telemetryData = { ...telemetryData, ...this.parseTVStatus(data) };
          break;
        } catch (error) {
          continue;
        }
      }

      return {
        deviceId: this.device.mac || this.device.ip,
        mac: this.device.mac,
        ip: this.device.ip,
        timestamp: new Date(),
        deviceSpecific: {
          powerState: telemetryData.powerState || 'unknown',
          currentApp: telemetryData.currentApp,
          volume: telemetryData.volume,
          brightness: telemetryData.brightness,
          isOnline: telemetryData.isOnline !== false
        }
      };
    } catch (error) {
      return null;
    }
  }

  private parseTVStatus(data: any): any {
    if (typeof data === 'object') {
      return {
        powerState: data.powerState || data.power || 'on',
        currentApp: data.currentApp || data.activeApp,
        volume: data.volume,
        brightness: data.brightness,
        isOnline: true
      };
    }
    return { isOnline: true };
  }
}

/**
 * Network equipment adapter for routers, switches
 */
class NetworkEquipmentAdapter extends DeviceAPIAdapter {
  async collectTelemetry(): Promise<DeviceTelemetryData | null> {
    try {
      let telemetryData: any = {};

      // Try common router endpoints
      const endpoints = ['/api/status', '/status.xml', '/admin/status', '/cgi-bin/status'];
      
      for (const endpoint of endpoints) {
        try {
          const data = await this.httpGet(endpoint, 3000);
          telemetryData = { ...telemetryData, ...this.parseNetworkStatus(data) };
          break;
        } catch (error) {
          continue;
        }
      }

      return {
        deviceId: this.device.mac || this.device.ip,
        mac: this.device.mac,
        ip: this.device.ip,
        timestamp: new Date(),
        deviceSpecific: {
          cpuUsage: telemetryData.cpuUsage,
          memoryUsage: telemetryData.memoryUsage,
          uptime: telemetryData.uptime,
          connectedClients: telemetryData.connectedClients,
          wifiStatus: telemetryData.wifiStatus
        }
      };
    } catch (error) {
      return null;
    }
  }

  private parseNetworkStatus(data: any): any {
    if (typeof data === 'object') {
      return {
        cpuUsage: data.cpu || data.cpuUsage,
        memoryUsage: data.memory || data.memoryUsage,
        uptime: data.uptime,
        connectedClients: data.clients || data.connectedDevices,
        wifiStatus: data.wifi || data.wireless
      };
    }
    return {};
  }
}

/**
 * Generic HTTP adapter for devices with basic HTTP APIs
 */
class GenericHTTPAdapter extends DeviceAPIAdapter {
  async collectTelemetry(): Promise<DeviceTelemetryData | null> {
    try {
      const data = await this.httpGet('/status', 3000);
      
      return {
        deviceId: this.device.mac || this.device.ip,
        mac: this.device.mac,
        ip: this.device.ip,
        timestamp: new Date(),
        deviceSpecific: data
      };
    } catch (error) {
      return null;
    }
  }
}

export const enhancedDeviceTelemetry = new EnhancedDeviceTelemetry();