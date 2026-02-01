import {
  devices,
  floorplans,
  anomalies,
  recommendations,
  rooms,
  deviceTelemetry,
  mlModels,
  platformIntegrations,
  platformDevices,
  predictiveAlerts,
  fusionResults,
  residents,
  residentDevices,
  securitySettings,
  securityEvents,
  notificationChannels,
  presenceHistory,
  type Device,
  type InsertDevice,
  type Floorplan,
  type InsertFloorplan,
  type Anomaly,
  type InsertAnomaly,
  type Recommendation,
  type InsertRecommendation,
  type Room,
  type InsertRoom,
  type DeviceTelemetry,
  type InsertDeviceTelemetry,
  type MlModel,
  type InsertMlModel,
  type PlatformIntegration,
  type InsertPlatformIntegration,
  type PlatformDevice,
  type InsertPlatformDevice,
  type PredictiveAlert,
  type InsertPredictiveAlert,
  type FusionResult,
  type InsertFusionResult,
  type Resident,
  type InsertResident,
  type ResidentDevice,
  type InsertResidentDevice,
  type SecuritySettings,
  type InsertSecuritySettings,
  type SecurityEvent,
  type InsertSecurityEvent,
  type NotificationChannel,
  type InsertNotificationChannel,
  type PresenceHistory,
  type InsertPresenceHistory
} from "@shared/schema";

export interface IStorage {
  // Device operations
  getDevices(): Promise<Device[]>;
  getDevice(id: number): Promise<Device | undefined>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDevice(id: number, updates: Partial<InsertDevice>): Promise<Device | undefined>;
  deleteDevice(id: number): Promise<boolean>;
  updateDeviceRSSI(macAddress: string, rssi: number): Promise<void>;
  
  // Floorplan operations
  getFloorplans(): Promise<Floorplan[]>;
  getFloorplan(id: number): Promise<Floorplan | undefined>;
  createFloorplan(floorplan: InsertFloorplan): Promise<Floorplan>;
  updateFloorplan(id: number, updates: Partial<InsertFloorplan>): Promise<Floorplan | undefined>;
  
  // Anomaly operations
  getAnomalies(): Promise<Anomaly[]>;
  createAnomaly(anomaly: InsertAnomaly): Promise<Anomaly>;
  resolveAnomaly(id: number): Promise<boolean>;
  
  // Recommendation operations
  getRecommendations(): Promise<Recommendation[]>;
  createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation>;
  applyRecommendation(id: number): Promise<boolean>;

