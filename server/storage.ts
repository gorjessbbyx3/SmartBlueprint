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
    // Initialize with sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Sample devices
    const sampleDevices: Device[] = [
      {
        id: 1,
        name: "Smart TV - Living Room",
        macAddress: "AA:BB:CC:DD:EE:FF",
        deviceType: "smart_tv",
        protocol: "wifi",
        rssi: -45,
        x: 180,
        y: 80,
        isOnline: true,
        lastSeen: new Date(),
        telemetryData: { temperature: 22, powerConsumption: 85 }
      },
      {
        id: 2,
        name: "Philips Hue Bridge",
        macAddress: "11:22:33:44:55:66",
        deviceType: "hue_bridge",
        protocol: "zigbee",
        rssi: -38,
        x: 420,
        y: 120,
        isOnline: true,
        lastSeen: new Date(),
        telemetryData: { connectedDevices: 8 }
      },
      {
        id: 3,
        name: "Nest Thermostat",
        macAddress: "77:88:99:AA:BB:CC",
        deviceType: "thermostat",
        protocol: "wifi",
        rssi: -52,
        x: 120,
        y: 280,
        isOnline: true,
        lastSeen: new Date(),
        telemetryData: { temperature: 21.5, humidity: 45, targetTemp: 22 }
      }
    ];

    sampleDevices.forEach(device => {
      this.devices.set(device.id, device);
    });
    this.currentDeviceId = 4;

    // Sample floorplan
    const sampleFloorplan: Floorplan = {
      id: 1,
      name: "Living Area",
      scale: "1:200",
      width: 800,
      height: 600,
      data: {
        rooms: [
          { name: "Living Room", x: 50, y: 50, width: 300, height: 200 },
          { name: "Kitchen", x: 350, y: 50, width: 200, height: 200 },
          { name: "Bedroom", x: 50, y: 250, width: 200, height: 150 },
          { name: "Bathroom", x: 250, y: 250, width: 300, height: 150 }
        ],
        doors: [
          { x1: 200, y1: 50, x2: 220, y2: 50 },
          { x1: 350, y1: 150, x2: 370, y2: 150 }
        ],
        windows: [
          { x1: 80, y1: 50, x2: 120, y2: 50 },
          { x1: 480, y1: 50, x2: 520, y2: 50 }
        ]
      }
    };

    this.floorplans.set(1, sampleFloorplan);
    this.currentFloorplanId = 2;

    // Sample anomaly
    const sampleAnomaly: Anomaly = {
      id: 1,
      deviceId: 1,
      type: "signal_drop",
      severity: "medium",
      description: "Smart TV signal dropped 15dB",
      detected: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
      resolved: false
    };

    this.anomalies.set(1, sampleAnomaly);
    this.currentAnomalyId = 2;

    // Sample recommendation
    const sampleRecommendation: Recommendation = {
      id: 1,
      type: "wifi_extender",
      description: "Add Wi-Fi extender to improve coverage by 23%",
      x: 320,
      y: 340,
      priority: 1,
      applied: false,
      improvementScore: 23
    };

    this.recommendations.set(1, sampleRecommendation);
    this.currentRecommendationId = 2;
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
    for (const [id, device] of this.devices.entries()) {
      if (device.macAddress === macAddress) {
        device.rssi = rssi;
        device.lastSeen = new Date();
        this.devices.set(id, device);
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
