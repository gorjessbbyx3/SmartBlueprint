import { storage } from './storage';
import { mlAnalytics } from './ml-analytics';
import { Device, DeviceTelemetry, InsertDeviceTelemetry, InsertAnomaly, InsertPredictiveAlert } from '../shared/schema';
import { networkScanner } from './device-scanner';

export interface MonitoringAlert {
  id: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'device_offline' | 'signal_degradation' | 'network_anomaly' | 'performance_issue' | 'security_threat';
  deviceId?: number;
  message: string;
  details: string;
  recommendedAction: string;
  isResolved: boolean;
}

export interface EnvironmentMetrics {
  timestamp: Date;
  totalDevices: number;
  onlineDevices: number;
  averageSignalStrength: number;
  networkHealth: number;
  anomalyCount: number;
  criticalAlerts: number;
  environmentalFactors: {
    interferenceLevel: number;
    timeOfDay: string;
    networkLoad: number;
  };
}

export class ContinuousMonitoringService {
  private static instance: ContinuousMonitoringService;
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alertQueue: MonitoringAlert[] = [];
  private lastScanTime = new Date();
  private environmentHistory: EnvironmentMetrics[] = [];

  // Advanced monitoring parameters
  private readonly SCAN_INTERVAL = 30000; // 30 seconds for device scanning
  private readonly ANALYSIS_INTERVAL = 60000; // 1 minute for ML analysis
  private readonly TELEMETRY_INTERVAL = 15000; // 15 seconds for telemetry collection
  private readonly ALERT_COOLDOWN = 300000; // 5 minutes cooldown for same alert type

  private alertCooldowns = new Map<string, number>();
  private deviceBaselines = new Map<number, any>();