  // Room operations
  getRooms(floorplanId?: number): Promise<Room[]>;
  getRoom(id: number): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: number, updates: Partial<InsertRoom>): Promise<Room | undefined>;
  deleteRoom(id: number): Promise<boolean>;

  // Device telemetry operations
  getDeviceTelemetry(deviceId: number, limit?: number): Promise<DeviceTelemetry[]>;
  addDeviceTelemetry(telemetry: InsertDeviceTelemetry): Promise<DeviceTelemetry>;
  getLatestTelemetry(deviceId: number): Promise<DeviceTelemetry | undefined>;

  // ML model operations
  getMlModels(modelType?: string): Promise<MlModel[]>;
  getActiveMlModel(modelType: string): Promise<MlModel | undefined>;
  createMlModel(model: InsertMlModel): Promise<MlModel>;
  updateMlModel(id: number, updates: Partial<InsertMlModel>): Promise<MlModel | undefined>;
  setActiveModel(id: number, modelType: string): Promise<boolean>;

  // Platform integration operations
  getPlatformIntegrations(): Promise<PlatformIntegration[]>;
  getAllPlatformIntegrations(): Promise<PlatformIntegration[]>;
  getPlatformIntegration(platform: string): Promise<PlatformIntegration | undefined>;
  createPlatformIntegration(integration: InsertPlatformIntegration): Promise<PlatformIntegration>;
  addPlatformIntegration(integration: InsertPlatformIntegration): Promise<PlatformIntegration>;
  updatePlatformIntegration(id: number, updates: Partial<InsertPlatformIntegration>): Promise<PlatformIntegration | undefined>;
  removePlatformIntegration(platform: string): Promise<boolean>;

  // Platform device operations
  getPlatformDevices(integrationId?: number): Promise<PlatformDevice[]>;
  addPlatformDevice(device: InsertPlatformDevice): Promise<PlatformDevice>;
  updatePlatformDevice(id: number, updates: Partial<InsertPlatformDevice>): Promise<PlatformDevice | undefined>;

  // Predictive alert operations
  getPredictiveAlerts(deviceId?: number): Promise<PredictiveAlert[]>;
  createPredictiveAlert(alert: InsertPredictiveAlert): Promise<PredictiveAlert>;
  resolvePredictiveAlert(id: number): Promise<boolean>;

  // Fusion result operations
  getFusionResults(): Promise<FusionResult[]>;
  createFusionResult(result: InsertFusionResult): Promise<FusionResult>;

  // Security system operations
  // Resident operations
  getResidents(): Promise<Resident[]>;
  getResident(id: number): Promise<Resident | undefined>;
  createResident(resident: InsertResident): Promise<Resident>;
  updateResident(id: number, updates: Partial<InsertResident>): Promise<Resident | undefined>;
  deleteResident(id: number): Promise<boolean>;

  // Resident device operations
  getResidentDevices(residentId?: number): Promise<ResidentDevice[]>;
  getResidentDeviceByMac(macAddress: string): Promise<ResidentDevice | undefined>;
  createResidentDevice(device: InsertResidentDevice): Promise<ResidentDevice>;
  updateResidentDevice(id: number, updates: Partial<InsertResidentDevice>): Promise<ResidentDevice | undefined>;
  deleteResidentDevice(id: number): Promise<boolean>;

  // Security settings operations
  getSecuritySettings(): Promise<SecuritySettings | undefined>;
  updateSecuritySettings(updates: Partial<InsertSecuritySettings>): Promise<SecuritySettings>;

  // Security event operations
  getSecurityEvents(limit?: number): Promise<SecurityEvent[]>;
  getUnacknowledgedEvents(): Promise<SecurityEvent[]>;
  createSecurityEvent(event: InsertSecurityEvent): Promise<SecurityEvent>;
  acknowledgeSecurityEvent(id: number, acknowledgedBy: number): Promise<boolean>;

  // Notification channel operations
  getNotificationChannels(residentId?: number): Promise<NotificationChannel[]>;
  createNotificationChannel(channel: InsertNotificationChannel): Promise<NotificationChannel>;
  updateNotificationChannel(id: number, updates: Partial<InsertNotificationChannel>): Promise<NotificationChannel | undefined>;
  deleteNotificationChannel(id: number): Promise<boolean>;

  // Presence history operations
  getPresenceHistory(residentId?: number, limit?: number): Promise<PresenceHistory[]>;
  createPresenceHistory(entry: InsertPresenceHistory): Promise<PresenceHistory>;
  getResidentsAtHome(): Promise<Resident[]>;
}

export class MemStorage implements IStorage {
  private devices: Map<number, Device> = new Map();
  private floorplans: Map<number, Floorplan> = new Map();
  private anomalies: Map<number, Anomaly> = new Map();
  private recommendations: Map<number, Recommendation> = new Map();
  private rooms: Map<number, Room> = new Map();
  private deviceTelemetry: Map<number, DeviceTelemetry> = new Map();
  private mlModels: Map<number, MlModel> = new Map();
  private platformIntegrations: Map<number, PlatformIntegration> = new Map();
  private platformDevices: Map<number, PlatformDevice> = new Map();
  private predictiveAlerts: Map<number, PredictiveAlert> = new Map();
  private fusionResults: Map<number, FusionResult> = new Map();
  // Security system storage
  private residentsMap: Map<number, Resident> = new Map();
  private residentDevicesMap: Map<number, ResidentDevice> = new Map();
  private securitySettingsData: SecuritySettings | null = null;
  private securityEventsMap: Map<number, SecurityEvent> = new Map();
  private notificationChannelsMap: Map<number, NotificationChannel> = new Map();
  private presenceHistoryMap: Map<number, PresenceHistory> = new Map();

