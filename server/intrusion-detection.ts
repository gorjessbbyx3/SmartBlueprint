import { storage } from './storage';
import {
  Device,
  Resident,
  ResidentDevice,
  SecuritySettings,
  SecurityEvent,
  InsertSecurityEvent,
  InsertPresenceHistory
} from '../shared/schema';

export type SecurityMode = 'disarmed' | 'armed_home' | 'armed_away' | 'armed_night';

export interface IntrusionAlert {
  id: string;
  timestamp: Date;
  alertType: 'intrusion' | 'unknown_device' | 'perimeter_breach' | 'suspicious_activity';
  severity: 'warning' | 'alert' | 'critical';
  description: string;
  deviceId?: number;
  roomId?: number;
  macAddress?: string;
  requiresAcknowledgment: boolean;
}

export interface PresenceStatus {
  residentId: number;
  residentName: string;
  isHome: boolean;
  lastSeen: Date | null;
  primaryDevice?: string;
}

export interface SecurityStatus {
  mode: SecurityMode;
  isArmed: boolean;
  residentsAtHome: PresenceStatus[];
  activeAlerts: IntrusionAlert[];
  lastModeChange: Date;
  entryDelayActive: boolean;
  exitDelayActive: boolean;
  entryDelayRemaining?: number;
  exitDelayRemaining?: number;
}

type AlertCallback = (alert: IntrusionAlert) => void;
type SecurityEventCallback = (event: SecurityEvent) => void;

export class IntrusionDetectionService {
  private static instance: IntrusionDetectionService;
  private isRunning = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private activeAlerts: Map<string, IntrusionAlert> = new Map();
  private knownDeviceMacs: Set<string> = new Set();
  private residentDeviceMacs: Set<string> = new Set();
  private lastDeviceScan: Map<string, Date> = new Map();

  // Delay tracking
  private entryDelayTimer: NodeJS.Timeout | null = null;
  private exitDelayTimer: NodeJS.Timeout | null = null;
  private entryDelayStart: Date | null = null;
  private exitDelayStart: Date | null = null;

  // Alert callbacks
  private alertCallbacks: AlertCallback[] = [];
  private securityEventCallbacks: SecurityEventCallback[] = [];

  // Configuration
  private readonly SCAN_INTERVAL = 10000; // 10 seconds
  private readonly DEVICE_TIMEOUT = 120000; // 2 minutes without seeing device = left
  private readonly SUSPICIOUS_DEVICE_THRESHOLD = 3; // Number of scans before considering device suspicious

  static getInstance(): IntrusionDetectionService {
    if (!this.instance) {
      this.instance = new IntrusionDetectionService();
    }
    return this.instance;
  }

  // Subscribe to alerts
  onAlert(callback: AlertCallback): () => void {
    this.alertCallbacks.push(callback);
    return () => {
      this.alertCallbacks = this.alertCallbacks.filter(cb => cb !== callback);
    };
  }

  // Subscribe to security events
  onSecurityEvent(callback: SecurityEventCallback): () => void {
    this.securityEventCallbacks.push(callback);
    return () => {
      this.securityEventCallbacks = this.securityEventCallbacks.filter(cb => cb !== callback);
    };
  }

  private notifyAlert(alert: IntrusionAlert): void {
    this.alertCallbacks.forEach(cb => cb(alert));
  }

  private notifySecurityEvent(event: SecurityEvent): void {
    this.securityEventCallbacks.forEach(cb => cb(event));
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[Security] Intrusion detection already running');
      return;
    }

    console.log('[Security] Starting intrusion detection service...');
    this.isRunning = true;

    // Initialize known devices
    await this.refreshKnownDevices();

    // Start monitoring loop
    this.monitoringInterval = setInterval(async () => {
      await this.monitoringCycle();
    }, this.SCAN_INTERVAL);