  static getInstance(): ContinuousMonitoringService {
    if (!this.instance) {
      this.instance = new ContinuousMonitoringService();
    }
    return this.instance;
  }

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('Monitoring service already running');
      return;
    }

    console.log('🔍 Starting 24/7 AI environment monitoring service...');
    this.isMonitoring = true;

    // Initialize device baselines
    await this.initializeDeviceBaselines();

    // Start continuous monitoring loops
    this.startDeviceScanning();
    this.startTelemetryCollection();
    this.startMLAnalysis();
    this.startEnvironmentAnalysis();

    console.log('✅ 24/7 AI monitoring service is now active');
  }

  async stopMonitoring(): Promise<void> {
    console.log('🛑 Stopping monitoring service...');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('✅ Monitoring service stopped');
  }

  private async initializeDeviceBaselines(): Promise<void> {
    console.log('📊 Initializing device performance baselines...');
    const devices = await storage.getDevices();

    for (const device of devices) {
      const telemetry = await storage.getDeviceTelemetry(device.id, 50);
      
      if (telemetry.length > 0) {
        const avgRSSI = telemetry.reduce((sum, t) => sum + t.rssi, 0) / telemetry.length;
        const rssiVariance = this.calculateVariance(telemetry.map(t => t.rssi));
        
        this.deviceBaselines.set(device.id, {
          baselineRSSI: avgRSSI,
          rssiVariance: rssiVariance,
          lastSeen: new Date(),
          consecutiveFailures: 0,
          healthScore: 1.0
        });
      }
    }

    console.log(`📈 Initialized baselines for ${devices.length} devices`);
  }

  private startDeviceScanning(): void {
    setInterval(async () => {
      if (!this.isMonitoring) return;

      try {
        console.log('🔄 Performing automated device scan...');
        const scanResult = await networkScanner.startScan();
        
        // Check for new devices
        const existingDevices = await storage.getDevices();
        const existingMacs = new Set(existingDevices.map(d => d.macAddress));

        for (const scannedDevice of scanResult) {
          if (!existingMacs.has(scannedDevice.macAddress)) {
            // New device detected
            await this.handleNewDeviceDetected(scannedDevice);
          } else {
            // Update existing device status
            await this.updateDeviceStatus(scannedDevice);
          }
        }

        // Check for devices that went offline
        await this.checkOfflineDevices(scanResult);
        
        this.lastScanTime = new Date();
      } catch (error) {
        console.error('Error during device scanning:', error);
        await this.createAlert({
          severity: 'medium',
          type: 'network_anomaly',
          message: 'Device scanning failed',
          details: `Error during automated device scan: ${error}`,
          recommendedAction: 'Check network connectivity and scanner permissions'
        });
      }
    }, this.SCAN_INTERVAL);
  }

  private startTelemetryCollection(): void {
    setInterval(async () => {
      if (!this.isMonitoring) return;

      try {
        const devices = await storage.getDevices();
        
        for (const device of devices) {
          // Simulate telemetry collection for real devices
          await this.collectDeviceTelemetry(device);
        }
      } catch (error) {
        console.error('Error during telemetry collection:', error);
      }
    }, this.TELEMETRY_INTERVAL);
  }

  private startMLAnalysis(): void {
    setInterval(async () => {
      if (!this.isMonitoring) return;

      try {
        console.log('🧠 Running ML anomaly detection analysis...');
        const devices = await storage.getDevices();
        
        // Perform ML-based anomaly detection
        const anomalies = await mlAnalytics.detectAnomalies(devices);
        
        for (const anomaly of anomalies) {
          await this.handleMLAnomaly(anomaly);
        }

        // Perform predictive maintenance analysis
        const maintenanceAlerts = await mlAnalytics.performPredictiveMaintenance(devices);
        
        for (const alert of maintenanceAlerts) {
          await this.handlePredictiveAlert(alert);
        }

        console.log(`🔍 ML analysis complete: ${anomalies.length} anomalies, ${maintenanceAlerts.length} maintenance alerts`);
      } catch (error) {
        console.error('Error during ML analysis:', error);
      }
    }, this.ANALYSIS_INTERVAL);
  }

  private startEnvironmentAnalysis(): void {
    setInterval(async () => {
      if (!this.isMonitoring) return;

      try {
        const metrics = await this.calculateEnvironmentMetrics();
        this.environmentHistory.push(metrics);

        // Keep only last 24 hours of data
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        this.environmentHistory = this.environmentHistory.filter(m => m.timestamp > oneDayAgo);

        // Analyze environmental trends
        await this.analyzeEnvironmentalTrends(metrics);
      } catch (error) {
        console.error('Error during environment analysis:', error);
      }
    }, this.ANALYSIS_INTERVAL);
  }

  private async collectDeviceTelemetry(device: Device): Promise<void> {
    try {
      // Simulate realistic telemetry data based on device characteristics
      const baseline = this.deviceBaselines.get(device.id);
      const currentTime = new Date();
      
      // Generate realistic RSSI with environmental factors
      const timeVariation = Math.sin((currentTime.getHours() / 24) * 2 * Math.PI) * 3;
      const randomNoise = (Math.random() - 0.5) * 4;
      const baseRSSI = baseline?.baselineRSSI || device.rssi;
      const simulatedRSSI = baseRSSI + timeVariation + randomNoise;

      const telemetryData: InsertDeviceTelemetry = {
        deviceId: device.id,
        rssi: simulatedRSSI,
        signalQuality: Math.max(0, Math.min(100, 70 + (simulatedRSSI + 50) / 2)),
        packetLoss: Math.max(0, Math.random() * 5),
        latency: 20 + Math.random() * 30,
        temperature: 20 + Math.random() * 15,
        batteryLevel: device.deviceType.includes('battery') ? 50 + Math.random() * 50 : null
      };

      await storage.addDeviceTelemetry(telemetryData);

      // Update device RSSI in real-time
      await storage.updateDeviceRSSI(device.macAddress, simulatedRSSI);

      // Check for immediate anomalies
      await this.checkTelemetryAnomalies(device, telemetryData);

    } catch (error) {
      console.error(`Error collecting telemetry for device ${device.id}:`, error);
    }
  }

  private async checkTelemetryAnomalies(device: Device, telemetry: InsertDeviceTelemetry): Promise<void> {
    const baseline = this.deviceBaselines.get(device.id);
    if (!baseline) return;

    // Check for significant RSSI drops
    const rssiDrop = baseline.baselineRSSI - telemetry.rssi;
    if (rssiDrop > 15) {
      await this.createAlert({
        severity: rssiDrop > 25 ? 'high' : 'medium',
        type: 'signal_degradation',
        deviceId: device.id,
        message: `Significant signal drop detected on ${device.name}`,
        details: `RSSI dropped by ${rssiDrop.toFixed(1)}dBm from baseline`,
        recommendedAction: 'Check device position and nearby interference sources'
      });
    }

    // Check for high packet loss
    if (telemetry.packetLoss && telemetry.packetLoss > 10) {
      await this.createAlert({
        severity: telemetry.packetLoss > 20 ? 'high' : 'medium',
        type: 'network_anomaly',
        deviceId: device.id,
        message: `High packet loss detected on ${device.name}`,
        details: `Packet loss: ${telemetry.packetLoss.toFixed(1)}%`,
        recommendedAction: 'Check network congestion and device connectivity'
      });
    }

    // Update device health score
    baseline.healthScore = this.calculateDeviceHealthScore(telemetry, baseline);
  }

  private calculateDeviceHealthScore(telemetry: InsertDeviceTelemetry, baseline: any): number {
    let score = 1.0;

    // RSSI health factor
    const rssiDiff = Math.abs(telemetry.rssi - baseline.baselineRSSI);
    score *= Math.max(0.1, 1 - (rssiDiff / 30));

    // Packet loss factor
    if (telemetry.packetLoss) {
      score *= Math.max(0.1, 1 - (telemetry.packetLoss / 20));
    }

    // Signal quality factor
    if (telemetry.signalQuality) {
      score *= telemetry.signalQuality / 100;
    }

    return Math.max(0.1, Math.min(1.0, score));
  }

  private async handleNewDeviceDetected(scannedDevice: any): Promise<void> {
    console.log(`🆕 New device detected: ${scannedDevice.name} (${scannedDevice.macAddress})`);
    
    // Only alert for truly new devices, not repeated detections
    const alertKey = `new-device-${scannedDevice.macAddress}`;
    const now = Date.now();
    const lastAlert = this.alertCooldowns.get(alertKey) || 0;

    // 24 hour cooldown for new device alerts to prevent spam
    if (now - lastAlert < 86400000) {
      return;
    }

    await this.createAlert({
      severity: 'low',
      type: 'network_anomaly',
      message: `New device joined network: ${scannedDevice.name}`,
      details: `Device: ${scannedDevice.name} (${scannedDevice.macAddress}), Type: ${scannedDevice.deviceType}`,
      recommendedAction: 'Verify this is an authorized device and configure if needed'
    });

    this.alertCooldowns.set(alertKey, now);
  }

  private async updateDeviceStatus(scannedDevice: any): Promise<void> {
    // Update device RSSI and online status
    await storage.updateDeviceRSSI(scannedDevice.macAddress, scannedDevice.rssi);
  }

  private async checkOfflineDevices(currentScan: any[]): Promise<void> {
    const devices = await storage.getDevices();
    const scannedMacs = new Set(currentScan.map(d => d.macAddress));

    for (const device of devices) {
      const baseline = this.deviceBaselines.get(device.id);
      if (!baseline) continue;

      if (!scannedMacs.has(device.macAddress)) {
        baseline.consecutiveFailures = (baseline.consecutiveFailures || 0) + 1;

        // Alert after 3 consecutive scan failures (1.5 minutes)
        if (baseline.consecutiveFailures === 3) {
          await this.createAlert({
            severity: 'high',
            type: 'device_offline',
            deviceId: device.id,
            message: `Device went offline: ${device.name}`,
            details: `Device ${device.name} has been offline for ${baseline.consecutiveFailures * (this.SCAN_INTERVAL / 1000)} seconds`,
            recommendedAction: 'Check device power and network connectivity'
          });
        }
      } else {
        // Device is back online
        if (baseline.consecutiveFailures > 0) {
          baseline.consecutiveFailures = 0;
          baseline.lastSeen = new Date();
        }
      }
    }
  }

  private async handleMLAnomaly(anomaly: any): Promise<void> {
    const alertKey = `${anomaly.deviceId}-${anomaly.anomalyType}`;
    const now = Date.now();
    const lastAlert = this.alertCooldowns.get(alertKey) || 0;

    // Respect cooldown period
    if (now - lastAlert < this.ALERT_COOLDOWN) {
      return;
    }

    await this.createAlert({
      severity: anomaly.severity,
      type: 'network_anomaly',
      deviceId: anomaly.deviceId,
      message: `ML anomaly detected: ${anomaly.description}`,
      details: `Confidence: ${(anomaly.confidence * 100).toFixed(1)}%, Type: ${anomaly.anomalyType}`,
      recommendedAction: anomaly.recommendedAction || 'Investigate device behavior and network conditions'
    });

    // Store anomaly in database
    await storage.createAnomaly({
      deviceId: anomaly.deviceId,
      anomalyType: anomaly.anomalyType,
      severity: anomaly.severity,
      description: anomaly.description,
      confidence: anomaly.confidence
    });

    this.alertCooldowns.set(alertKey, now);
  }

  private async handlePredictiveAlert(alert: any): Promise<void> {
    if (alert.failureProbability > 0.7) {
      await this.createAlert({
        severity: alert.failureProbability > 0.85 ? 'critical' : 'high',
        type: 'performance_issue',
        deviceId: alert.deviceId,
        message: `Predictive maintenance alert: Device failure likely`,
        details: `Failure probability: ${(alert.failureProbability * 100).toFixed(1)}%, Estimated time to failure: ${alert.timeToFailure} days`,
        recommendedAction: alert.maintenanceRecommendation
      });

      // Store predictive alert
      await storage.createPredictiveAlert({
        deviceId: alert.deviceId,
        alertType: 'failure_prediction',
        severity: alert.failureProbability > 0.85 ? 'critical' : 'high',
        prediction: `${(alert.failureProbability * 100).toFixed(1)}% failure probability in ${alert.timeToFailure} days`,
        probabilityScore: alert.failureProbability,
        recommendedAction: alert.maintenanceRecommendation
      });
    }
  }

  private async calculateEnvironmentMetrics(): Promise<EnvironmentMetrics> {
    const devices = await storage.getDevices();
    const onlineDevices = devices.length; // All devices in our system are considered reachable
    const totalRSSI = devices.reduce((sum, d) => sum + d.rssi, 0);
    const avgSignalStrength = devices.length > 0 ? totalRSSI / devices.length : 0;

    const anomalies = await storage.getAnomalies();
    const unresolvedAnomalies = anomalies.filter(a => !a.isResolved);
    const criticalAlerts = this.alertQueue.filter(a => a.severity === 'critical' && !a.isResolved);

    const currentHour = new Date().getHours();
    const timeOfDay = currentHour < 6 ? 'night' : 
                     currentHour < 12 ? 'morning' : 
                     currentHour < 18 ? 'afternoon' : 'evening';

    return {
      timestamp: new Date(),
      totalDevices: devices.length,
      onlineDevices: onlineDevices,
      averageSignalStrength: avgSignalStrength,
      networkHealth: this.calculateNetworkHealth(devices, unresolvedAnomalies),
      anomalyCount: unresolvedAnomalies.length,
      criticalAlerts: criticalAlerts.length,
      environmentalFactors: {
        interferenceLevel: this.calculateInterferenceLevel(avgSignalStrength),
        timeOfDay: timeOfDay,
        networkLoad: Math.random() * 100 // Simulated network load
      }
    };
  }

  private calculateNetworkHealth(devices: Device[], anomalies: any[]): number {
    if (devices.length === 0) return 0;

    const avgHealthScore = Array.from(this.deviceBaselines.values())
      .reduce((sum, baseline) => sum + (baseline.healthScore || 1), 0) / devices.length;

    const anomalyPenalty = Math.min(0.5, anomalies.length * 0.1);
    
    return Math.max(0, Math.min(100, (avgHealthScore - anomalyPenalty) * 100));
  }

  private calculateInterferenceLevel(avgSignalStrength: number): number {
    // Higher interference when signal strength is unexpectedly low
    const expectedSignal = -45; // Good signal strength baseline
    const deviation = Math.abs(avgSignalStrength - expectedSignal);
    return Math.min(100, deviation * 2);
  }

  private async analyzeEnvironmentalTrends(currentMetrics: EnvironmentMetrics): Promise<void> {
    if (this.environmentHistory.length < 10) return;

    const recentMetrics = this.environmentHistory.slice(-10);
    
    // Check for declining network health trend
    const healthTrend = this.calculateTrend(recentMetrics.map(m => m.networkHealth));
    if (healthTrend < -5) {
      await this.createAlert({
        severity: 'medium',
        type: 'performance_issue',
        message: 'Network health declining trend detected',
        details: `Network health has been declining over the last ${recentMetrics.length} measurements`,
        recommendedAction: 'Review network configuration and check for interference sources'
      });
    }

    // Check for increasing anomaly trend
    const anomalyTrend = this.calculateTrend(recentMetrics.map(m => m.anomalyCount));
    if (anomalyTrend > 2) {
      await this.createAlert({
        severity: 'medium',
        type: 'network_anomaly',
        message: 'Increasing anomaly trend detected',
        details: `Anomaly count has been increasing over recent measurements`,
        recommendedAction: 'Investigate recent network changes and device behavior'
      });
    }
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const x = Array.from({length: n}, (_, i) => i);
    const y = values;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  private async createAlert(alertData: Omit<MonitoringAlert, 'id' | 'timestamp' | 'isResolved'>): Promise<void> {
    const alert: MonitoringAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      isResolved: false,
      ...alertData
    };

    this.alertQueue.push(alert);
    
    // Keep only last 1000 alerts in memory
    if (this.alertQueue.length > 1000) {
      this.alertQueue = this.alertQueue.slice(-1000);
    }

    console.log(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
    console.log(`   Details: ${alert.details}`);
    console.log(`   Action: ${alert.recommendedAction}`);

    // Broadcast alert via WebSocket if available
    this.broadcastAlert(alert);
  }

  private broadcastAlert(alert: MonitoringAlert): void {
    // This will be integrated with the WebSocket server
    console.log(`📡 Broadcasting alert: ${alert.message}`);
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return variance;
  }

  // Public methods for external access
  getActiveAlerts(): MonitoringAlert[] {
    return this.alertQueue.filter(alert => !alert.isResolved);
  }

  getEnvironmentMetrics(): EnvironmentMetrics | null {
    return this.environmentHistory.length > 0 ? 
      this.environmentHistory[this.environmentHistory.length - 1] : null;
  }

  getEnvironmentHistory(hours: number = 24): EnvironmentMetrics[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.environmentHistory.filter(m => m.timestamp > cutoff);
  }

  async resolveAlert(alertId: string): Promise<boolean> {
    const alert = this.alertQueue.find(a => a.id === alertId);
    if (alert) {
      alert.isResolved = true;
      return true;
    }
    return false;
  }

  isRunning(): boolean {
    return this.isMonitoring;
  }
}

export const monitoringService = ContinuousMonitoringService.getInstance();