  private currentDeviceId = 1;
  private currentFloorplanId = 1;
  private currentAnomalyId = 1;
  private currentRecommendationId = 1;
  private currentRoomId = 1;
  private currentTelemetryId = 1;
  private currentMlModelId = 1;
  private currentIntegrationId = 1;
  private currentPlatformDeviceId = 1;
  private currentAlertId = 1;
  private currentFusionId = 1;
  // Security system IDs
  private currentResidentId = 1;
  private currentResidentDeviceId = 1;
  private currentSecurityEventId = 1;
  private currentNotificationChannelId = 1;
  private currentPresenceHistoryId = 1;

  constructor() {
    // Initialize empty storage - devices will be discovered through network scanning
    this.initializeBasicData();
  }

  private initializeBasicData() {
    // Initialize with a basic default floorplan that users can replace
    const defaultFloorplan: Floorplan = {
      id: 1,
      name: "Default Floor Plan",
      scale: "1:200",
      width: 800,
      height: 600,
      imageUrl: null,
      sketchElements: null,
      data: {
        rooms: [
          { name: "Main Area", x: 50, y: 50, width: 700, height: 500 }
        ],
        doors: [],
        windows: []
      }
    };

    this.floorplans.set(1, defaultFloorplan);
    this.currentFloorplanId = 2;
    
    // No sample devices, anomalies, or recommendations - these will be generated from real data
  }

  async getDevices(): Promise<Device[]> {
    return Array.from(this.devices.values());
  }

  async getDevice(id: number): Promise<Device | undefined> {
    return this.devices.get(id);
  }

  async createDevice(insertDevice: InsertDevice): Promise<Device> {
    const device: Device = {
      ...insertDevice,
      id: this.currentDeviceId++,
      lastSeen: new Date(),
      x: insertDevice.x ?? null,
      y: insertDevice.y ?? null,
      isOnline: insertDevice.isOnline ?? true,
      telemetryData: insertDevice.telemetryData ?? null,
    };
    this.devices.set(device.id, device);
    return device;
  }

  async updateDevice(id: number, updates: Partial<InsertDevice>): Promise<Device | undefined> {
    const device = this.devices.get(id);
    if (!device) return undefined;
    
    const updatedDevice = { ...device, ...updates, lastSeen: new Date() };
    this.devices.set(id, updatedDevice);
    return updatedDevice;
  }

  async deleteDevice(id: number): Promise<boolean> {
    return this.devices.delete(id);
  }

  async clearTestDevices(): Promise<void> {
    const realDevices = new Map<number, Device>();
    for (const [id, device] of this.devices) {
      // Keep only real network devices, exclude test devices
      if (device.protocol !== 'test_scan' && 
          !(device.telemetryData && 
            typeof device.telemetryData === 'object' && 
            'isTestDevice' in device.telemetryData && 
            device.telemetryData.isTestDevice)) {
        realDevices.set(id, device);
      }
    }
    this.devices = realDevices;
  }

  async updateDeviceRSSI(macAddress: string, rssi: number): Promise<void> {
    const devices = Array.from(this.devices.values());
    for (const device of devices) {
      if (device.macAddress === macAddress) {
        device.rssi = rssi;
        device.lastSeen = new Date();
        this.devices.set(device.id, device);
        break;
      }
    }
  }

  async getFloorplans(): Promise<Floorplan[]> {
    return Array.from(this.floorplans.values());
  }

  async getFloorplan(id: number): Promise<Floorplan | undefined> {
    return this.floorplans.get(id);
  }

  async createFloorplan(insertFloorplan: InsertFloorplan): Promise<Floorplan> {
    const floorplan: Floorplan = {
      ...insertFloorplan,
      id: this.currentFloorplanId++,
      scale: insertFloorplan.scale ?? null,
      imageUrl: insertFloorplan.imageUrl ?? null,
      sketchElements: insertFloorplan.sketchElements ?? null,
    };
    this.floorplans.set(floorplan.id, floorplan);
    return floorplan;
  }

  async updateFloorplan(id: number, updates: Partial<InsertFloorplan>): Promise<Floorplan | undefined> {
    const floorplan = this.floorplans.get(id);
    if (!floorplan) return undefined;
    
    const updatedFloorplan = { ...floorplan, ...updates };
    this.floorplans.set(id, updatedFloorplan);
    return updatedFloorplan;
  }

  async getAnomalies(): Promise<Anomaly[]> {
    return Array.from(this.anomalies.values());
  }

