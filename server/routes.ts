import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertDeviceSchema, insertFloorplanSchema, insertAnomalySchema, insertRecommendationSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Device routes
  app.get("/api/devices", async (req, res) => {
    try {
      const devices = await storage.getDevices();
      res.json(devices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch devices" });
    }
  });

  app.get("/api/devices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const device = await storage.getDevice(id);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      res.json(device);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch device" });
    }
  });

  app.post("/api/devices", async (req, res) => {
    try {
      const deviceData = insertDeviceSchema.parse(req.body);
      const device = await storage.createDevice(deviceData);
      res.json(device);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid device data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create device" });
    }
  });

  app.patch("/api/devices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertDeviceSchema.partial().parse(req.body);
      const device = await storage.updateDevice(id, updates);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      res.json(device);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid device data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update device" });
    }
  });

  app.delete("/api/devices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteDevice(id);
      if (!deleted) {
        return res.status(404).json({ message: "Device not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete device" });
    }
  });

  // Floorplan routes
  app.get("/api/floorplans", async (req, res) => {
    try {
      const floorplans = await storage.getFloorplans();
      res.json(floorplans);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch floorplans" });
    }
  });

  app.get("/api/floorplans/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const floorplan = await storage.getFloorplan(id);
      if (!floorplan) {
        return res.status(404).json({ message: "Floorplan not found" });
      }
      res.json(floorplan);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch floorplan" });
    }
  });

  app.post("/api/floorplans", async (req, res) => {
    try {
      const floorplanData = insertFloorplanSchema.parse(req.body);
      const floorplan = await storage.createFloorplan(floorplanData);
      res.json(floorplan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid floorplan data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create floorplan" });
    }
  });

  // Anomaly routes
  app.get("/api/anomalies", async (req, res) => {
    try {
      const anomalies = await storage.getAnomalies();
      res.json(anomalies);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch anomalies" });
    }
  });

  app.post("/api/anomalies", async (req, res) => {
    try {
      const anomalyData = insertAnomalySchema.parse(req.body);
      const anomaly = await storage.createAnomaly(anomalyData);
      res.json(anomaly);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid anomaly data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create anomaly" });
    }
  });

  app.patch("/api/anomalies/:id/resolve", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const resolved = await storage.resolveAnomaly(id);
      if (!resolved) {
        return res.status(404).json({ message: "Anomaly not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to resolve anomaly" });
    }
  });

  // Recommendation routes
  app.get("/api/recommendations", async (req, res) => {
    try {
      const recommendations = await storage.getRecommendations();
      res.json(recommendations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recommendations" });
    }
  });

  app.post("/api/recommendations", async (req, res) => {
    try {
      const recommendationData = insertRecommendationSchema.parse(req.body);
      const recommendation = await storage.createRecommendation(recommendationData);
      res.json(recommendation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid recommendation data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create recommendation" });
    }
  });

  app.patch("/api/recommendations/:id/apply", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const applied = await storage.applyRecommendation(id);
      if (!applied) {
        return res.status(404).json({ message: "Recommendation not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to apply recommendation" });
    }
  });

  // Real device discovery using network scanning
  app.post("/api/devices/scan", async (req, res) => {
    try {
      const { networkScanner } = await import("./device-scanner");
      
      if (networkScanner.isScanning()) {
        return res.status(409).json({ message: "Scan already in progress" });
      }
      
      console.log("Starting network device scan...");
      const discoveredDevices = await networkScanner.startScan();
      
      // Convert scanned devices to our device format
      const formattedDevices = discoveredDevices.map(device => ({
        name: device.name,
        macAddress: device.macAddress,
        deviceType: device.deviceType,
        protocol: device.protocol,
        rssi: device.rssi,
        isOnline: device.isOnline,
        telemetryData: device.manufacturer ? { manufacturer: device.manufacturer, model: device.model } : null
      }));
      
      console.log(`Network scan completed. Found ${formattedDevices.length} devices.`);
      res.json({ devices: formattedDevices, scanTime: new Date() });
    } catch (error) {
      console.error("Device scan failed:", error);
      res.status(500).json({ 
        message: "Failed to scan for devices", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Coverage analysis
  app.post("/api/coverage/analyze", async (req, res) => {
    try {
      const devices = await storage.getDevices();
      
      // Simple coverage calculation based on device positions and RSSI
      let totalCoverage = 0;
      let coveragePoints = 0;
      
      // Sample coverage calculation (simplified)
      for (let x = 0; x < 800; x += 20) {
        for (let y = 0; y < 600; y += 20) {
          let maxSignal = -100;
          devices.forEach(device => {
            if (device.x && device.y) {
              const distance = Math.sqrt(Math.pow(x - device.x, 2) + Math.pow(y - device.y, 2));
              const estimatedRSSI = device.rssi - (distance * 0.1); // Simple path loss model
              maxSignal = Math.max(maxSignal, estimatedRSSI);
            }
          });
          
          if (maxSignal > -70) { // Minimum usable signal
            totalCoverage++;
          }
          coveragePoints++;
        }
      }
      
      const coverageScore = Math.round((totalCoverage / coveragePoints) * 100);
      
      res.json({
        coverageScore,
        weakSpots: [
          { x: 300, y: 320, strength: -75 },
          { x: 500, y: 280, strength: -72 }
        ],
        recommendations: [
          {
            type: "wifi_extender",
            description: "Add Wi-Fi extender to improve coverage",
            x: 320,
            y: 340,
            improvementScore: 23
          }
        ]
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to analyze coverage" });
    }
  });

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    
    // Send initial data
    ws.send(JSON.stringify({
      type: 'connection',
      message: 'Connected to SmartMap Pro'
    }));
    
    // Real-time monitoring of discovered devices
    const interval = setInterval(async () => {
      try {
        const devices = await storage.getDevices();
        
        if (devices.length > 0) {
          // Perform periodic ping checks on discovered devices to update their status
          for (const device of devices) {
            try {
              const ping = await import('ping');
              const result = await ping.promise.probe(device.macAddress, { timeout: 2 });
              
              if (!result.alive && device.isOnline) {
                // Device went offline
                await storage.updateDevice(device.id, { isOnline: false });
                
                const anomaly = {
                  deviceId: device.id,
                  type: "device_offline" as const,
                  severity: "medium" as const,
                  description: `${device.name} has gone offline`,
                };
                
                await storage.createAnomaly(anomaly);
                
                ws.send(JSON.stringify({
                  type: 'anomaly',
                  data: anomaly
                }));
              } else if (result.alive && !device.isOnline) {
                // Device came back online
                await storage.updateDevice(device.id, { isOnline: true });
              }
            } catch (error) {
              // If we can't ping by MAC, skip this device
              continue;
            }
          }
          
          // Send updated device data
          const updatedDevices = await storage.getDevices();
          ws.send(JSON.stringify({
            type: 'devices_update',
            data: updatedDevices
          }));
        }
        
      } catch (error) {
        console.error('Error in WebSocket update:', error);
      }
    }, 15000); // Check every 15 seconds
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      clearInterval(interval);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clearInterval(interval);
    });
  });

  return httpServer;
}