    console.log('[Security] Intrusion detection service started');
  }

  async stop(): Promise<void> {
    console.log('[Security] Stopping intrusion detection service...');
    this.isRunning = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.entryDelayTimer) {
      clearTimeout(this.entryDelayTimer);
      this.entryDelayTimer = null;
    }

    if (this.exitDelayTimer) {
      clearTimeout(this.exitDelayTimer);
      this.exitDelayTimer = null;
    }

    console.log('[Security] Intrusion detection service stopped');
  }

  private async refreshKnownDevices(): Promise<void> {
    // Get all registered resident devices
    const residentDevices = await storage.getResidentDevices();
    this.residentDeviceMacs = new Set(residentDevices.map(d => d.macAddress.toLowerCase()));

    // Get all known devices from the network
    const devices = await storage.getDevices();
    this.knownDeviceMacs = new Set(devices.map(d => d.macAddress.toLowerCase()));
  }

  private async monitoringCycle(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const settings = await storage.getSecuritySettings();
      if (!settings) return;

      // Refresh device lists
      await this.refreshKnownDevices();

      // Check for presence changes
      await this.checkPresenceChanges();

      // If armed, check for intrusions
      if (settings.securityMode !== 'disarmed') {
        await this.checkForIntrusions(settings);
      }

      // Check for unknown devices (always, even when disarmed)
      await this.checkUnknownDevices(settings);

    } catch (error) {
      console.error('[Security] Error in monitoring cycle:', error);
    }
  }

  private async checkPresenceChanges(): Promise<void> {
    const devices = await storage.getDevices();
    const residentDevices = await storage.getResidentDevices();
    const now = new Date();

    for (const residentDevice of residentDevices) {
      const macLower = residentDevice.macAddress.toLowerCase();
      const networkDevice = devices.find(d => d.macAddress.toLowerCase() === macLower);
      const lastSeen = this.lastDeviceScan.get(macLower);
      const wasOnline = lastSeen && (now.getTime() - lastSeen.getTime()) < this.DEVICE_TIMEOUT;

      if (networkDevice && networkDevice.isOnline) {
        // Device is online
        this.lastDeviceScan.set(macLower, now);

        if (!wasOnline && residentDevice.residentId) {
          // Resident just arrived
          await this.handleResidentArrived(residentDevice);
        }
      } else {
        // Device is offline
        if (wasOnline && residentDevice.residentId) {
          // Check if it's been offline long enough
          if (now.getTime() - lastSeen!.getTime() > this.DEVICE_TIMEOUT) {
            await this.handleResidentLeft(residentDevice);
            this.lastDeviceScan.delete(macLower);
          }
        }
      }
    }
  }

  private async handleResidentArrived(residentDevice: ResidentDevice): Promise<void> {
    const resident = residentDevice.residentId
      ? await storage.getResident(residentDevice.residentId)
      : null;

    if (!resident) return;

    console.log(`[Security] Resident arrived: ${resident.name} via ${residentDevice.deviceName}`);

    // Create presence history entry
    await storage.createPresenceHistory({
      residentId: resident.id,
      eventType: 'arrived',
      detectedVia: 'device_connected',
      deviceId: residentDevice.deviceId ?? undefined,
    });

    // Create security event
    const event = await storage.createSecurityEvent({
      eventType: 'resident_arrived',
      severity: 'info',
      description: `${resident.name} arrived home (detected via ${residentDevice.deviceName})`,
      residentId: resident.id,
      deviceId: residentDevice.deviceId ?? undefined,
      metadata: { deviceMac: residentDevice.macAddress },
    });

    this.notifySecurityEvent(event);

    // Check if we should auto-disarm
    const settings = await storage.getSecuritySettings();
    if (settings && settings.securityMode !== 'disarmed') {
      // Clear any pending entry delay alarm
      if (this.entryDelayTimer) {
        clearTimeout(this.entryDelayTimer);
        this.entryDelayTimer = null;
        this.entryDelayStart = null;
        console.log('[Security] Entry delay cancelled - resident identified');
      }
    }
  }

  private async handleResidentLeft(residentDevice: ResidentDevice): Promise<void> {
    const resident = residentDevice.residentId
      ? await storage.getResident(residentDevice.residentId)
      : null;

    if (!resident) return;

    console.log(`[Security] Resident left: ${resident.name}`);

    // Create presence history entry
    await storage.createPresenceHistory({
      residentId: resident.id,
      eventType: 'left',
      detectedVia: 'device_disconnected',
      deviceId: residentDevice.deviceId ?? undefined,
    });

    // Create security event
    const event = await storage.createSecurityEvent({
      eventType: 'resident_left',
      severity: 'info',
      description: `${resident.name} left home`,
      residentId: resident.id,
      metadata: { deviceMac: residentDevice.macAddress },
    });

    this.notifySecurityEvent(event);

    // Check if we should auto-arm
    const settings = await storage.getSecuritySettings();
    if (settings && settings.autoArmEnabled && settings.securityMode === 'disarmed') {
      const residentsAtHome = await storage.getResidentsAtHome();
      if (residentsAtHome.length === 0) {
        console.log('[Security] All residents left - auto-arming in progress');
        setTimeout(async () => {
          await this.setSecurityMode('armed_away', undefined);
        }, (settings.autoArmDelay || 300) * 1000);
      }
    }
  }

  private async checkForIntrusions(settings: SecuritySettings): Promise<void> {
    const devices = await storage.getDevices();
    const onlineDevices = devices.filter(d => d.isOnline);
    const residentsAtHome = await storage.getResidentsAtHome();

    // In armed_away mode, any presence is suspicious
    if (settings.securityMode === 'armed_away') {
      // Check for unknown online devices that aren't resident devices
      for (const device of onlineDevices) {
        const macLower = device.macAddress.toLowerCase();
        if (!this.residentDeviceMacs.has(macLower)) {
          // Check if this is a new device or suspicious activity
          const isKnown = this.knownDeviceMacs.has(macLower);

          // For known devices (like smart home devices), check for unusual activity
          if (isKnown && this.isDeviceSuspicious(device)) {
            await this.triggerIntrusionAlert(device, 'suspicious_activity', settings);
          }
        }
      }
    }

    // In armed_home or armed_night mode, check for perimeter breaches
    if (settings.securityMode === 'armed_home' || settings.securityMode === 'armed_night') {
      // Check for motion sensors, door sensors, etc. that indicate perimeter breach
      for (const device of onlineDevices) {
        if (this.isPerimeterDevice(device) && this.hasPerimeterActivity(device)) {
          await this.triggerIntrusionAlert(device, 'perimeter_breach', settings);
        }
      }
    }
  }

  private isDeviceSuspicious(device: Device): boolean {
    // Check if device is behaving unusually
    // This could be expanded with ML-based anomaly detection
    const telemetry = device.telemetryData as any;
    if (telemetry) {
      // Check for unusual signal patterns, activity times, etc.
      return telemetry.unusualActivity === true;
    }
    return false;
  }

  private isPerimeterDevice(device: Device): boolean {
    // Check if device is a door sensor, window sensor, motion sensor, etc.
    const perimeterTypes = ['door_sensor', 'window_sensor', 'motion_sensor', 'camera', 'doorbell'];
    return perimeterTypes.includes(device.deviceType.toLowerCase());
  }

  private hasPerimeterActivity(device: Device): boolean {
    // Check if the device has detected activity
    const telemetry = device.telemetryData as any;
    if (telemetry) {
      return telemetry.motionDetected === true ||
             telemetry.doorOpened === true ||
             telemetry.windowOpened === true;
    }
    return false;
  }

  private async triggerIntrusionAlert(
    device: Device | null,
    alertType: IntrusionAlert['alertType'],
    settings: SecuritySettings
  ): Promise<void> {
    // Check if we're in entry delay period
    if (this.entryDelayTimer) {
      console.log('[Security] Activity detected during entry delay - waiting for disarm');
      return;
    }

    // Start entry delay if configured
    if (settings.entryDelay && settings.entryDelay > 0 && !this.entryDelayTimer) {
      console.log(`[Security] Starting entry delay: ${settings.entryDelay} seconds`);
      this.entryDelayStart = new Date();

      this.entryDelayTimer = setTimeout(async () => {
        this.entryDelayTimer = null;
        this.entryDelayStart = null;
        // Entry delay expired - trigger actual alarm
        await this.triggerAlarm(device, alertType, settings);
      }, settings.entryDelay * 1000);

      return;
    }

    await this.triggerAlarm(device, alertType, settings);
  }

  private async triggerAlarm(
    device: Device | null,
    alertType: IntrusionAlert['alertType'],
    settings: SecuritySettings
  ): Promise<void> {
    const alertId = `intrusion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    let description = '';
    let severity: IntrusionAlert['severity'] = 'critical';

    switch (alertType) {
      case 'intrusion':
        description = device
          ? `Intrusion detected via ${device.name} (${device.deviceType})`
          : 'Intrusion detected - unauthorized presence';
        break;
      case 'unknown_device':
        description = device
          ? `Unknown device detected: ${device.name} (MAC: ${device.macAddress})`
          : 'Unknown device detected on network';
        severity = 'warning';
        break;
      case 'perimeter_breach':
        description = device
          ? `Perimeter breach detected: ${device.name}`
          : 'Perimeter breach detected';
        break;
      case 'suspicious_activity':
        description = device
          ? `Suspicious activity detected on ${device.name}`
          : 'Suspicious activity detected';
        severity = 'alert';
        break;
    }

    const alert: IntrusionAlert = {
      id: alertId,
      timestamp: new Date(),
      alertType,
      severity,
      description,
      deviceId: device?.id,
      macAddress: device?.macAddress,
      requiresAcknowledgment: true,
    };

    this.activeAlerts.set(alertId, alert);
    console.log(`[Security] ALARM: ${description}`);

    // Create security event
    const event = await storage.createSecurityEvent({
      eventType: alertType === 'intrusion' ? 'intrusion_detected' :
                 alertType === 'unknown_device' ? 'unknown_device' : 'alarm_triggered',
      severity: severity === 'critical' ? 'critical' : severity === 'alert' ? 'alert' : 'warning',
      description,
      deviceId: device?.id,
      metadata: {
        alertId,
        macAddress: device?.macAddress,
        securityMode: settings.securityMode,
        silentAlarm: settings.silentAlarm
      },
    });

    this.notifyAlert(alert);
    this.notifySecurityEvent(event);
  }

  private async checkUnknownDevices(settings: SecuritySettings): Promise<void> {
    const devices = await storage.getDevices();

    for (const device of devices) {
      const macLower = device.macAddress.toLowerCase();

      // Skip if it's a known resident device
      if (this.residentDeviceMacs.has(macLower)) continue;

      // Check if this is a completely new device
      if (!this.knownDeviceMacs.has(macLower) && device.isOnline) {
        // New unknown device on network
        const alert: IntrusionAlert = {
          id: `unknown_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          alertType: 'unknown_device',
          severity: settings.securityMode !== 'disarmed' ? 'alert' : 'warning',
          description: `New unknown device detected: ${device.name} (MAC: ${device.macAddress})`,
          deviceId: device.id,
          macAddress: device.macAddress,
          requiresAcknowledgment: true,
        };

        this.activeAlerts.set(alert.id, alert);

        // Create security event
        const event = await storage.createSecurityEvent({
          eventType: 'unknown_device',
          severity: settings.securityMode !== 'disarmed' ? 'alert' : 'warning',
          description: alert.description,
          deviceId: device.id,
          metadata: { macAddress: device.macAddress, deviceType: device.deviceType },
        });

        this.notifyAlert(alert);
        this.notifySecurityEvent(event);

        // Add to known devices to avoid repeated alerts
        this.knownDeviceMacs.add(macLower);
      }
    }
  }

  // Public API methods

  async getSecurityStatus(): Promise<SecurityStatus> {
    const settings = await storage.getSecuritySettings();
    const residentsAtHome = await storage.getResidentsAtHome();
    const allResidents = await storage.getResidents();

    const presenceStatuses: PresenceStatus[] = await Promise.all(
      allResidents.map(async (resident) => {
        const devices = await storage.getResidentDevices(resident.id);
        const primaryDevice = devices.find(d => d.isPrimary);
        const isHome = residentsAtHome.some(r => r.id === resident.id);

        return {
          residentId: resident.id,
          residentName: resident.name,
          isHome,
          lastSeen: resident.lastSeen,
          primaryDevice: primaryDevice?.deviceName,
        };
      })
    );

    const entryDelayRemaining = this.entryDelayStart
      ? Math.max(0, (settings?.entryDelay || 30) - Math.floor((Date.now() - this.entryDelayStart.getTime()) / 1000))
      : undefined;

    const exitDelayRemaining = this.exitDelayStart
      ? Math.max(0, (settings?.exitDelay || 60) - Math.floor((Date.now() - this.exitDelayStart.getTime()) / 1000))
      : undefined;

    return {
      mode: (settings?.securityMode || 'disarmed') as SecurityMode,
      isArmed: settings?.securityMode !== 'disarmed',
      residentsAtHome: presenceStatuses,
      activeAlerts: Array.from(this.activeAlerts.values()),
      lastModeChange: settings?.lastModeChange || new Date(),
      entryDelayActive: this.entryDelayTimer !== null,
      exitDelayActive: this.exitDelayTimer !== null,
      entryDelayRemaining,
      exitDelayRemaining,
    };
  }

  async setSecurityMode(mode: SecurityMode, changedBy?: number): Promise<SecuritySettings> {
    const currentSettings = await storage.getSecuritySettings();
    const previousMode = currentSettings?.securityMode;

    // Clear any existing delays
    if (this.entryDelayTimer) {
      clearTimeout(this.entryDelayTimer);
      this.entryDelayTimer = null;
      this.entryDelayStart = null;
    }

    if (mode !== 'disarmed' && previousMode === 'disarmed') {
      // Arming - start exit delay
      const exitDelay = currentSettings?.exitDelay || 60;
      console.log(`[Security] Arming system in ${exitDelay} seconds...`);
      this.exitDelayStart = new Date();

      this.exitDelayTimer = setTimeout(async () => {
        this.exitDelayTimer = null;
        this.exitDelayStart = null;
        console.log(`[Security] System now armed: ${mode}`);

        const event = await storage.createSecurityEvent({
          eventType: 'mode_change',
          severity: 'info',
          description: `Security system armed: ${mode}`,
          residentId: changedBy,
          metadata: { previousMode, newMode: mode },
        });
        this.notifySecurityEvent(event);
      }, exitDelay * 1000);
    } else if (mode === 'disarmed' && previousMode !== 'disarmed') {
      // Disarming
      if (this.exitDelayTimer) {
        clearTimeout(this.exitDelayTimer);
        this.exitDelayTimer = null;
        this.exitDelayStart = null;
      }

      console.log('[Security] System disarmed');

      // Clear all active intrusion alerts
      this.activeAlerts.clear();

      const event = await storage.createSecurityEvent({
        eventType: 'mode_change',
        severity: 'info',
        description: 'Security system disarmed',
        residentId: changedBy,
        metadata: { previousMode, newMode: mode },
      });
      this.notifySecurityEvent(event);
    }

    const settings = await storage.updateSecuritySettings({
      securityMode: mode,
      changedBy,
    });

    return settings;
  }

  async acknowledgeAlert(alertId: string, acknowledgedBy?: number): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      this.activeAlerts.delete(alertId);
      console.log(`[Security] Alert acknowledged: ${alertId}`);
      return true;
    }
    return false;
  }

  async registerResidentDevice(
    residentId: number,
    macAddress: string,
    deviceName: string,
    deviceType: string,
    isPrimary: boolean = false
  ): Promise<ResidentDevice> {
    // Check if device already exists in network
    const devices = await storage.getDevices();
    const networkDevice = devices.find(d => d.macAddress.toLowerCase() === macAddress.toLowerCase());

    const residentDevice = await storage.createResidentDevice({
      residentId,
      deviceId: networkDevice?.id,
      macAddress: macAddress.toLowerCase(),
      deviceName,
      deviceType,
      isPrimary,
    });

    // Update known devices
    this.residentDeviceMacs.add(macAddress.toLowerCase());

    console.log(`[Security] Registered device ${deviceName} for resident ${residentId}`);
    return residentDevice;
  }

  /**
   * Trigger a movement alert from external sources (e.g., presence detection engine)
   * This is called when human presence is detected but no resident devices are present
   */
  async triggerMovementAlert(
    location: string,
    confidence: number,
    description?: string
  ): Promise<void> {
    const settings = await storage.getSecuritySettings();

    // Only trigger alerts if system is armed
    if (settings?.securityMode === 'disarmed') {
      console.log('[Security] Movement detected but system is disarmed - ignoring');
      return;
    }

    // Check for entry delay
    if (this.entryDelayTimer) {
      console.log('[Security] Movement detected during entry delay - waiting for disarm');
      return;
    }

    const alertId = `movement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const alertDescription = description || `Movement detected in ${location} (confidence: ${(confidence * 100).toFixed(0)}%)`;

    // Determine severity based on security mode and confidence
    let severity: IntrusionAlert['severity'] = 'warning';
    if (settings?.securityMode === 'armed_away' && confidence > 0.7) {
      severity = 'critical';
    } else if (confidence > 0.5) {
      severity = 'alert';
    }

    const alert: IntrusionAlert = {
      id: alertId,
      timestamp: new Date(),
      alertType: 'intrusion',
      severity,
      description: alertDescription,
      requiresAcknowledgment: true,
    };

    this.activeAlerts.set(alertId, alert);
    console.log(`[Security] MOVEMENT ALERT: ${alertDescription}`);

    // Create security event
    const event = await storage.createSecurityEvent({
      eventType: 'intrusion_detected',
      severity,
      description: alertDescription,
      metadata: {
        alertId,
        location,
        confidence,
        securityMode: settings?.securityMode,
        source: 'presence_detection'
      },
    });

    this.notifyAlert(alert);
    this.notifySecurityEvent(event);
  }

  isServiceRunning(): boolean {
    return this.isRunning;
  }
}

export const intrusionDetection = IntrusionDetectionService.getInstance();