  async createAnomaly(insertAnomaly: InsertAnomaly): Promise<Anomaly> {
    const anomaly: Anomaly = {
      ...insertAnomaly,
      id: this.currentAnomalyId++,
      detected: new Date(),
      deviceId: insertAnomaly.deviceId ?? null,
      resolved: insertAnomaly.resolved ?? false,
    };
    this.anomalies.set(anomaly.id, anomaly);
    return anomaly;
  }

  async resolveAnomaly(id: number): Promise<boolean> {
    const anomaly = this.anomalies.get(id);
    if (!anomaly) return false;
    
    anomaly.resolved = true;
    this.anomalies.set(id, anomaly);
    return true;
  }

  async getRecommendations(): Promise<Recommendation[]> {
    return Array.from(this.recommendations.values());
  }

  async createRecommendation(insertRecommendation: InsertRecommendation): Promise<Recommendation> {
    const recommendation: Recommendation = {
      ...insertRecommendation,
      id: this.currentRecommendationId++,
      x: insertRecommendation.x ?? null,
      y: insertRecommendation.y ?? null,
      priority: insertRecommendation.priority ?? 1,
      applied: insertRecommendation.applied ?? false,
      improvementScore: insertRecommendation.improvementScore ?? null,
    };
    this.recommendations.set(recommendation.id, recommendation);
    return recommendation;
  }

  async applyRecommendation(id: number): Promise<boolean> {
    const recommendation = this.recommendations.get(id);
    if (!recommendation) return false;
    
    recommendation.applied = true;
    this.recommendations.set(id, recommendation);
    return true;
  }

  // Room operations
  async getRooms(floorplanId?: number): Promise<Room[]> {
    const allRooms = Array.from(this.rooms.values());
    if (floorplanId) {
      return allRooms.filter(room => room.floorplanId === floorplanId);
    }
    return allRooms;
  }

