import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { 
  insertDeviceSchema, 
  insertFloorplanSchema, 
  insertAnomalySchema, 
  insertRecommendationSchema,
  insertRoomSchema,
  insertDeviceTelemetrySchema,
  insertMlModelSchema,
  insertPlatformIntegrationSchema,
  insertPredictiveAlertSchema
} from "@shared/schema";
import { z } from "zod";
import { exec } from 'child_process';
import { promisify } from 'util';
import { mlAnalytics } from './ml-analytics';
import { monitoringService } from './monitoring-service';

const execAsync = promisify(exec);

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
              // Use system ping to check device status
              const { stdout } = await execAsync(`ping -c 1 -W 1 ${device.macAddress} 2>/dev/null || true`);
              const isAlive = stdout.includes('1 received') || stdout.includes('1 packets transmitted, 1 received');
              
              if (!isAlive && device.isOnline) {
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
              } else if (isAlive && !device.isOnline) {
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

  // Room management routes
  app.get("/api/rooms", async (req, res) => {
    try {
      const floorplanId = req.query.floorplanId ? parseInt(req.query.floorplanId as string) : undefined;
      const rooms = await storage.getRooms(floorplanId);
      res.json(rooms);
    } catch (error) {
      res.status(500).json({ message: "Failed to get rooms", error: error.message });
    }
  });

  app.post("/api/rooms", async (req, res) => {
    try {
      const roomData = insertRoomSchema.parse(req.body);
      const room = await storage.createRoom(roomData);
      res.status(201).json(room);
    } catch (error) {
      res.status(400).json({ message: "Failed to create room", error: error.message });
    }
  });

  app.put("/api/rooms/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertRoomSchema.partial().parse(req.body);
      const room = await storage.updateRoom(id, updates);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      res.json(room);
    } catch (error) {
      res.status(400).json({ message: "Failed to update room", error: error.message });
    }
  });

  app.delete("/api/rooms/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteRoom(id);
      if (!success) {
        return res.status(404).json({ message: "Room not found" });
      }
      res.json({ message: "Room deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete room", error: error.message });
    }
  });

  // Device telemetry routes
  app.get("/api/devices/:deviceId/telemetry", async (req, res) => {
    try {
      const deviceId = parseInt(req.params.deviceId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const telemetry = await storage.getDeviceTelemetry(deviceId, limit);
      res.json(telemetry);
    } catch (error) {
      res.status(500).json({ message: "Failed to get telemetry", error: error.message });
    }
  });

  app.post("/api/devices/:deviceId/telemetry", async (req, res) => {
    try {
      const deviceId = parseInt(req.params.deviceId);
      const telemetryData = insertDeviceTelemetrySchema.parse({
        ...req.body,
        deviceId
      });
      const telemetry = await storage.addDeviceTelemetry(telemetryData);
      res.status(201).json(telemetry);
    } catch (error) {
      res.status(400).json({ message: "Failed to add telemetry", error: error.message });
    }
  });

  // ML model management routes
  app.get("/api/ml/models", async (req, res) => {
    try {
      const modelType = req.query.type as string | undefined;
      const models = await storage.getMlModels(modelType);
      res.json(models);
    } catch (error) {
      res.status(500).json({ message: "Failed to get ML models", error: error.message });
    }
  });

  app.post("/api/ml/models", async (req, res) => {
    try {
      const modelData = insertMlModelSchema.parse(req.body);
      const model = await storage.createMlModel(modelData);
      res.status(201).json(model);
    } catch (error) {
      res.status(400).json({ message: "Failed to create ML model", error: error.message });
    }
  });

  app.put("/api/ml/models/:id/activate", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { modelType } = req.body;
      const success = await storage.setActiveModel(id, modelType);
      if (!success) {
        return res.status(404).json({ message: "Model not found" });
      }
      res.json({ message: "Model activated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to activate model", error: error.message });
    }
  });

  // ML analytics routes
  app.post("/api/ml/analyze", async (req, res) => {
    try {
      await mlAnalytics.initializeModels();
      const devices = await storage.getDevices();
      
      // Perform ML analysis
      const fingerprints = await mlAnalytics.performLocationFingerprinting(devices);
      const anomalies = await mlAnalytics.detectAnomalies(devices);
      const maintenance = await mlAnalytics.performPredictiveMaintenance(devices);
      
      res.json({
        locationFingerprints: fingerprints.length,
        anomaliesDetected: anomalies.length,
        maintenanceAlerts: maintenance.length,
        analysis: {
          fingerprints: fingerprints.slice(0, 10), // Sample fingerprints
          anomalies,
          maintenance
        }
      });
    } catch (error) {
      res.status(500).json({ message: "ML analysis failed", error: error.message });
    }
  });

  app.post("/api/ml/train", async (req, res) => {
    try {
      const devices = await storage.getDevices();
      await mlAnalytics.trainModels(devices);
      res.json({ message: "Models trained successfully", deviceCount: devices.length });
    } catch (error) {
      res.status(500).json({ message: "Model training failed", error: error.message });
    }
  });

  // Platform integration routes
  app.get("/api/integrations", async (req, res) => {
    try {
      const integrations = await storage.getPlatformIntegrations();
      res.json(integrations);
    } catch (error) {
      res.status(500).json({ message: "Failed to get integrations", error: error.message });
    }
  });

  app.post("/api/integrations", async (req, res) => {
    try {
      const integrationData = insertPlatformIntegrationSchema.parse(req.body);
      const integration = await storage.createPlatformIntegration(integrationData);
      res.status(201).json(integration);
    } catch (error) {
      res.status(400).json({ message: "Failed to create integration", error: error.message });
    }
  });

  app.put("/api/integrations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertPlatformIntegrationSchema.partial().parse(req.body);
      const integration = await storage.updatePlatformIntegration(id, updates);
      if (!integration) {
        return res.status(404).json({ message: "Integration not found" });
      }
      res.json(integration);
    } catch (error) {
      res.status(400).json({ message: "Failed to update integration", error: error.message });
    }
  });

  // Predictive alerts routes
  app.get("/api/alerts", async (req, res) => {
    try {
      const deviceId = req.query.deviceId ? parseInt(req.query.deviceId as string) : undefined;
      const alerts = await storage.getPredictiveAlerts(deviceId);
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ message: "Failed to get alerts", error: error.message });
    }
  });

  app.post("/api/alerts", async (req, res) => {
    try {
      const alertData = insertPredictiveAlertSchema.parse(req.body);
      const alert = await storage.createPredictiveAlert(alertData);
      res.status(201).json(alert);
    } catch (error) {
      res.status(400).json({ message: "Failed to create alert", error: error.message });
    }
  });

  app.put("/api/alerts/:id/resolve", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.resolvePredictiveAlert(id);
      if (!success) {
        return res.status(404).json({ message: "Alert not found" });
      }
      res.json({ message: "Alert resolved successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to resolve alert", error: error.message });
    }
  });

  // Room auto-detection route
  app.post("/api/rooms/auto-detect", async (req, res) => {
    try {
      const { floorplanId } = req.body;
      const devices = await storage.getDevices();
      
      // Perform room detection using ML clustering
      await mlAnalytics.initializeModels();
      const fingerprints = await mlAnalytics.performLocationFingerprinting(devices);
      
      // Simple clustering algorithm for room detection
      const roomClusters = await autoDetectRooms(fingerprints, devices);
      const detectedRooms = [];
      
      for (const [index, cluster] of roomClusters.entries()) {
        const room = await storage.createRoom({
          floorplanId,
          name: `Room ${index + 1}`,
          boundaries: JSON.stringify(cluster.boundary),
          roomType: detectRoomType(cluster),
          detectedAutomatically: true
        });
        detectedRooms.push(room);
      }
      
      res.json({
        message: `Auto-detected ${detectedRooms.length} rooms`,
        rooms: detectedRooms
      });
    } catch (error) {
      res.status(500).json({ message: "Room auto-detection failed", error: error.message });
    }
  });

  // 24/7 Monitoring Service Endpoints
  app.post("/api/monitoring/start", async (req, res) => {
    try {
      await monitoringService.startMonitoring();
      res.json({ 
        message: "24/7 monitoring service started",
        status: "active"
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to start monitoring service" });
    }
  });

  app.post("/api/monitoring/stop", async (req, res) => {
    try {
      await monitoringService.stopMonitoring();
      res.json({ 
        message: "Monitoring service stopped",
        status: "inactive"
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to stop monitoring service" });
    }
  });

  app.get("/api/monitoring/status", async (req, res) => {
    try {
      const isRunning = monitoringService.isRunning();
      const activeAlerts = monitoringService.getActiveAlerts();
      const environmentMetrics = monitoringService.getEnvironmentMetrics();
      
      res.json({
        isActive: isRunning,
        activeAlerts: activeAlerts.length,
        criticalAlerts: activeAlerts.filter(a => a.severity === 'critical').length,
        environmentMetrics: environmentMetrics,
        lastUpdate: new Date()
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get monitoring status" });
    }
  });

  app.get("/api/monitoring/alerts", async (req, res) => {
    try {
      const alerts = monitoringService.getActiveAlerts();
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  app.post("/api/monitoring/alerts/:id/resolve", async (req, res) => {
    try {
      const alertId = req.params.id;
      const resolved = await monitoringService.resolveAlert(alertId);
      
      if (resolved) {
        res.json({ message: "Alert resolved successfully" });
      } else {
        res.status(404).json({ message: "Alert not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to resolve alert" });
    }
  });

  app.get("/api/monitoring/environment", async (req, res) => {
    try {
      const hours = parseInt(req.query.hours as string) || 24;
      const history = monitoringService.getEnvironmentHistory(hours);
      const currentMetrics = monitoringService.getEnvironmentMetrics();
      
      res.json({
        current: currentMetrics,
        history: history,
        timeRange: `${hours} hours`
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch environment data" });
    }
  });

  // WebSocket connection handler with monitoring integration
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    
    // Send initial monitoring status
    ws.send(JSON.stringify({
      type: 'monitoring_status',
      data: {
        isActive: monitoringService.isRunning(),
        activeAlerts: monitoringService.getActiveAlerts().length,
        environmentMetrics: monitoringService.getEnvironmentMetrics()
      }
    }));

    // Enhance monitoring service to broadcast alerts via WebSocket
    const originalBroadcast = (monitoringService as any).broadcastAlert;
    (monitoringService as any).broadcastAlert = (alert: any) => {
      // Send alert to all connected WebSocket clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'alert',
            data: alert
          }));
        }
      });
      
      if (originalBroadcast) {
        originalBroadcast.call(monitoringService, alert);
      }
    };
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  // Auto-start monitoring service
  if (!monitoringService.isRunning()) {
    console.log('Auto-starting 24/7 monitoring service...');
    monitoringService.startMonitoring().catch(error => {
      console.error('Failed to auto-start monitoring service:', error);
    });
  }

  return httpServer;
}

// Helper functions for room auto-detection
async function autoDetectRooms(fingerprints: any[], devices: any[]): Promise<any[]> {
  // Simple clustering algorithm to detect room boundaries
  const clusters: any[] = [];
  const processedPoints = new Set<string>();
  
  for (const fingerprint of fingerprints) {
    const key = `${fingerprint.location.x},${fingerprint.location.y}`;
    if (processedPoints.has(key)) continue;
    
    // Find nearby points with similar signal patterns
    const cluster = {
      center: fingerprint.location,
      boundary: [
        { x: fingerprint.location.x - 50, y: fingerprint.location.y - 50 },
        { x: fingerprint.location.x + 50, y: fingerprint.location.y - 50 },
        { x: fingerprint.location.x + 50, y: fingerprint.location.y + 50 },
        { x: fingerprint.location.x - 50, y: fingerprint.location.y + 50 }
      ],
      signalPattern: fingerprint.signalPattern,
      deviceCount: 0
    };
    
    // Count devices in this potential room
    for (const device of devices) {
      const distance = Math.sqrt(
        Math.pow((device.x || 0) - fingerprint.location.x, 2) + 
        Math.pow((device.y || 0) - fingerprint.location.y, 2)
      );
      if (distance < 100) {
        cluster.deviceCount++;
      }
    }
    
    if (cluster.deviceCount > 0) {
      clusters.push(cluster);
      processedPoints.add(key);
    }
  }
  
  return clusters.slice(0, 5); // Limit to 5 rooms
}

function detectRoomType(cluster: any): string {
  // Simple heuristics for room type detection
  if (cluster.deviceCount >= 3) return 'living_room';
  if (cluster.deviceCount === 2) return 'bedroom';
  if (cluster.deviceCount === 1) return 'bathroom';
  return 'utility_room';
}
