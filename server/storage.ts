import { 
  devices, 
  floorplans, 
  anomalies, 
  recommendations,
  type Device, 
  type InsertDevice,
  type Floorplan,
  type InsertFloorplan,
  type Anomaly,
  type InsertAnomaly,
  type Recommendation,
  type InsertRecommendation
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
}

export class MemStorage implements IStorage {
  private devices: Map<number, Device> = new Map();
  private floorplans: Map<number, Floorplan> = new Map();
  private anomalies: Map<number, Anomaly> = new Map();
  private recommendations: Map<number, Recommendation> = new Map();
  private currentDeviceId = 1;
  private currentFloorplanId = 1;
  private currentAnomalyId = 1;
  private currentRecommendationId = 1;

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
}

export const storage = new MemStorage();