  async getRoom(id: number): Promise<Room | undefined> {
    return this.rooms.get(id);
  }

  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const room: Room = {
      id: this.currentRoomId++,
      ...insertRoom,
      createdAt: new Date()
    };
    this.rooms.set(room.id, room);
    return room;
  }

  async updateRoom(id: number, updates: Partial<InsertRoom>): Promise<Room | undefined> {
    const room = this.rooms.get(id);
    if (room) {
      Object.assign(room, updates);
      return room;
    }
    return undefined;
  }

  async deleteRoom(id: number): Promise<boolean> {
    return this.rooms.delete(id);
  }

  async deleteAllRooms(): Promise<void> {
    this.rooms.clear();
  }

  // Device telemetry operations
  async getDeviceTelemetry(deviceId: number, limit = 100): Promise<DeviceTelemetry[]> {
    const telemetry = Array.from(this.deviceTelemetry.values())
      .filter(t => t.deviceId === deviceId)
      .sort((a, b) => b.timestamp!.getTime() - a.timestamp!.getTime())
      .slice(0, limit);
    return telemetry;
  }

  async addDeviceTelemetry(insertTelemetry: InsertDeviceTelemetry): Promise<DeviceTelemetry> {
    const telemetry: DeviceTelemetry = {
      id: this.currentTelemetryId++,
      ...insertTelemetry,
      timestamp: new Date()
    };
    this.deviceTelemetry.set(telemetry.id, telemetry);
    return telemetry;
  }

  async getLatestTelemetry(deviceId: number): Promise<DeviceTelemetry | undefined> {
    const telemetry = Array.from(this.deviceTelemetry.values())
      .filter(t => t.deviceId === deviceId)
      .sort((a, b) => b.timestamp!.getTime() - a.timestamp!.getTime());
    return telemetry[0];
  }

  // ML model operations
  async getMlModels(modelType?: string): Promise<MlModel[]> {
    const allModels = Array.from(this.mlModels.values());
    if (modelType) {
      return allModels.filter(model => model.modelType === modelType);
    }
    return allModels;
  }

  async getActiveMlModel(modelType: string): Promise<MlModel | undefined> {
    return Array.from(this.mlModels.values())
      .find(model => model.modelType === modelType && model.isActive);
  }

  async createMlModel(insertModel: InsertMlModel): Promise<MlModel> {
    const model: MlModel = {
      id: this.currentMlModelId++,
      ...insertModel,
      createdAt: new Date(),
      lastTrainedAt: new Date()
    };
    this.mlModels.set(model.id, model);
    return model;
  }

  async updateMlModel(id: number, updates: Partial<InsertMlModel>): Promise<MlModel | undefined> {
    const model = this.mlModels.get(id);
    if (model) {
      Object.assign(model, updates);
      if (updates.version) {
        model.lastTrainedAt = new Date();
      }
      return model;
    }
    return undefined;
  }

  async setActiveModel(id: number, modelType: string): Promise<boolean> {
    // Deactivate all models of this type
    Array.from(this.mlModels.values())
      .filter(model => model.modelType === modelType)
      .forEach(model => model.isActive = false);
    
    // Activate the specified model
    const model = this.mlModels.get(id);
    if (model && model.modelType === modelType) {
      model.isActive = true;
      return true;
    }
    return false;
  }

  // Platform integration operations
  async getPlatformIntegrations(): Promise<PlatformIntegration[]> {
    return Array.from(this.platformIntegrations.values());
  }

  async getPlatformIntegration(platform: string): Promise<PlatformIntegration | undefined> {
    return Array.from(this.platformIntegrations.values())
      .find(integration => integration.platform === platform);
  }

  async createPlatformIntegration(insertIntegration: InsertPlatformIntegration): Promise<PlatformIntegration> {
    const integration: PlatformIntegration = {
      id: this.currentIntegrationId++,
      ...insertIntegration,
      lastSync: new Date()
    };
    this.platformIntegrations.set(integration.id, integration);
    return integration;
  }

  async addPlatformIntegration(insertIntegration: InsertPlatformIntegration): Promise<PlatformIntegration> {
    return this.createPlatformIntegration(insertIntegration);
  }

  async getAllPlatformIntegrations(): Promise<PlatformIntegration[]> {
    return this.getPlatformIntegrations();
  }

  async updatePlatformIntegration(id: number, updates: Partial<InsertPlatformIntegration>): Promise<PlatformIntegration | undefined> {
    const integration = this.platformIntegrations.get(id);
    if (integration) {
      Object.assign(integration, updates);
      integration.lastSync = new Date();
      return integration;
    }
    return undefined;
  }

  async removePlatformIntegration(platform: string): Promise<boolean> {
    const integration = Array.from(this.platformIntegrations.values())
      .find(integration => integration.platform === platform);
    
    if (integration) {
      this.platformIntegrations.delete(integration.id);
      // Also remove associated platform devices
      this.platformDevices.forEach((device, id) => {
        if (device.integrationId === integration.id) {
          this.platformDevices.delete(id);
        }
      });
      return true;
    }
    return false;
  }

  // Platform device operations
  async getPlatformDevices(integrationId?: number): Promise<PlatformDevice[]> {
    const allDevices = Array.from(this.platformDevices.values());
    if (integrationId) {
      return allDevices.filter(device => device.integrationId === integrationId);
    }
    return allDevices;
  }

  async addPlatformDevice(insertDevice: InsertPlatformDevice): Promise<PlatformDevice> {
    const device: PlatformDevice = {
      id: this.currentPlatformDeviceId++,
      ...insertDevice,
      lastUpdated: new Date()
    };
    this.platformDevices.set(device.id, device);
    return device;
  }

  async updatePlatformDevice(id: number, updates: Partial<InsertPlatformDevice>): Promise<PlatformDevice | undefined> {
    const device = this.platformDevices.get(id);
    if (device) {
      Object.assign(device, updates);
      device.lastUpdated = new Date();
      return device;
    }
    return undefined;
  }

  async updatePlatformDeviceState(platformDeviceId: string, newState: any): Promise<PlatformDevice | undefined> {
    const device = Array.from(this.platformDevices.values())
      .find(device => device.platformDeviceId === platformDeviceId);
    
    if (device) {
      const currentState = device.state || {};
      device.state = { ...currentState, ...newState };
      device.lastUpdated = new Date();
      return device;
    }
    return undefined;
  }

  // Predictive alert operations
  async getPredictiveAlerts(deviceId?: number): Promise<PredictiveAlert[]> {
    const allAlerts = Array.from(this.predictiveAlerts.values())
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
    
    if (deviceId) {
      return allAlerts.filter(alert => alert.deviceId === deviceId);
    }
    return allAlerts;
  }

  async createPredictiveAlert(insertAlert: InsertPredictiveAlert): Promise<PredictiveAlert> {
    const alert: PredictiveAlert = {
      id: this.currentAlertId++,
      ...insertAlert,
      createdAt: new Date()
    };
    this.predictiveAlerts.set(alert.id, alert);
    return alert;
  }

  async resolvePredictiveAlert(id: number): Promise<boolean> {
    const alert = this.predictiveAlerts.get(id);
    if (alert) {
      alert.isResolved = true;
      return true;
    }
    return false;
  }

  // Fusion result operations
  async getFusionResults(): Promise<FusionResult[]> {
    return Array.from(this.fusionResults.values());
  }

  async createFusionResult(result: InsertFusionResult): Promise<FusionResult> {
    const fusionResult: FusionResult = {
      ...result,
      id: this.currentFusionId++,
      timestamp: new Date(),
    };
    this.fusionResults.set(fusionResult.id, fusionResult);
    return fusionResult;
  }

  // ============================================
  // SECURITY SYSTEM OPERATIONS
  // ============================================

  // Resident operations
  async getResidents(): Promise<Resident[]> {
    return Array.from(this.residentsMap.values()).filter(r => r.isActive);
  }

  async getResident(id: number): Promise<Resident | undefined> {
    return this.residentsMap.get(id);
  }

  async createResident(insertResident: InsertResident): Promise<Resident> {
    const resident: Resident = {
      id: this.currentResidentId++,
      ...insertResident,
      role: insertResident.role ?? 'resident',
      isActive: insertResident.isActive ?? true,
      createdAt: new Date(),
      lastSeen: null,
    };
    this.residentsMap.set(resident.id, resident);
    return resident;
  }

  async updateResident(id: number, updates: Partial<InsertResident>): Promise<Resident | undefined> {
    const resident = this.residentsMap.get(id);
    if (resident) {
      Object.assign(resident, updates);
      return resident;
    }
    return undefined;
  }

  async deleteResident(id: number): Promise<boolean> {
    const resident = this.residentsMap.get(id);
    if (resident) {
      resident.isActive = false;
      return true;
    }
    return false;
  }

  // Resident device operations
  async getResidentDevices(residentId?: number): Promise<ResidentDevice[]> {
    const allDevices = Array.from(this.residentDevicesMap.values()).filter(d => d.isActive);
    if (residentId) {
      return allDevices.filter(d => d.residentId === residentId);
    }
    return allDevices;
  }

  async getResidentDeviceByMac(macAddress: string): Promise<ResidentDevice | undefined> {
    return Array.from(this.residentDevicesMap.values())
      .find(d => d.macAddress === macAddress && d.isActive);
  }

  async createResidentDevice(insertDevice: InsertResidentDevice): Promise<ResidentDevice> {
    const device: ResidentDevice = {
      id: this.currentResidentDeviceId++,
      ...insertDevice,
      isPrimary: insertDevice.isPrimary ?? false,
      isActive: insertDevice.isActive ?? true,
      createdAt: new Date(),
    };
    this.residentDevicesMap.set(device.id, device);
    return device;
  }

  async updateResidentDevice(id: number, updates: Partial<InsertResidentDevice>): Promise<ResidentDevice | undefined> {
    const device = this.residentDevicesMap.get(id);
    if (device) {
      Object.assign(device, updates);
      return device;
    }
    return undefined;
  }

  async deleteResidentDevice(id: number): Promise<boolean> {
    const device = this.residentDevicesMap.get(id);
    if (device) {
      device.isActive = false;
      return true;
    }
    return false;
  }

  // Security settings operations
  async getSecuritySettings(): Promise<SecuritySettings | undefined> {
    if (!this.securitySettingsData) {
      // Initialize default security settings
      this.securitySettingsData = {
        id: 1,
        securityMode: 'disarmed',
        autoArmEnabled: false,
        autoArmDelay: 300,
        entryDelay: 30,
        exitDelay: 60,
        silentAlarm: false,
        lastModeChange: new Date(),
        changedBy: null,
        updatedAt: new Date(),
      };
    }
    return this.securitySettingsData;
  }

  async updateSecuritySettings(updates: Partial<InsertSecuritySettings>): Promise<SecuritySettings> {
    const current = await this.getSecuritySettings();
    if (current) {
      Object.assign(current, updates);
      current.updatedAt = new Date();
      if (updates.securityMode) {
        current.lastModeChange = new Date();
      }
      this.securitySettingsData = current;
    }
    return this.securitySettingsData!;
  }

  // Security event operations
  async getSecurityEvents(limit = 100): Promise<SecurityEvent[]> {
    return Array.from(this.securityEventsMap.values())
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime())
      .slice(0, limit);
  }

  async getUnacknowledgedEvents(): Promise<SecurityEvent[]> {
    return Array.from(this.securityEventsMap.values())
      .filter(e => !e.isAcknowledged)
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async createSecurityEvent(insertEvent: InsertSecurityEvent): Promise<SecurityEvent> {
    const event: SecurityEvent = {
      id: this.currentSecurityEventId++,
      ...insertEvent,
      isAcknowledged: insertEvent.isAcknowledged ?? false,
      acknowledgedBy: null,
      acknowledgedAt: null,
      createdAt: new Date(),
    };
    this.securityEventsMap.set(event.id, event);
    return event;
  }

  async acknowledgeSecurityEvent(id: number, acknowledgedBy: number): Promise<boolean> {
    const event = this.securityEventsMap.get(id);
    if (event) {
      event.isAcknowledged = true;
      event.acknowledgedBy = acknowledgedBy;
      event.acknowledgedAt = new Date();
      return true;
    }
    return false;
  }

  // Notification channel operations
  async getNotificationChannels(residentId?: number): Promise<NotificationChannel[]> {
    const allChannels = Array.from(this.notificationChannelsMap.values());
    if (residentId) {
      return allChannels.filter(c => c.residentId === residentId);
    }
    return allChannels;
  }

  async createNotificationChannel(insertChannel: InsertNotificationChannel): Promise<NotificationChannel> {
    const channel: NotificationChannel = {
      id: this.currentNotificationChannelId++,
      ...insertChannel,
      isEnabled: insertChannel.isEnabled ?? true,
      notifyOnIntrusion: insertChannel.notifyOnIntrusion ?? true,
      notifyOnModeChange: insertChannel.notifyOnModeChange ?? false,
      notifyOnDeviceOffline: insertChannel.notifyOnDeviceOffline ?? false,
      notifyOnResidentActivity: insertChannel.notifyOnResidentActivity ?? false,
      createdAt: new Date(),
    };
    this.notificationChannelsMap.set(channel.id, channel);
    return channel;
  }

  async updateNotificationChannel(id: number, updates: Partial<InsertNotificationChannel>): Promise<NotificationChannel | undefined> {
    const channel = this.notificationChannelsMap.get(id);
    if (channel) {
      Object.assign(channel, updates);
      return channel;
    }
    return undefined;
  }

  async deleteNotificationChannel(id: number): Promise<boolean> {
    return this.notificationChannelsMap.delete(id);
  }

  // Presence history operations
  async getPresenceHistory(residentId?: number, limit = 100): Promise<PresenceHistory[]> {
    let history = Array.from(this.presenceHistoryMap.values())
      .sort((a, b) => b.timestamp!.getTime() - a.timestamp!.getTime());

    if (residentId) {
      history = history.filter(h => h.residentId === residentId);
    }
    return history.slice(0, limit);
  }

  async createPresenceHistory(insertEntry: InsertPresenceHistory): Promise<PresenceHistory> {
    const entry: PresenceHistory = {
      id: this.currentPresenceHistoryId++,
      ...insertEntry,
      timestamp: new Date(),
    };
    this.presenceHistoryMap.set(entry.id, entry);

    // Update resident's lastSeen
    if (insertEntry.residentId) {
      const resident = this.residentsMap.get(insertEntry.residentId);
      if (resident) {
        resident.lastSeen = new Date();
      }
    }
    return entry;
  }

  async getResidentsAtHome(): Promise<Resident[]> {
    const residentsAtHome: Resident[] = [];
    const residents = await this.getResidents();

    for (const resident of residents) {
      const history = await this.getPresenceHistory(resident.id, 1);
      if (history.length > 0 && history[0].eventType === 'arrived') {
        residentsAtHome.push(resident);
      }
    }
    return residentsAtHome;
  }
}

export const storage = new MemStorage();
