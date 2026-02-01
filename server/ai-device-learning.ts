/**
 * AI Device Learning Service
 *
 * Learns device-to-resident associations over time:
 * 1. Detects new/unknown devices on the network
 * 2. Prompts user to identify the device owner
 * 3. Learns patterns (device behavior, connection times, etc.)
 * 4. Predicts resident presence based on device activity
 * 5. Tracks "humans at home" count based on learned associations
 */

import { EventEmitter } from 'events';
import { storage } from './storage';
import { smartDepartureDetection, DepartureEvent } from './smart-departure-detection';

export interface UnidentifiedDevice {
  id: string;
  macAddress: string;
  name: string;
  deviceType: string;
  firstSeen: Date;
  lastSeen: Date;
  seenCount: number;
  signalStrength?: number;
  manufacturer?: string;
  isPromptPending: boolean;
  suggestedResident?: number; // AI suggestion based on patterns
  confidence?: number;
}

export interface DeviceLearningEvent {
  type: 'new_device' | 'device_identified' | 'resident_arrived' | 'resident_departed' |
        'human_count_changed' | 'learning_prompt' | 'pattern_learned';
  device?: UnidentifiedDevice;
  residentId?: number;
  residentName?: string;
  humanCount?: number;
  message?: string;
  timestamp: Date;
}

export interface ResidentPresenceInfo {
  residentId: number;
  residentName: string;
  isHome: boolean;
  deviceName?: string;
  lastSeen?: Date;
  arrivedAt?: Date;
}

interface DevicePattern {
  macAddress: string;
  typicalArrivalTimes: number[]; // Hours of day (0-23)
  typicalDepartureTimes: number[];
  averageSessionDuration: number; // minutes
  coOccurringDevices: string[]; // Other devices often seen together
  connectionFrequency: number; // times per day
}

export class AIDeviceLearningService extends EventEmitter {
  private static instance: AIDeviceLearningService;
  private isRunning = false;
  private unidentifiedDevices: Map<string, UnidentifiedDevice> = new Map();
  private devicePatterns: Map<string, DevicePattern> = new Map();
  private residentPresence: Map<number, ResidentPresenceInfo> = new Map();
  private humanCount = 0;

  // Configuration
  private readonly NEW_DEVICE_THRESHOLD = 2; // See device this many times before prompting
  private readonly DEVICE_TIMEOUT = 300000; // 5 minutes - consider departed
  private checkInterval: NodeJS.Timeout | null = null;

  private constructor() {
    super();
  }

  static getInstance(): AIDeviceLearningService {
    if (!AIDeviceLearningService.instance) {
      AIDeviceLearningService.instance = new AIDeviceLearningService();
    }
    return AIDeviceLearningService.instance;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[AILearning] Already running');
      return;
    }

    console.log('[AILearning] Starting AI device learning service...');
    this.isRunning = true;

    // Load existing resident devices and their presence status
    await this.loadResidentDevices();

    // Start smart departure detection
    await smartDepartureDetection.start();

    // Listen for smart departure events
    smartDepartureDetection.on('departure', (event: DepartureEvent) => {
      this.handleSmartDepartureEvent(event);
    });

    // Start periodic presence checking
    this.checkInterval = setInterval(() => {
      this.checkPresenceStatus();
    }, 30000); // Check every 30 seconds

    console.log('[AILearning] AI device learning service started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    console.log('[AILearning] AI device learning service stopped');
  }

  private async loadResidentDevices(): Promise<void> {
    try {
      const residents = await storage.getResidents();

      for (const resident of residents) {
        const devices = await storage.getResidentDevices(resident.id);
        const primaryDevice = devices.find(d => d.isPrimary);

        this.residentPresence.set(resident.id, {
          residentId: resident.id,
          residentName: resident.name,
          isHome: false,
          deviceName: primaryDevice?.deviceName,
          lastSeen: resident.lastSeen || undefined
        });
      }

      console.log(`[AILearning] Loaded ${this.residentPresence.size} residents`);
    } catch (error) {
      console.error('[AILearning] Failed to load residents:', error);
    }
  }

