import { NetworkDevice } from './network-discovery';

export interface TestDeviceProfile {
  name: string;
  mac: string;
  ip: string;
  vendor: string;
  deviceType: string;
  hostname?: string;
  services: string[];
}

/**
 * Test Device Discovery Service
 * Provides simulated smart home devices for testing the discovery system
 */
export class TestDeviceDiscovery {
  private testDeviceProfiles: TestDeviceProfile[] = [
    {
      name: 'Samsung Smart TV',
      mac: '00:0B:57:12:34:56',
      ip: '192.168.1.101',
      vendor: 'Samsung',
      deviceType: 'smart_tv',
      hostname: 'samsung-tv-living-room',
      services: ['upnp', 'dlna', 'smartview']
    },
    {
      name: 'Amazon Echo Dot',
      mac: 'FC:65:DE:78:90:AB',
      ip: '192.168.1.102',
      vendor: 'Amazon',
      deviceType: 'smart_speaker',
      hostname: 'echo-dot-kitchen',
      services: ['alexa', 'spotify', 'bluetooth']
    },
    {
      name: 'Philips Hue Bridge',
      mac: '00:17:88:CD:EF:12',
      ip: '192.168.1.103',
      vendor: 'Philips',
      deviceType: 'smart_hub',
      hostname: 'hue-bridge',
      services: ['hue-api', 'zigbee', 'homekit']
    },
    {
      name: 'Philips Hue Bulb - Living Room',
      mac: 'EC:FA:BC:34:56:78',
      ip: '192.168.1.104',
      vendor: 'Philips Hue',
      deviceType: 'smart_light',
      hostname: 'hue-bulb-1',
      services: ['zigbee', 'dimming', 'color']
    },
    {
      name: 'Google Nest Thermostat',
      mac: '54:2A:1B:90:12:34',
      ip: '192.168.1.105',
      vendor: 'Google Nest',
      deviceType: 'thermostat',
      hostname: 'nest-thermostat',
      services: ['nest-api', 'wifi', 'temperature']
    },
    {
      name: 'Ring Video Doorbell',
      mac: 'B8:E9:37:56:78:90',
      ip: '192.168.1.106',
      vendor: 'Ring',
      deviceType: 'security_camera',
      hostname: 'ring-doorbell',
      services: ['ring-api', 'video', 'motion']
    },
    {
      name: 'Sonos One Speaker',
      mac: '94:18:82:AB:CD:EF',
      ip: '192.168.1.107',
      vendor: 'Sonos',
      deviceType: 'smart_speaker',
      hostname: 'sonos-bedroom',
      services: ['sonos', 'airplay', 'spotify']
    },
    {
      name: 'TP-Link Kasa Smart Plug',
      mac: '50:C7:BF:12:34:56',
      ip: '192.168.1.108',
      vendor: 'TP-Link',
      deviceType: 'smart_plug',
      hostname: 'kasa-plug-1',
      services: ['kasa', 'energy-monitoring', 'scheduling']
    },
    {
      name: 'Apple TV 4K',
      mac: '28:CF:E9:78:90:AB',
      ip: '192.168.1.109',
      vendor: 'Apple',
      deviceType: 'streaming_device',
      hostname: 'apple-tv-living-room',
      services: ['airplay', 'homekit', 'appletv']
    },
    {
      name: 'LIFX Smart Bulb',
      mac: '5C:E0:C5:CD:EF:12',
      ip: '192.168.1.110',
      vendor: 'LIFX',
      deviceType: 'smart_light',
      hostname: 'lifx-bulb-bedroom',
      services: ['lifx-api', 'wifi', 'color']
    },
    {
      name: 'Xbox Series X',
      mac: '00:50:F2:34:56:78',
      ip: '192.168.1.111',
      vendor: 'Microsoft',
      deviceType: 'game_console',
      hostname: 'xbox-series-x',
      services: ['xbox-live', 'media', 'gaming']
    },
    {
      name: 'Ecobee Smart Thermostat',
      mac: '44:61:32:90:12:34',
      ip: '192.168.1.112',
      vendor: 'Ecobee',
      deviceType: 'thermostat',
      hostname: 'ecobee-thermostat',
      services: ['ecobee-api', 'wifi', 'sensors']
    }
  ];

  /**
   * Simulate network device discovery with realistic smart home devices
   */
  async simulateDeviceDiscovery(options: {
    includeVendorLookup: boolean;
    scanIntensive: boolean;
    deviceCount?: number;
  }): Promise<{
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
  }> {
    const startTime = Date.now();
    
    // Simulate scan delay based on options
    const scanDelay = options.scanIntensive ? 2000 : 1000;
    await new Promise(resolve => setTimeout(resolve, scanDelay));

    // Select devices to return
    const deviceCount = options.deviceCount || (options.scanIntensive ? 12 : 8);
    const selectedProfiles = this.testDeviceProfiles.slice(0, deviceCount);

    // Convert to NetworkDevice format
    const devices: NetworkDevice[] = selectedProfiles.map(profile => ({
      ip: profile.ip,
      mac: profile.mac,
      hostname: profile.hostname,
      vendor: options.includeVendorLookup ? profile.vendor : undefined,
      deviceType: profile.deviceType,
      deviceName: profile.name,
      isOnline: true,
      lastSeen: new Date(),
      services: profile.services
    }));

    const scanDuration = Date.now() - startTime;

    return {
      devices,
      networkInfo: {
        gateway: '192.168.1.1',
        subnet: '192.168.1',
        totalHosts: devices.length
      },
      scanDuration,
      privacy: {
        dataStaysLocal: true,
        noExternalTransmission: true
      }
    };
  }

  /**
   * Get device profiles for specific room types
   */
  getDevicesForRoom(roomType: string): TestDeviceProfile[] {
    const roomDeviceMap: { [key: string]: string[] } = {
      'living_room': ['Samsung Smart TV', 'Apple TV 4K', 'Sonos One Speaker', 'Philips Hue Bulb - Living Room'],
      'kitchen': ['Amazon Echo Dot', 'TP-Link Kasa Smart Plug'],
      'bedroom': ['LIFX Smart Bulb', 'Sonos One Speaker'],
      'office': ['TP-Link Kasa Smart Plug', 'Ring Video Doorbell'],
      'hallway': ['Philips Hue Bridge', 'Google Nest Thermostat']
    };

    const deviceNames = roomDeviceMap[roomType] || [];
    return this.testDeviceProfiles.filter(profile => 
      deviceNames.includes(profile.name)
    );
  }

  /**
   * Add custom test device
   */
  addTestDevice(profile: TestDeviceProfile): void {
    this.testDeviceProfiles.push(profile);
  }

  /**
   * Get all available test devices
   */
  getAllTestDevices(): TestDeviceProfile[] {
    return [...this.testDeviceProfiles];
  }

  /**
   * Simulate device going offline/online
   */
  async simulateDeviceStatusChange(deviceMac: string, isOnline: boolean): Promise<void> {
    // This would update the device status in a real implementation
    console.log(`Device ${deviceMac} is now ${isOnline ? 'online' : 'offline'}`);
  }
}

export const testDeviceDiscovery = new TestDeviceDiscovery();