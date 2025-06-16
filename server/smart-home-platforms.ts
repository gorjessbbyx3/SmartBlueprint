/**
 * Smart Home Platform Integration System
 * Integrates with Philips Hue, Nest, and Alexa platforms
 */

interface PlatformAdapter {
  platform: string;
  authenticate(credentials: any): Promise<AuthResult>;
  discoverDevices(accessToken: string): Promise<PlatformDevice[]>;
  getDeviceState(deviceId: string, accessToken: string): Promise<any>;
  controlDevice(deviceId: string, command: any, accessToken: string): Promise<boolean>;
  syncDevices(accessToken: string): Promise<void>;
}

interface AuthResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  bridgeIp?: string;
  error?: string;
}

interface PlatformDevice {
  platformDeviceId: string;
  name: string;
  type: string;
  capabilities: any;
  state: any;
  location?: { x?: number; y?: number };
}

/**
 * Philips Hue Bridge Integration
 * Uses local bridge API for fast, reliable control
 */
export class PhilipsHueAdapter implements PlatformAdapter {
  platform = 'philips_hue';
  private bridgeIp?: string;

  async authenticate(credentials: { bridgeIp?: string }): Promise<AuthResult> {
    try {
      // Discover bridge if IP not provided
      if (!credentials.bridgeIp) {
        const bridgeIp = await this.discoverBridge();
        if (!bridgeIp) {
          return { success: false, error: 'No Philips Hue bridge found on network' };
        }
        this.bridgeIp = bridgeIp;
      } else {
        this.bridgeIp = credentials.bridgeIp;
      }

      // Create user/app registration
      const response = await fetch(`http://${this.bridgeIp}/api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          devicetype: 'SmartBlueprint Pro#desktop_agent'
        })
      });

      const result = await response.json();
      
      if (result[0]?.error?.type === 101) {
        return { 
          success: false, 
          error: 'Press the bridge button and try again within 30 seconds',
          bridgeIp: this.bridgeIp
        };
      }

      if (result[0]?.success?.username) {
        return {
          success: true,
          accessToken: result[0].success.username,
          bridgeIp: this.bridgeIp
        };
      }

      return { success: false, error: 'Failed to authenticate with Hue bridge' };
    } catch (error: any) {
      return { success: false, error: `Bridge connection failed: ${error.message}` };
    }
  }

  async discoverBridge(): Promise<string | null> {
    try {
      // Try N-UPnP discovery first
      const response = await fetch('https://discovery.meethue.com/');
      const bridges = await response.json();
      
      if (bridges.length > 0) {
        return bridges[0].internalipaddress;
      }

      // Fallback to local network scanning
      return await this.scanLocalNetwork();
    } catch {
      return null;
    }
  }

  async scanLocalNetwork(): Promise<string | null> {
    // Basic IP range scanning for Hue bridge
    const baseIp = '192.168.1.'; // Common router range
    const promises = [];

    for (let i = 1; i <= 254; i++) {
      const ip = baseIp + i;
      promises.push(this.checkHueBridge(ip));
    }

    const results = await Promise.allSettled(promises);
    const found = results.find(result => 
      result.status === 'fulfilled' && result.value
    );

    return found ? (found as PromiseFulfilledResult<string>).value : null;
  }

  async checkHueBridge(ip: string): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);
      
      const response = await fetch(`http://${ip}/api/config`, { 
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      
      const config = await response.json();
      
      if (config.name && config.modelid) {
        return ip;
      }
    } catch {
      // Ignore timeout/connection errors
    }
    return null;
  }

  async discoverDevices(accessToken: string): Promise<PlatformDevice[]> {
    try {
      const response = await fetch(`http://${this.bridgeIp}/api/${accessToken}/lights`);
      const lights = await response.json();

      return Object.entries(lights).map(([id, light]: [string, any]) => ({
        platformDeviceId: id,
        name: light.name,
        type: 'light',
        capabilities: {
          brightness: light.capabilities?.control?.maxlumen || 800,
          colorTemperature: light.capabilities?.control?.ct || null,
          color: light.capabilities?.control?.colorgamut || null,
          reachable: light.state?.reachable || false
        },
        state: {
          on: light.state?.on || false,
          brightness: light.state?.bri || 0,
          colorTemp: light.state?.ct || null,
          color: light.state?.xy || null
        }
      }));
    } catch (error) {
      console.error('Hue device discovery failed:', error);
      return [];
    }
  }

  async getDeviceState(deviceId: string, accessToken: string): Promise<any> {
    try {
      const response = await fetch(`http://${this.bridgeIp}/api/${accessToken}/lights/${deviceId}`);
      const light = await response.json();
      
      return {
        on: light.state?.on || false,
        brightness: light.state?.bri || 0,
        colorTemp: light.state?.ct || null,
        color: light.state?.xy || null,
        reachable: light.state?.reachable || false
      };
    } catch (error) {
      console.error('Failed to get Hue device state:', error);
      return null;
    }
  }

  async controlDevice(deviceId: string, command: any, accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`http://${this.bridgeIp}/api/${accessToken}/lights/${deviceId}/state`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command)
      });

      const result = await response.json();
      return result.every((r: any) => r.success);
    } catch (error) {
      console.error('Hue device control failed:', error);
      return false;
    }
  }

  async syncDevices(accessToken: string): Promise<void> {
    // Implemented in platform manager
  }
}