  /**
   * Called when a device is detected on the network
   * This is the main entry point for the learning system
   */
  async onDeviceDetected(
    macAddress: string,
    name: string,
    deviceType: string,
    signalStrength?: number,
    manufacturer?: string
  ): Promise<void> {
    const mac = macAddress.toLowerCase();
    const now = new Date();

    // Check if this is a known resident device
    const residentDevice = await this.checkIfResidentDevice(mac);
    if (residentDevice) {
      await this.handleResidentDeviceSeen(residentDevice, now);
      return;
    }

    // Check if we're already tracking this unidentified device
    const existing = this.unidentifiedDevices.get(mac);

    if (existing) {
      // Update existing unidentified device
      existing.lastSeen = now;
      existing.seenCount++;
      existing.signalStrength = signalStrength;

      // If seen enough times and not yet prompted, trigger learning prompt
      if (existing.seenCount >= this.NEW_DEVICE_THRESHOLD && !existing.isPromptPending) {
        existing.isPromptPending = true;

        // Try to suggest a resident based on patterns
        const suggestion = await this.suggestDeviceOwner(existing);
        if (suggestion) {
          existing.suggestedResident = suggestion.residentId;
          existing.confidence = suggestion.confidence;
        }

        this.emitLearningPrompt(existing);
      }
    } else {
      // New unidentified device
      const device: UnidentifiedDevice = {
        id: `unid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        macAddress: mac,
        name: name || 'Unknown Device',
        deviceType: deviceType || 'unknown',
        firstSeen: now,
        lastSeen: now,
        seenCount: 1,
        signalStrength,
        manufacturer,
        isPromptPending: false
      };

      this.unidentifiedDevices.set(mac, device);

      this.emit('learning', {
        type: 'new_device',
        device,
        message: `New device detected: ${device.name}`,
        timestamp: now
      } as DeviceLearningEvent);

      console.log(`[AILearning] New device detected: ${name} (${mac})`);
    }
  }

  private async checkIfResidentDevice(mac: string): Promise<any | null> {
    try {
      const device = await storage.getResidentDeviceByMac(mac);
      return device;
    } catch {
      return null;
    }
  }

  private async handleResidentDeviceSeen(residentDevice: any, timestamp: Date): Promise<void> {
    const residentId = residentDevice.residentId;
    let presence = this.residentPresence.get(residentId);

    if (!presence) {
      // Load resident info
      const residents = await storage.getResidents();
      const resident = residents.find(r => r.id === residentId);
      if (!resident) return;

      presence = {
        residentId,
        residentName: resident.name,
        isHome: false,
        deviceName: residentDevice.deviceName
      };
      this.residentPresence.set(residentId, presence);
    }

    const wasHome = presence.isHome;
    presence.isHome = true;
    presence.lastSeen = timestamp;
    presence.deviceName = residentDevice.deviceName;

    if (!wasHome) {
      // Resident just arrived!
      presence.arrivedAt = timestamp;
      this.humanCount++;

      this.emit('learning', {
        type: 'resident_arrived',
        residentId,
        residentName: presence.residentName,
        humanCount: this.humanCount,
        message: `${presence.residentName} arrived (detected via ${residentDevice.deviceName})`,
        timestamp
      } as DeviceLearningEvent);

      this.emit('learning', {
        type: 'human_count_changed',
        humanCount: this.humanCount,
        message: `${this.humanCount} ${this.humanCount === 1 ? 'person' : 'people'} at home`,
        timestamp
      } as DeviceLearningEvent);

      console.log(`[AILearning] ${presence.residentName} arrived! Human count: ${this.humanCount}`);

      // Update presence history
      await storage.createPresenceHistory({
        residentId,
        deviceMac: residentDevice.macAddress,
        eventType: 'arrived',
        detectionMethod: 'device_detection'
      });
    }

    // Learn patterns
    this.updateDevicePattern(residentDevice.macAddress, 'arrival');
  }

  private checkPresenceStatus(): void {
    const now = Date.now();

    for (const [residentId, presence] of this.residentPresence.entries()) {
      if (presence.isHome && presence.lastSeen) {
        const timeSinceLastSeen = now - presence.lastSeen.getTime();

        if (timeSinceLastSeen > this.DEVICE_TIMEOUT) {
          // Resident departed
          presence.isHome = false;
          this.humanCount = Math.max(0, this.humanCount - 1);

          this.emit('learning', {
            type: 'resident_departed',
            residentId,
            residentName: presence.residentName,
            humanCount: this.humanCount,
            message: `${presence.residentName} left`,
            timestamp: new Date()
          } as DeviceLearningEvent);

          this.emit('learning', {
            type: 'human_count_changed',
            humanCount: this.humanCount,
            message: `${this.humanCount} ${this.humanCount === 1 ? 'person' : 'people'} at home`,
            timestamp: new Date()
          } as DeviceLearningEvent);

          console.log(`[AILearning] ${presence.residentName} departed. Human count: ${this.humanCount}`);

          // Update presence history
          storage.createPresenceHistory({
            residentId,
            eventType: 'departed',
            detectionMethod: 'device_timeout'
          }).catch(err => console.error('[AILearning] Failed to log departure:', err));
        }
      }
    }
  }

  /**
   * Handle smart departure events - when AI detects someone leaving via exit analysis
   */
  private handleSmartDepartureEvent(event: DepartureEvent): void {
    if (!event.residentId) return;

    const presence = this.residentPresence.get(event.residentId);
    if (!presence) return;

    switch (event.type) {
      case 'approaching_exit':
        // Log that they're heading towards exit
        console.log(`[AILearning] ${event.residentName} heading towards ${event.exitZone?.name || 'exit'}`);
        this.emit('learning', {
          type: 'pattern_learned',
          residentId: event.residentId,
          residentName: event.residentName,
          message: `${event.residentName} heading towards ${event.exitZone?.name || 'exit'}`,
          timestamp: event.timestamp
        } as DeviceLearningEvent);
        break;

      case 'entered_exit_zone':
        // They're at the door
        console.log(`[AILearning] ${event.residentName} at ${event.exitZone?.name || 'exit'}`);
        break;

      case 'signal_fading':
      case 'departed':
        // Smart departure detected - they left!
        if (presence.isHome && event.confidence > 0.6) {
          presence.isHome = false;
          this.humanCount = Math.max(0, this.humanCount - 1);

          const exitName = event.exitZone?.name || 'exit';
          const confidenceStr = `${Math.round(event.confidence * 100)}%`;

          this.emit('learning', {
            type: 'resident_departed',
            residentId: event.residentId,
            residentName: event.residentName,
            humanCount: this.humanCount,
            message: `${event.residentName} left via ${exitName} (${confidenceStr} confident)`,
            timestamp: event.timestamp
          } as DeviceLearningEvent);

          this.emit('learning', {
            type: 'human_count_changed',
            humanCount: this.humanCount,
            message: `${this.humanCount} ${this.humanCount === 1 ? 'person' : 'people'} at home`,
            timestamp: event.timestamp
          } as DeviceLearningEvent);

          console.log(`[AILearning] SMART DEPARTURE: ${event.residentName} left via ${exitName}! Human count: ${this.humanCount}`);

          // Update presence history with smart detection method
          storage.createPresenceHistory({
            residentId: event.residentId,
            eventType: 'departed',
            detectionMethod: 'smart_exit_detection',
            metadata: {
              exitZone: event.exitZone?.name,
              confidence: event.confidence
            }
          }).catch(err => console.error('[AILearning] Failed to log smart departure:', err));
        }
        break;

      case 'departure_cancelled':
        // They moved away from exit - false alarm
        console.log(`[AILearning] ${event.residentName} moved away from exit`);
        break;
    }
  }

  private emitLearningPrompt(device: UnidentifiedDevice): void {
    let message = `Who owns "${device.name}"?`;

    if (device.suggestedResident !== undefined) {
      const resident = this.residentPresence.get(device.suggestedResident);
      if (resident) {
        message = `Is "${device.name}" owned by ${resident.residentName}? (${Math.round((device.confidence || 0) * 100)}% confident)`;
      }
    }

    this.emit('learning', {
      type: 'learning_prompt',
      device,
      message,
      timestamp: new Date()
    } as DeviceLearningEvent);

    console.log(`[AILearning] Prompting user: ${message}`);
  }

  /**
   * Called when user identifies a device
   */
  async identifyDevice(
    macAddress: string,
    residentId: number,
    customName?: string
  ): Promise<{ success: boolean; message: string }> {
    const mac = macAddress.toLowerCase();
    const device = this.unidentifiedDevices.get(mac);

    if (!device) {
      return { success: false, message: 'Device not found in unidentified list' };
    }

    try {
      // Get resident info
      const residents = await storage.getResidents();
      const resident = residents.find(r => r.id === residentId);

      if (!resident) {
        return { success: false, message: 'Resident not found' };
      }

      const deviceName = customName || `${resident.name}'s ${device.deviceType}`;

      // Register as resident device
      await storage.createResidentDevice({
        residentId,
        macAddress: mac,
        deviceName,
        deviceType: device.deviceType,
        isPrimary: false, // User can set as primary later
      });

      // Remove from unidentified list
      this.unidentifiedDevices.delete(mac);

      // Update resident presence
      let presence = this.residentPresence.get(residentId);
      if (!presence) {
        presence = {
          residentId,
          residentName: resident.name,
          isHome: true,
          deviceName,
          lastSeen: new Date(),
          arrivedAt: new Date()
        };
        this.residentPresence.set(residentId, presence);
        this.humanCount++;
      }

      this.emit('learning', {
        type: 'device_identified',
        device,
        residentId,
        residentName: resident.name,
        message: `${deviceName} assigned to ${resident.name}`,
        timestamp: new Date()
      } as DeviceLearningEvent);

      this.emit('learning', {
        type: 'pattern_learned',
        message: `Learned: ${deviceName} belongs to ${resident.name}`,
        timestamp: new Date()
      } as DeviceLearningEvent);

      console.log(`[AILearning] Device identified: ${deviceName} → ${resident.name}`);

      return { success: true, message: `Device "${deviceName}" assigned to ${resident.name}` };
    } catch (error: any) {
      console.error('[AILearning] Failed to identify device:', error);
      return { success: false, message: error.message || 'Failed to identify device' };
    }
  }

  /**
   * Called when user marks a device as "not a resident" (visitor, IoT device, etc.)
   */
  async markAsNonResident(
    macAddress: string,
    category: 'visitor' | 'iot' | 'neighbor' | 'ignore'
  ): Promise<{ success: boolean; message: string }> {
    const mac = macAddress.toLowerCase();
    const device = this.unidentifiedDevices.get(mac);

    if (!device) {
      return { success: false, message: 'Device not found' };
    }

    // Remove from unidentified list
    this.unidentifiedDevices.delete(mac);

    // Optionally track this device to prevent future prompts
    // For now, just acknowledge
    console.log(`[AILearning] Device marked as ${category}: ${device.name}`);

    return { success: true, message: `Device marked as ${category}` };
  }

  /**
   * AI suggestion for device ownership based on patterns
   */
  private async suggestDeviceOwner(
    device: UnidentifiedDevice
  ): Promise<{ residentId: number; confidence: number } | null> {
    // Simple heuristics for now - can be enhanced with ML later

    // Check device name for hints
    const nameLower = device.name.toLowerCase();

    for (const [residentId, presence] of this.residentPresence.entries()) {
      const residentNameLower = presence.residentName.toLowerCase();
      const firstName = residentNameLower.split(' ')[0];

      // Check if device name contains resident's name
      if (nameLower.includes(firstName) || nameLower.includes(residentNameLower)) {
        return { residentId, confidence: 0.85 };
      }
    }

    // Check manufacturer hints (iPhone = likely a person's phone)
    if (device.manufacturer) {
      const mfgLower = device.manufacturer.toLowerCase();
      if (mfgLower.includes('apple') || mfgLower.includes('samsung') || mfgLower.includes('google')) {
        // It's likely a personal device, but we can't determine whose
        // Return first resident with low confidence as a guess
        const firstResident = Array.from(this.residentPresence.values())[0];
        if (firstResident) {
          return { residentId: firstResident.residentId, confidence: 0.3 };
        }
      }
    }

    return null;
  }

  private updateDevicePattern(macAddress: string, eventType: 'arrival' | 'departure'): void {
    const mac = macAddress.toLowerCase();
    const hour = new Date().getHours();

    let pattern = this.devicePatterns.get(mac);
    if (!pattern) {
      pattern = {
        macAddress: mac,
        typicalArrivalTimes: [],
        typicalDepartureTimes: [],
        averageSessionDuration: 0,
        coOccurringDevices: [],
        connectionFrequency: 0
      };
      this.devicePatterns.set(mac, pattern);
    }

    if (eventType === 'arrival') {
      pattern.typicalArrivalTimes.push(hour);
      // Keep last 50 entries
      if (pattern.typicalArrivalTimes.length > 50) {
        pattern.typicalArrivalTimes.shift();
      }
    } else {
      pattern.typicalDepartureTimes.push(hour);
      if (pattern.typicalDepartureTimes.length > 50) {
        pattern.typicalDepartureTimes.shift();
      }
    }

    pattern.connectionFrequency++;
  }

  // Public API methods

  getUnidentifiedDevices(): UnidentifiedDevice[] {
    return Array.from(this.unidentifiedDevices.values());
  }

  getPendingPrompts(): UnidentifiedDevice[] {
    return Array.from(this.unidentifiedDevices.values())
      .filter(d => d.isPromptPending);
  }

  getHumanCount(): number {
    return this.humanCount;
  }

  getResidentsAtHome(): ResidentPresenceInfo[] {
    return Array.from(this.residentPresence.values())
      .filter(r => r.isHome);
  }

  getAllResidentPresence(): ResidentPresenceInfo[] {
    return Array.from(this.residentPresence.values());
  }

  isRunningStatus(): boolean {
    return this.isRunning;
  }

  /**
   * Manually refresh resident device presence
   */
  async refreshPresence(): Promise<void> {
    await this.loadResidentDevices();
    this.checkPresenceStatus();
  }
}

export const aiDeviceLearning = AIDeviceLearningService.getInstance();
