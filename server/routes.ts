import { Express, Request, Response } from "express";
import { createServer, Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage.js";
import { createInsertSchema } from "drizzle-zod";
import { devices, floorplans, anomalies, recommendations } from "../shared/schema.js";
import { z } from "zod";
import { aiAgentBackend } from "./ai-agent-backend.js";
import { cloudSyncTunnel } from "./cloud-sync-tunnel.js";
import { networkScanner } from "./device-scanner.js";
import { monitoringService } from "./monitoring-service.js";
import { advancedSignalProcessor } from "./advanced-signal-processing.js";
import { enhancedDeviceTelemetry } from "./enhanced-device-telemetry.js";
import { AdvancedLocationEngine, LSTMAnomalyDetector, IsolationForestDetector } from "./advanced-ml-models.js";
import { mlAnalytics } from "./ml-analytics.js";
import { activePingProbing } from "./active-ping-probing.js";
import type { PingMeasurement, ProbeData, CalibrationPoint } from "./active-ping-probing.js";

const insertDeviceSchema = createInsertSchema(devices);
const insertFloorplanSchema = createInsertSchema(floorplans);
const insertAnomalySchema = createInsertSchema(anomalies);
const insertRecommendationSchema = createInsertSchema(recommendations);

type Device = typeof devices.$inferSelect;
type Floorplan = typeof floorplans.$inferSelect;
type Anomaly = typeof anomalies.$inferSelect;
type Recommendation = typeof recommendations.$inferSelect;

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Create WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // WebSocket connection handling
  wss.on('connection', (ws: WebSocket, request) => {
    console.log('New WebSocket connection established');
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('WebSocket message received:', data.type);
        
        // Handle different message types
        switch (data.type) {
          case 'device_update':
            // Broadcast device updates to all connected clients
            wss.clients.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
              }
            });
            break;
          
          case 'scan_request':
            // Trigger device scanning
            try {
              const devices = await networkScanner.startScan();
              ws.send(JSON.stringify({
                type: 'scan_result',
                devices: devices
              }));
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Device scanning failed'
              }));
            }
            break;

          case 'ping':
            // Handle ping measurements from desktop agent
            try {
              const { ping, timestamp } = data;
              console.log('[Active Ping] Received ping data:', ping);
              
              // Process ping data and broadcast to clients
              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: 'ping_update',
                    ping: ping,
                    timestamp: timestamp
                  }));
                }
              });
            } catch (error) {
              console.error('[Active Ping] Error processing ping data:', error);
            }
            break;

          case 'probe':
            // Handle RTT/ping probe data for positioning
            try {
              const probeData: ProbeData = data;
              const processed = activePingProbing.processProbeData(probeData);
              
              // Broadcast processed measurements to clients
              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: 'probe_results',
                    rttMeasurements: processed.rttMeasurements,
                    pingMeasurements: processed.pingMeasurements,
                    timestamp: probeData.timestamp
                  }));
                }
              });
            } catch (error) {
              console.error('[Active Ping] Error processing probe data:', error);
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });
  });

  // Device routes
  app.get("/api/devices", async (req: Request, res: Response) => {
    try {
      const allDevices = await storage.getDevices();
      res.json({
        success: true,
        devices: allDevices
      });
    } catch (error) {
      console.error('Failed to get devices:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to retrieve devices" 
      });
    }
  });

  app.post("/api/devices", async (req: Request, res: Response) => {
    try {
      const deviceData = insertDeviceSchema.parse(req.body);
      const newDevice = await storage.createDevice(deviceData);
      
      // Broadcast new device to WebSocket clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'device_added',
            device: newDevice
          }));
        }
      });
      
      res.json({
        success: true,
        device: newDevice
      });
    } catch (error) {
      console.error('Failed to add device:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to add device" 
      });
    }
  });

  app.put("/api/devices/:id", async (req: Request, res: Response) => {
    try {
      const deviceId = parseInt(req.params.id);
      const updateData = req.body;
      
      const updatedDevice = await storage.updateDevice(deviceId, updateData);
      
      // Broadcast device update to WebSocket clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'device_updated',
            device: updatedDevice
          }));
        }
      });
      
      res.json({
        success: true,
        device: updatedDevice
      });
    } catch (error) {
      console.error('Failed to update device:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to update device" 
      });
    }
  });

  app.delete("/api/devices/:id", async (req: Request, res: Response) => {
    try {
      const deviceId = parseInt(req.params.id);
      await storage.deleteDevice(deviceId);
      
      // Broadcast device deletion to WebSocket clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'device_deleted',
            deviceId: deviceId
          }));
        }
      });
      
      res.json({
        success: true,
        message: "Device deleted successfully"
      });
    } catch (error) {
      console.error('Failed to delete device:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to delete device" 
      });
    }
  });

  // Device scanning
  app.post("/api/devices/scan", async (req: Request, res: Response) => {
    try {
      const devices = await networkScanner.startScan();
      res.json({
        success: true,
        devices: devices,
        message: `Found ${devices.length} devices`
      });
    } catch (error) {
      console.error('Device scan failed:', error);
      res.status(500).json({ 
        success: false, 
        message: "Device scanning failed" 
      });
    }
  });

  // Floorplan routes
  app.get("/api/floorplans", async (req: Request, res: Response) => {
    try {
      const floorplans = await storage.getFloorplans();
      res.json({
        success: true,
        floorplans: floorplans
      });
    } catch (error) {
      console.error('Failed to get floorplans:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to retrieve floorplans" 
      });
    }
  });

  app.post("/api/floorplans", async (req: Request, res: Response) => {
    try {
      const floorplanData = insertFloorplanSchema.parse(req.body);
      const newFloorplan = await storage.createFloorplan(floorplanData);
      
      res.json({
        success: true,
        floorplan: newFloorplan
      });
    } catch (error) {
      console.error('Failed to add floorplan:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to add floorplan" 
      });
    }
  });

  // Anomaly routes
  app.get("/api/anomalies", async (req: Request, res: Response) => {
    try {
      const anomalies = await storage.getAnomalies();
      res.json({
        success: true,
        anomalies: anomalies
      });
    } catch (error) {
      console.error('Failed to get anomalies:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to retrieve anomalies" 
      });
    }
  });

  // Recommendation routes
  app.get("/api/recommendations", async (req: Request, res: Response) => {
    try {
      const recommendations = await storage.getRecommendations();
      res.json({
        success: true,
        recommendations: recommendations
      });
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to retrieve recommendations" 
      });
    }
  });

  // AI Agent routes
  app.get("/api/ai/agents", async (req: Request, res: Response) => {
    try {
      const agents = aiAgentBackend.getAgentStatus();
      res.json({
        success: true,
        agents: agents
      });
    } catch (error) {
      console.error('Failed to get AI agents:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to retrieve AI agents" 
      });
    }
  });

  // Desktop Agent Information
  app.get('/api/download/desktop-agent', (req, res) => {
    res.json({
      success: true,
      message: "Desktop Agent Ready for Download",
      instructions: [
        "The desktop agent is required for local network scanning due to browser security limitations",
        "Contact support for the latest desktop agent installer",
        "Agent provides: WiFi signal scanning, device discovery, real-time synchronization"
      ],
      requirements: ["Node.js 16+", "Network administrator privileges", "Local network access"],
      version: "1.0.0"
    });
  });

  // Smart Home Platform Integration Routes
  app.get('/api/platforms/supported', (req, res) => {
    res.json({
      success: true,
      platforms: [
        {
          id: 'philips_hue',
          name: 'Philips Hue',
          icon: 'lightbulb',
          description: 'Connect Philips Hue smart lights for intelligent lighting control'
        },
        {
          id: 'nest',
          name: 'Nest',
          icon: 'thermometer', 
          description: 'Integrate Nest thermostats and sensors for climate monitoring'
        },
        {
          id: 'alexa',
          name: 'Amazon Alexa',
          icon: 'volume-2',
          description: 'Connect Alexa-enabled devices for voice control automation'
        }
      ]
    });
  });

  app.post('/api/platforms/:platform/authenticate', async (req, res) => {
    try {
      const { platform } = req.params;
      const credentials = req.body;
      
      // Platform authentication for smart home integration
      if (platform === 'philips_hue') {
        const integration = await storage.addPlatformIntegration({
          platform,
          userId: 'default-user',
          accessToken: 'hue-bridge-token',
          refreshToken: null,
          tokenExpiry: null,
          bridgeIp: credentials.bridgeIp || '192.168.1.100',
          platformUserId: null,
          isActive: true,
          config: {}
        });
        
        res.json({ 
          success: true, 
          integrationId: integration.id,
          bridgeIp: integration.bridgeIp 
        });
      } else if (platform === 'nest') {
        res.json({ 
          success: false, 
          error: 'Nest integration requires Google Device Access API credentials. Please provide your API keys.'
        });
      } else if (platform === 'alexa') {
        res.json({ 
          success: false, 
          error: 'Alexa integration requires Amazon Developer credentials. Please provide your API keys.'
        });
      } else {
        res.status(400).json({ success: false, error: 'Unsupported platform' });
      }
    } catch (error) {
      console.error('Platform authentication failed:', error);
      res.status(500).json({ success: false, error: 'Authentication failed' });
    }
  });

  app.get('/api/platforms/:platform/devices', async (req, res) => {
    try {
      const { platform } = req.params;
      const integration = await storage.getPlatformIntegration(platform);
      
      if (!integration) {
        return res.status(404).json({ success: false, error: 'Platform not connected' });
      }

      // Discover real devices from platform API
      const devices = [];
      
      if (platform === 'philips_hue') {
        // Real Philips Hue device discovery would require actual bridge connection
        // Only return devices if genuine API connection is established
        const bridgeIp = integration.bridgeIp;
        if (bridgeIp) {
          try {
            // Would make actual API call to Philips Hue bridge
            // const hueDevices = await discoverHueDevices(bridgeIp, integration.accessToken);
            // devices.push(...hueDevices);
          } catch (error) {
            console.error('Failed to discover Philips Hue devices:', error);
          }
        }
      }
      
      // Only store devices if they are real discoveries from authentic sources
      for (const device of devices) {
        await storage.addPlatformDevice({
          integrationId: integration.id,
          deviceId: null,
          platformDeviceId: device.platformDeviceId,
          deviceName: device.deviceName,
          deviceType: device.deviceType,
          capabilities: device.capabilities,
          state: device.state,
          isControllable: device.isControllable || false
        });
      }
      
      res.json({ success: true, devices, message: devices.length === 0 ? 'No devices found - requires authentic platform connection' : undefined });
    } catch (error) {
      console.error('Device discovery failed:', error);
      res.status(500).json({ success: false, error: 'Device discovery failed' });
    }
  });

  app.post('/api/platforms/:platform/devices/:deviceId/control', async (req, res) => {
    try {
      const { platform, deviceId } = req.params;
      const command = req.body;
      
      const integration = await storage.getPlatformIntegration(platform);
      if (!integration) {
        return res.status(404).json({ success: false, error: 'Platform not connected' });
      }

      const { smartHomePlatformManager } = await import('./smart-home-platforms');
      const success = await smartHomePlatformManager.controlDevice(
        platform, 
        deviceId, 
        command, 
        integration.accessToken,
        integration.bridgeIp || undefined
      );
      
      if (success) {
        // Update device state in storage
        await storage.updatePlatformDeviceState(deviceId, command);
        
        res.json({ 
          success: true, 
          message: `Device ${deviceId} controlled successfully`,
          command
        });
      } else {
        res.status(400).json({ 
          success: false, 
          error: 'Device control failed - check device status and command format' 
        });
      }
    } catch (error) {
      console.error('Device control failed:', error);
      res.status(500).json({ success: false, error: 'Device control failed' });
    }
  });

  app.get('/api/platforms/integrations', async (req, res) => {
    try {
      const integrations = await storage.getAllPlatformIntegrations();
      res.json({ success: true, integrations });
    } catch (error) {
      console.error('Failed to get integrations:', error);
      res.status(500).json({ success: false, error: 'Failed to get integrations' });
    }
  });

  app.delete('/api/platforms/:platform/disconnect', async (req, res) => {
    try {
      const { platform } = req.params;
      await storage.removePlatformIntegration(platform);
      res.json({ success: true, message: `${platform} disconnected successfully` });
    } catch (error) {
      console.error('Platform disconnect failed:', error);
      res.status(500).json({ success: false, error: 'Disconnect failed' });
    }
  });



  // System Health Monitoring
  app.get('/api/system/health', async (req, res) => {
    try {
      const devices = await storage.getDevices();
      const agentStatus = aiAgentBackend.getAgentStatus();
      const connectedAgents = cloudSyncTunnel.getConnectedAgents();
      
      // Calculate AI agents health
      const totalAgents = agentStatus.length;
      const activeAgents = agentStatus.filter(agent => agent.status === 'active').length;
      const aiAgentsStatus = activeAgents === totalAgents ? 'healthy' : 
                           activeAgents > 0 ? 'warning' : 'critical';

      // Calculate network scanning health
      const networkScanningActive = connectedAgents.length > 0;
      
      // Calculate data integrity score
      const dataIntegrityScore = devices.length > 0 ? 95 : 70;
      
      // Calculate cloud tunnel connectivity
      const cloudTunnelActive = connectedAgents.length > 0;
      
      // Overall system health
      const overallHealth = aiAgentsStatus === 'healthy' && networkScanningActive && cloudTunnelActive ? 'healthy' :
                           aiAgentsStatus === 'critical' || (!networkScanningActive && !cloudTunnelActive) ? 'critical' : 'warning';

      res.json({
        success: true,
        overallHealth,
        components: {
          aiAgents: {
            status: aiAgentsStatus,
            total: totalAgents,
            active: activeAgents,
            details: agentStatus
          },
          networkScanning: {
            status: networkScanningActive ? 'active' : 'inactive',
            connectedAgents: connectedAgents.length,
            details: connectedAgents
          },
          dataIntegrity: {
            status: dataIntegrityScore > 90 ? 'healthy' : dataIntegrityScore > 70 ? 'warning' : 'critical',
            score: dataIntegrityScore,
            devicesDetected: devices.length
          },
          cloudTunnel: {
            status: cloudTunnelActive ? 'connected' : 'disconnected',
            activeConnections: connectedAgents.length
          }
        },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('System health check failed:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to check system health",
        overallHealth: 'critical'
      });
    }
  });

  // Enhanced Device Telemetry Routes
  app.get('/api/telemetry/mdns-discovery', async (req: Request, res: Response) => {
    try {
      console.log('🔍 Starting mDNS device discovery...');
      const services = await enhancedDeviceTelemetry.discoverMDNSServices();
      
      res.json({
        success: true,
        services: services.map(service => ({
          name: service.name,
          type: service.type,
          port: service.port,
          host: service.host,
          addresses: service.addresses,
          txt: service.txt
        }))
      });
    } catch (error) {
      console.error('mDNS discovery failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to discover mDNS services',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/api/telemetry/ssdp-discovery', async (req: Request, res: Response) => {
    try {
      console.log('🔍 Starting SSDP device discovery...');
      const devices = await enhancedDeviceTelemetry.performEnhancedSSDPDiscovery();
      
      res.json({
        success: true,
        devices: devices.map(device => ({
          location: device.location,
          usn: device.usn,
          st: device.st,
          server: device.server,
          cacheControl: device.cacheControl,
          bootId: device.bootId,
          configId: device.configId
        }))
      });
    } catch (error) {
      console.error('SSDP discovery failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to discover SSDP devices',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/api/telemetry/upnp-description/:location', async (req: Request, res: Response) => {
    try {
      const { location } = req.params;
      const decodedLocation = decodeURIComponent(location);
      
      console.log(`🔍 Fetching UPnP description from: ${decodedLocation}`);
      const description = await enhancedDeviceTelemetry.fetchUPnPDescription(decodedLocation);
      
      if (!description) {
        return res.status(404).json({
          success: false,
          error: 'UPnP description not found or inaccessible'
        });
      }
      
      res.json({
        success: true,
        description
      });
    } catch (error) {
      console.error('UPnP description fetch failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch UPnP description',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/api/telemetry/device/:deviceId/latest', async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const telemetry = enhancedDeviceTelemetry.getLatestTelemetry(deviceId);
      
      if (!telemetry) {
        return res.status(404).json({
          success: false,
          error: 'No telemetry data found for device'
        });
      }
      
      res.json({
        success: true,
        telemetry
      });
    } catch (error) {
      console.error('Failed to get latest telemetry:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve telemetry data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/api/telemetry/device/:deviceId/history', async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const history = enhancedDeviceTelemetry.getTelemetryHistory(deviceId, limit);
      
      res.json({
        success: true,
        history,
        count: history.length
      });
    } catch (error) {
      console.error('Failed to get telemetry history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve telemetry history',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Device Type Classification and Analysis
  app.post('/api/devices/classify', async (req: Request, res: Response) => {
    try {
      const { devices: deviceList } = req.body;
      
      if (!Array.isArray(deviceList)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid device list provided'
        });
      }
      
      const classifiedDevices = deviceList.map(device => {
        const deviceName = device.name?.toLowerCase() || '';
        const vendor = device.vendor?.toLowerCase() || '';
        const hostname = device.hostname?.toLowerCase() || '';
        
        // Enhanced device type classification
        let deviceType = 'unknown';
        let confidence = 0.5;
        
        // Classification logic for direct WiFi devices
        const classificationRules = [
          { keywords: ['printer', 'hp', 'canon', 'epson', 'brother', 'xerox', 'lexmark'], type: 'printer', confidence: 0.9 },
          { keywords: ['xbox', 'playstation', 'nintendo', 'steam', 'switch', 'wii'], type: 'game_console', confidence: 0.95 },
          { keywords: ['samsung', 'lg', 'sony', 'tv', 'smart tv', 'bravia'], type: 'smart_tv', confidence: 0.9 },
          { keywords: ['router', 'gateway', 'access point', 'ubiquiti', 'netgear', 'linksys'], type: 'router', confidence: 0.95 },
          { keywords: ['macbook', 'imac', 'laptop', 'desktop', 'pc', 'workstation'], type: 'computer', confidence: 0.85 },
          { keywords: ['iphone', 'ipad', 'android', 'tablet', 'phone'], type: 'mobile_device', confidence: 0.8 },
          { keywords: ['synology', 'qnap', 'nas', 'storage'], type: 'nas_storage', confidence: 0.9 },
          { keywords: ['echo', 'alexa', 'google home', 'homepod', 'speaker'], type: 'smart_speaker', confidence: 0.9 },
          { keywords: ['ring', 'nest', 'camera', 'doorbell'], type: 'security_camera', confidence: 0.9 },
          { keywords: ['thermostat', 'nest', 'ecobee', 'honeywell'], type: 'thermostat', confidence: 0.95 }
        ];
        
        for (const rule of classificationRules) {
          const matchScore = rule.keywords.reduce((score, keyword) => {
            if (deviceName.includes(keyword) || vendor.includes(keyword) || hostname.includes(keyword)) {
              return score + 1;
            }
            return score;
          }, 0);
          
          if (matchScore > 0) {
            deviceType = rule.type;
            confidence = Math.min(rule.confidence * (matchScore / rule.keywords.length), 1.0);
            break;
          }
        }
        
        return {
          ...device,
          deviceType,
          confidence,
          classification: {
            original: device.deviceType || 'unknown',
            enhanced: deviceType,
            confidence,
            matchedKeywords: classificationRules.find(r => r.type === deviceType)?.keywords || []
          }
        };
      });
      
      res.json({
        success: true,
        devices: classifiedDevices,
        summary: {
          total: classifiedDevices.length,
          classified: classifiedDevices.filter(d => d.deviceType !== 'unknown').length,
          byType: classifiedDevices.reduce((acc, device) => {
            acc[device.deviceType] = (acc[device.deviceType] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        }
      });
    } catch (error) {
      console.error('Device classification failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to classify devices',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Direct WiFi Device Discovery Test Route
  app.get('/api/devices/discover-direct', async (req: Request, res: Response) => {
    try {
      console.log('🔍 Starting comprehensive direct WiFi device discovery...');
      
      // Perform mDNS discovery
      const mdnsServices = await enhancedDeviceTelemetry.discoverMDNSServices();
      console.log(`📡 Discovered ${mdnsServices.length} mDNS services`);
      
      // Perform SSDP discovery
      const ssdpDevices = await enhancedDeviceTelemetry.performEnhancedSSDPDiscovery();
      console.log(`📡 Discovered ${ssdpDevices.length} SSDP devices`);
      
      // Classify all discovered devices
      const allDiscovered = [
        ...mdnsServices.map(service => ({
          type: 'mDNS',
          name: service.name,
          host: service.host,
          addresses: service.addresses,
          serviceType: service.type,
          port: service.port
        })),
        ...ssdpDevices.map(device => ({
          type: 'SSDP',
          location: device.location,
          usn: device.usn,
          st: device.st,
          server: device.server
        }))
      ];
      
      res.json({
        success: true,
        discovery: {
          mdns: {
            count: mdnsServices.length,
            services: mdnsServices
          },
          ssdp: {
            count: ssdpDevices.length,
            devices: ssdpDevices
          },
          summary: {
            totalDiscovered: allDiscovered.length,
            byProtocol: {
              mDNS: mdnsServices.length,
              SSDP: ssdpDevices.length
            }
          }
        }
      });
    } catch (error) {
      console.error('Direct device discovery failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to discover direct WiFi devices',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Active Ping/Latency Probing API Endpoints
  
  // Measure ping distance to specific hosts
  app.post('/api/ping/measure', async (req: Request, res: Response) => {
    try {
      const { hosts, trials = 5 } = req.body;
      
      if (!hosts || !Array.isArray(hosts)) {
        return res.status(400).json({
          success: false,
          error: 'Hosts array is required'
        });
      }

      const measurements = await activePingProbing.measureMultipleHosts(hosts);
      
      res.json({
        success: true,
        measurements,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('[Active Ping] Measurement error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to measure ping distances',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Start calibration phase
  app.post('/api/ping/calibration/start', async (req: Request, res: Response) => {
    try {
      activePingProbing.startCalibration();
      
      res.json({
        success: true,
        message: 'Calibration phase started',
        timestamp: new Date()
      });
    } catch (error) {
      console.error('[Active Ping] Calibration start error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start calibration'
      });
    }
  });

  // Add calibration point
  app.post('/api/ping/calibration/point', async (req: Request, res: Response) => {
    try {
      const { x, y, csiFeatures, rttValues, pingDistances } = req.body;
      
      if (typeof x !== 'number' || typeof y !== 'number') {
        return res.status(400).json({
          success: false,
          error: 'Valid x and y coordinates are required'
        });
      }

      activePingProbing.addCalibrationPoint(
        x, y, 
        csiFeatures || [], 
        rttValues || [], 
        pingDistances || []
      );
      
      res.json({
        success: true,
        message: 'Calibration point added',
        position: { x, y },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('[Active Ping] Calibration point error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add calibration point'
      });
    }
  });

  // Complete calibration
  app.post('/api/ping/calibration/complete', async (req: Request, res: Response) => {
    try {
      const calibrationData = activePingProbing.completeCalibration();
      const stats = activePingProbing.getCalibrationStats();
      
      res.json({
        success: true,
        message: 'Calibration completed',
        calibrationData,
        stats,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('[Active Ping] Calibration complete error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to complete calibration'
      });
    }
  });

  // Start live probing
  app.post('/api/ping/probing/start', async (req: Request, res: Response) => {
    try {
      const { hosts, intervalMs = 30000 } = req.body;
      
      if (!hosts || !Array.isArray(hosts)) {
        return res.status(400).json({
          success: false,
          error: 'Hosts array is required'
        });
      }

      activePingProbing.startLiveProbing(hosts, intervalMs);
      
      res.json({
        success: true,
        message: 'Live probing started',
        hosts,
        intervalMs,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('[Active Ping] Live probing start error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start live probing'
      });
    }
  });

  // Stop live probing
  app.post('/api/ping/probing/stop', async (req: Request, res: Response) => {
    try {
      activePingProbing.stopLiveProbing();
      
      res.json({
        success: true,
        message: 'Live probing stopped',
        timestamp: new Date()
      });
    } catch (error) {
      console.error('[Active Ping] Live probing stop error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to stop live probing'
      });
    }
  });

  // Get ping configuration and status
  app.get('/api/ping/status', async (req: Request, res: Response) => {
    try {
      const configuration = activePingProbing.getConfiguration();
      const stats = activePingProbing.getCalibrationStats();
      
      res.json({
        success: true,
        configuration,
        calibrationStats: stats,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('[Active Ping] Status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get ping status'
      });
    }
  });

  // Process probe data from mobile devices
  app.post('/api/ping/probe', async (req: Request, res: Response) => {
    try {
      const probeData: ProbeData = {
        type: 'probe',
        rtt: req.body.rtt || {},
        ping: req.body.ping || {},
        timestamp: new Date(req.body.timestamp || Date.now()),
        location: req.body.location
      };

      const processed = activePingProbing.processProbeData(probeData);
      
      res.json({
        success: true,
        processed,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('[Active Ping] Probe data error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process probe data'
      });
    }
  });

  // Fuse location estimates
  app.post('/api/ping/location/fuse', async (req: Request, res: Response) => {
    try {
      const { csiLocation, rttLocation, pingLocation, weights } = req.body;
      
      if (!csiLocation || !rttLocation || !pingLocation) {
        return res.status(400).json({
          success: false,
          error: 'All location estimates (csi, rtt, ping) are required'
        });
      }

      const fusedLocation = activePingProbing.fuseLocationEstimates(
        csiLocation,
        rttLocation, 
        pingLocation,
        weights
      );
      
      res.json({
        success: true,
        fusedLocation,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('[Active Ping] Location fusion error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fuse location estimates'
      });
    }
  });

  return httpServer;
}