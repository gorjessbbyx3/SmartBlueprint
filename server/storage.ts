import { 
  devices, 
  floorplans, 
  anomalies, 
  recommendations,
  rooms,
  deviceTelemetry,
  mlModels,
  platformIntegrations,
  predictiveAlerts,
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
  type PredictiveAlert,
  type InsertPredictiveAlert
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
  getPlatformIntegration(platform: string): Promise<PlatformIntegration | undefined>;
  createPlatformIntegration(integration: InsertPlatformIntegration): Promise<PlatformIntegration>;
  updatePlatformIntegration(id: number, updates: Partial<InsertPlatformIntegration>): Promise<PlatformIntegration | undefined>;

  // Predictive alert operations
  getPredictiveAlerts(deviceId?: number): Promise<PredictiveAlert[]>;
  createPredictiveAlert(alert: InsertPredictiveAlert): Promise<PredictiveAlert>;
  resolvePredictiveAlert(id: number): Promise<boolean>;
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
  private predictiveAlerts: Map<number, PredictiveAlert> = new Map();
  private currentDeviceId = 1;
  private currentFloorplanId = 1;
  private currentAnomalyId = 1;
  private currentRecommendationId = 1;
  private currentRoomId = 1;
  private currentTelemetryId = 1;
  private currentMlModelId = 1;
  private currentIntegrationId = 1;
  private currentAlertId = 1;

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
      createdAt: new Date(),
      lastSyncAt: new Date()
    };
    this.platformIntegrations.set(integration.id, integration);
    return integration;
  }

  async updatePlatformIntegration(id: number, updates: Partial<InsertPlatformIntegration>): Promise<PlatformIntegration | undefined> {
    const integration = this.platformIntegrations.get(id);
    if (integration) {
      Object.assign(integration, updates);
      integration.lastSyncAt = new Date();
      return integration;
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
}

export const storage = new MemStorage();