/**
 * Nest Thermostat Integration
 * Uses Google Device Access API
 */
export class NestAdapter implements PlatformAdapter {
  platform = 'nest';
  private readonly baseUrl = 'https://smartdevicemanagement.googleapis.com/v1';

  async authenticate(credentials: { clientId: string; clientSecret: string; authCode: string }): Promise<AuthResult> {
    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          code: credentials.authCode,
          grant_type: 'authorization_code',
          redirect_uri: 'http://localhost:5000/auth/nest/callback'
        })
      });

      const tokens = await tokenResponse.json();
      
      if (tokens.access_token) {
        return {
          success: true,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresIn: tokens.expires_in
        };
      }

      return { success: false, error: 'Failed to get Nest access token' };
    } catch (error: any) {
      return { success: false, error: `Nest authentication failed: ${error.message}` };
    }
  }

  async discoverDevices(accessToken: string): Promise<PlatformDevice[]> {
    try {
      const response = await fetch(`${this.baseUrl}/enterprises/project-id/devices`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      const data = await response.json();
      
      return (data.devices || []).map((device: any) => ({
        platformDeviceId: device.name,
        name: device.displayName || device.type,
        type: this.getDeviceType(device.type),
        capabilities: {
          heating: device.traits?.['sdm.devices.traits.ThermostatHvac']?.status === 'HEATING',
          cooling: device.traits?.['sdm.devices.traits.ThermostatHvac']?.status === 'COOLING',
          temperature: true,
          humidity: !!device.traits?.['sdm.devices.traits.Humidity']
        },
        state: {
          temperature: device.traits?.['sdm.devices.traits.Temperature']?.ambientTemperatureCelsius,
          targetTemp: device.traits?.['sdm.devices.traits.ThermostatTemperatureSetpoint']?.thermostatTemperatureSetpoint,
          humidity: device.traits?.['sdm.devices.traits.Humidity']?.ambientHumidityPercent,
          hvacStatus: device.traits?.['sdm.devices.traits.ThermostatHvac']?.status
        }
      }));
    } catch (error) {
      console.error('Nest device discovery failed:', error);
      return [];
    }
  }

  private getDeviceType(nestType: string): string {
    if (nestType.includes('THERMOSTAT')) return 'thermostat';
    if (nestType.includes('CAMERA')) return 'camera';
    if (nestType.includes('DOORBELL')) return 'doorbell';
    return 'sensor';
  }

  async getDeviceState(deviceId: string, accessToken: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/${deviceId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      const device = await response.json();
      
      return {
        temperature: device.traits?.['sdm.devices.traits.Temperature']?.ambientTemperatureCelsius,
        targetTemp: device.traits?.['sdm.devices.traits.ThermostatTemperatureSetpoint']?.thermostatTemperatureSetpoint,
        humidity: device.traits?.['sdm.devices.traits.Humidity']?.ambientHumidityPercent,
        hvacStatus: device.traits?.['sdm.devices.traits.ThermostatHvac']?.status
      };
    } catch (error) {
      console.error('Failed to get Nest device state:', error);
      return null;
    }
  }

  async controlDevice(deviceId: string, command: any, accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${deviceId}:executeCommand`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          command: 'sdm.devices.commands.ThermostatTemperatureSetpoint.SetHeat',
          params: {
            heatCelsius: command.targetTemp
          }
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Nest device control failed:', error);
      return false;
    }
  }

  async syncDevices(accessToken: string): Promise<void> {
    // Implemented in platform manager
  }
}

/**
 * Alexa Device Integration
 * Uses Alexa Voice Service API
 */
export class AlexaAdapter implements PlatformAdapter {
  platform = 'alexa';
  private readonly baseUrl = 'https://api.amazonalexa.com/v1';

  async authenticate(credentials: { clientId: string; clientSecret: string; authCode: string }): Promise<AuthResult> {
    try {
      const tokenResponse = await fetch('https://api.amazon.com/auth/o2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: credentials.authCode,
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          redirect_uri: 'http://localhost:5000/auth/alexa/callback'
        })
      });

      const tokens = await tokenResponse.json();
      
      if (tokens.access_token) {
        return {
          success: true,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresIn: tokens.expires_in
        };
      }

      return { success: false, error: 'Failed to get Alexa access token' };
    } catch (error: any) {
      return { success: false, error: `Alexa authentication failed: ${error.message}` };
    }
  }

  async discoverDevices(accessToken: string): Promise<PlatformDevice[]> {
    try {
      const response = await fetch(`${this.baseUrl}/appliances`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      const data = await response.json();
      
      return (data.discoveredAppliances || []).map((device: any) => ({
        platformDeviceId: device.applianceId,
        name: device.friendlyName,
        type: this.getDeviceType(device.applianceTypes),
        capabilities: {
          turnOn: device.actions?.includes('turnOn'),
          turnOff: device.actions?.includes('turnOff'),
          setBrightness: device.actions?.includes('setBrightness'),
          setTemperature: device.actions?.includes('setTemperature')
        },
        state: {
          // Alexa doesn't provide current state in discovery
          // State must be queried separately
        }
      }));
    } catch (error) {
      console.error('Alexa device discovery failed:', error);
      return [];
    }
  }

  private getDeviceType(applianceTypes: string[]): string {
    if (applianceTypes.includes('LIGHT')) return 'light';
    if (applianceTypes.includes('SMARTPLUG')) return 'switch';
    if (applianceTypes.includes('THERMOSTAT')) return 'thermostat';
    if (applianceTypes.includes('SPEAKER')) return 'speaker';
    return 'unknown';
  }

  async getDeviceState(deviceId: string, accessToken: string): Promise<any> {
    // Alexa doesn't provide a direct state query API
    // Would need to implement through smart home skill
    return { available: true };
  }

  async controlDevice(deviceId: string, command: any, accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/appliances/${deviceId}/commands`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(command)
      });

      return response.ok;
    } catch (error) {
      console.error('Alexa device control failed:', error);
      return false;
    }
  }

  async syncDevices(accessToken: string): Promise<void> {
    // Implemented in platform manager
  }
}

/**
 * Smart Home Platform Manager
 * Orchestrates all platform integrations
 */
export class SmartHomePlatformManager {
  private adapters: Map<string, PlatformAdapter> = new Map();

  constructor() {
    this.adapters.set('philips_hue', new PhilipsHueAdapter());
    this.adapters.set('nest', new NestAdapter());
    this.adapters.set('alexa', new AlexaAdapter());
  }

  getAdapter(platform: string): PlatformAdapter | undefined {
    return this.adapters.get(platform);
  }

  getSupportedPlatforms(): string[] {
    return Array.from(this.adapters.keys());
  }

  async authenticatePlatform(platform: string, credentials: any): Promise<AuthResult> {
    const adapter = this.getAdapter(platform);
    if (!adapter) {
      return { success: false, error: 'Unsupported platform' };
    }

    return await adapter.authenticate(credentials);
  }

  async discoverDevices(platform: string, accessToken: string): Promise<PlatformDevice[]> {
    const adapter = this.getAdapter(platform);
    if (!adapter) {
      return [];
    }

    return await adapter.discoverDevices(accessToken);
  }

  async controlDevice(platform: string, deviceId: string, command: any, accessToken: string): Promise<boolean> {
    const adapter = this.getAdapter(platform);
    if (!adapter) {
      return false;
    }

    return await adapter.controlDevice(deviceId, command, accessToken);
  }

  async syncAllPlatforms(integrations: any[]): Promise<void> {
    for (const integration of integrations) {
      const adapter = this.getAdapter(integration.platform);
      if (adapter && integration.isActive) {
        try {
          await adapter.syncDevices(integration.accessToken);
        } catch (error) {
          console.error(`Sync failed for ${integration.platform}:`, error);
        }
      }
    }
  }
}

export const smartHomePlatformManager = new SmartHomePlatformManager();