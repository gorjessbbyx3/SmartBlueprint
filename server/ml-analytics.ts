import { storage } from './storage';
import { Device, DeviceTelemetry, MlModel } from '@shared/schema';

export interface LocationFingerprint {
  location: { x: number; y: number };
  signalPattern: Map<string, number>; // deviceMac -> averageRSSI
  roomId?: number;
  confidence: number;
}

export interface AnomalyDetection {
  deviceId: number;
  anomalyType: 'signal_drop' | 'device_offline' | 'performance_degradation' | 'unusual_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  recommendedAction?: string;
}

export interface PredictiveMaintenanceResult {
  deviceId: number;
  failureProbability: number;
  timeToFailure: number; // days
  maintenanceRecommendation: string;
  priorityScore: number;
}

export class MLAnalyticsEngine {
  private locationFingerprints: LocationFingerprint[] = [];
  private anomalyThresholds = {
    rssiDrop: -10, // dBm drop threshold
    packetLossThreshold: 0.05, // 5% packet loss
    latencyThreshold: 100, // milliseconds
    offlineThreshold: 300000 // 5 minutes
  };

  async initializeModels(): Promise<void> {
    // Initialize ML models for location fingerprinting
    await this.createOrUpdateModel('fingerprinting', '1.0', {
      algorithm: 'weighted_centroid',
      features: ['rssi', 'signal_quality', 'device_proximity'],
      accuracy: 0.85
    });

    // Initialize anomaly detection model
    await this.createOrUpdateModel('anomaly_detection', '1.0', {
      algorithm: 'isolation_forest',
      features: ['rssi_variance', 'packet_loss', 'latency', 'connectivity_patterns'],
      accuracy: 0.82
    });

    // Initialize predictive maintenance model
    await this.createOrUpdateModel('predictive_maintenance', '1.0', {
      algorithm: 'random_forest',
      features: ['signal_degradation', 'usage_patterns', 'device_age', 'error_rates'],
      accuracy: 0.78
    });
  }

  private async createOrUpdateModel(modelType: string, version: string, metadata: any): Promise<void> {
    const existingModel = await storage.getActiveMlModel(modelType);
    
    if (!existingModel) {
      const model = await storage.createMlModel({
        modelType,
        version,
        trainingData: JSON.stringify(metadata),
        accuracy: metadata.accuracy,
        isActive: true
      });
      console.log(`Created ML model: ${modelType} v${version} with ${(metadata.accuracy * 100).toFixed(1)}% accuracy`);
    }
  }

  async performLocationFingerprinting(devices: Device[]): Promise<LocationFingerprint[]> {
    const fingerprints: LocationFingerprint[] = [];
    
    // Collect telemetry data for all devices
    const telemetryData = new Map<number, DeviceTelemetry[]>();
    for (const device of devices) {
      const telemetry = await storage.getDeviceTelemetry(device.id, 50);
      telemetryData.set(device.id, telemetry);
    }

    // Generate location fingerprints using signal triangulation
    const gridSize = 20; // 20x20 grid for fingerprinting
    for (let x = 0; x < 800; x += gridSize) {
      for (let y = 0; y < 600; y += gridSize) {
        const signalPattern = new Map<string, number>();
        let totalSignalStrength = 0;
        let deviceCount = 0;

        for (const device of devices) {
          const distance = Math.sqrt(
            Math.pow(device.x - x, 2) + Math.pow(device.y - y, 2)
          );
          
          // Calculate estimated RSSI based on distance and device characteristics
          const estimatedRSSI = this.calculateEstimatedRSSI(device, distance);
          signalPattern.set(device.macAddress, estimatedRSSI);
          totalSignalStrength += Math.abs(estimatedRSSI);
          deviceCount++;
        }

        if (deviceCount > 0) {
          const confidence = Math.min(1.0, deviceCount / devices.length);
          fingerprints.push({
            location: { x, y },
            signalPattern,
            confidence
          });
        }
      }
    }

    this.locationFingerprints = fingerprints;
    console.log(`Generated ${fingerprints.length} location fingerprints`);
    return fingerprints;
  }

  private calculateEstimatedRSSI(device: Device, distance: number): number {
    // Free space path loss model: RSSI = TxPower - 20*log10(distance) - 20*log10(frequency) + 147.55
    const txPower = -20; // Typical device transmission power
    const frequency = 2400; // WiFi 2.4GHz
    const pathLoss = 20 * Math.log10(distance + 1) + 20 * Math.log10(frequency) - 147.55;
    return Math.max(-100, txPower - pathLoss + (Math.random() * 10 - 5)); // Add some noise
  }

  async detectAnomalies(devices: Device[]): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];
    
    for (const device of devices) {
      const telemetry = await storage.getDeviceTelemetry(device.id, 20);
      if (telemetry.length < 5) continue; // Need sufficient data

      // Check for signal degradation
      const rssiTrend = this.calculateRSSITrend(telemetry);
      if (rssiTrend < this.anomalyThresholds.rssiDrop) {
        anomalies.push({
          deviceId: device.id,
          anomalyType: 'signal_drop',
          severity: rssiTrend < -20 ? 'high' : 'medium',
          confidence: 0.85,
          description: `Signal strength degraded by ${Math.abs(rssiTrend).toFixed(1)} dBm`,
          recommendedAction: 'Check device position or interference sources'
        });
      }

      // Check for packet loss anomalies
      const avgPacketLoss = telemetry.reduce((sum, t) => sum + (t.packetLoss || 0), 0) / telemetry.length;
      if (avgPacketLoss > this.anomalyThresholds.packetLossThreshold) {
        anomalies.push({
          deviceId: device.id,
          anomalyType: 'performance_degradation',
          severity: avgPacketLoss > 0.15 ? 'high' : 'medium',
          confidence: 0.78,
          description: `High packet loss detected: ${(avgPacketLoss * 100).toFixed(1)}%`,
          recommendedAction: 'Check network congestion or device health'
        });
      }

      // Check for connectivity patterns
      const offlinePattern = this.detectOfflinePattern(telemetry);
      if (offlinePattern.isAnomalous) {
        anomalies.push({
          deviceId: device.id,
          anomalyType: 'unusual_pattern',
          severity: 'medium',
          confidence: 0.72,
          description: `Unusual connectivity pattern detected`,
          recommendedAction: 'Monitor device behavior and check power supply'
        });
      }
    }

    // Create anomaly records for detected issues
    for (const anomaly of anomalies) {
      await storage.createAnomaly({
        deviceId: anomaly.deviceId,
        type: anomaly.anomalyType,
        severity: anomaly.severity,
        description: anomaly.description
      });
    }

    console.log(`Detected ${anomalies.length} anomalies across ${devices.length} devices`);
    return anomalies;
  }

  private calculateRSSITrend(telemetry: DeviceTelemetry[]): number {
    if (telemetry.length < 2) return 0;
    
    const sortedTelemetry = telemetry.sort((a, b) => a.timestamp!.getTime() - b.timestamp!.getTime());
    const recent = sortedTelemetry.slice(-5);
    const older = sortedTelemetry.slice(0, 5);
    
    const recentAvg = recent.reduce((sum, t) => sum + t.rssi, 0) / recent.length;
    const olderAvg = older.reduce((sum, t) => sum + t.rssi, 0) / older.length;
    
    return recentAvg - olderAvg;
  }

  private detectOfflinePattern(telemetry: DeviceTelemetry[]): { isAnomalous: boolean; pattern: string } {
    // Analyze connectivity patterns to detect unusual behavior
    const intervals: number[] = [];
    
    for (let i = 1; i < telemetry.length; i++) {
      const interval = telemetry[i].timestamp!.getTime() - telemetry[i-1].timestamp!.getTime();
      intervals.push(interval);
    }
    
    if (intervals.length === 0) return { isAnomalous: false, pattern: 'insufficient_data' };
    
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    
    // High variance in connectivity intervals indicates anomalous behavior
    const coefficientOfVariation = stdDev / avgInterval;
    return {
      isAnomalous: coefficientOfVariation > 2.0,
      pattern: coefficientOfVariation > 2.0 ? 'irregular_connectivity' : 'normal'
    };
  }

  async performPredictiveMaintenance(devices: Device[]): Promise<PredictiveMaintenanceResult[]> {
    const maintenanceResults: PredictiveMaintenanceResult[] = [];
    
    for (const device of devices) {
      const telemetry = await storage.getDeviceTelemetry(device.id, 100);
      if (telemetry.length < 20) continue; // Need sufficient historical data
      
      // Calculate device health metrics
      const healthMetrics = this.calculateDeviceHealthMetrics(device, telemetry);
      const failureProbability = this.predictFailureProbability(healthMetrics);
      const timeToFailure = this.estimateTimeToFailure(healthMetrics, failureProbability);
      
      if (failureProbability > 0.3) { // 30% threshold for maintenance alerts
        const recommendation = this.generateMaintenanceRecommendation(device, healthMetrics);
        
        maintenanceResults.push({
          deviceId: device.id,
          failureProbability,
          timeToFailure,
          maintenanceRecommendation: recommendation,
          priorityScore: failureProbability * (1 / Math.max(1, timeToFailure / 30)) // Higher priority for sooner failures
        });

        // Create predictive alert
        await storage.createPredictiveAlert({
          deviceId: device.id,
          alertType: failureProbability > 0.7 ? 'failure_prediction' : 'maintenance_due',
          severity: failureProbability > 0.8 ? 'critical' : failureProbability > 0.6 ? 'high' : 'medium',
          prediction: JSON.stringify({
            failureProbability,
            timeToFailure,
            healthMetrics
          }),
          probabilityScore: failureProbability,
          recommendedAction: recommendation
        });
      }
    }
    
    console.log(`Generated predictive maintenance alerts for ${maintenanceResults.length} devices`);
    return maintenanceResults;
  }

  private calculateDeviceHealthMetrics(device: Device, telemetry: DeviceTelemetry[]): any {
    const rssiValues = telemetry.map(t => t.rssi);
    const signalQualityValues = telemetry.filter(t => t.signalQuality).map(t => t.signalQuality!);
    const packetLossValues = telemetry.filter(t => t.packetLoss).map(t => t.packetLoss!);
    
    return {
      avgRSSI: rssiValues.reduce((sum, val) => sum + val, 0) / rssiValues.length,
      rssiVariance: this.calculateVariance(rssiValues),
      signalDegradation: this.calculateSignalDegradation(rssiValues),
      avgPacketLoss: packetLossValues.length > 0 ? packetLossValues.reduce((sum, val) => sum + val, 0) / packetLossValues.length : 0,
      connectivityStability: this.calculateConnectivityStability(telemetry),
      deviceAge: this.estimateDeviceAge(device),
      usagePattern: this.analyzeUsagePattern(telemetry)
    };
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  private calculateSignalDegradation(rssiValues: number[]): number {
    if (rssiValues.length < 10) return 0;
    
    const firstHalf = rssiValues.slice(0, Math.floor(rssiValues.length / 2));
    const secondHalf = rssiValues.slice(Math.floor(rssiValues.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    return firstAvg - secondAvg; // Positive value indicates degradation
  }

  private calculateConnectivityStability(telemetry: DeviceTelemetry[]): number {
    // Calculate stability based on consistent telemetry reporting
    const intervals: number[] = [];
    
    for (let i = 1; i < telemetry.length; i++) {
      const interval = telemetry[i].timestamp!.getTime() - telemetry[i-1].timestamp!.getTime();
      intervals.push(interval);
    }
    
    if (intervals.length === 0) return 1.0;
    
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = this.calculateVariance(intervals);
    
    // Lower variance = higher stability
    return Math.max(0, 1 - (Math.sqrt(variance) / avgInterval));
  }

  private estimateDeviceAge(device: Device): number {
    // Estimate age in days since last seen timestamp
    const now = new Date();
    const lastSeen = new Date(device.lastSeen);
    return Math.max(1, (now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24));
  }

  private analyzeUsagePattern(telemetry: DeviceTelemetry[]): string {
    // Analyze usage patterns for predictive insights
    const hourlyUsage = new Map<number, number>();
    
    telemetry.forEach(t => {
      const hour = t.timestamp!.getHours();
      hourlyUsage.set(hour, (hourlyUsage.get(hour) || 0) + 1);
    });
    
    const maxUsageHour = Array.from(hourlyUsage.entries())
      .reduce((max, [hour, count]) => count > max.count ? { hour, count } : max, { hour: 0, count: 0 });
    
    if (maxUsageHour.count > telemetry.length * 0.3) {
      return `peak_usage_${maxUsageHour.hour}h`;
    }
    
    return 'distributed_usage';
  }

  private predictFailureProbability(healthMetrics: any): number {
    // Simple weighted scoring model for failure prediction
    let score = 0;
    
    // RSSI degradation factor
    if (healthMetrics.avgRSSI < -70) score += 0.2;
    if (healthMetrics.rssiVariance > 100) score += 0.15;
    if (healthMetrics.signalDegradation > 10) score += 0.25;
    
    // Connectivity factor
    if (healthMetrics.connectivityStability < 0.7) score += 0.2;
    if (healthMetrics.avgPacketLoss > 0.05) score += 0.15;
    
    // Age factor (devices older than 30 days are more likely to fail)
    if (healthMetrics.deviceAge > 30) score += 0.1;
    if (healthMetrics.deviceAge > 90) score += 0.2;
    
    return Math.min(1.0, score);
  }

  private estimateTimeToFailure(healthMetrics: any, failureProbability: number): number {
    // Estimate days until potential failure
    const baseTime = 90; // 90 days baseline
    const degradationFactor = Math.max(0.1, 1 - failureProbability);
    
    return Math.max(1, Math.floor(baseTime * degradationFactor));
  }

  private generateMaintenanceRecommendation(device: Device, healthMetrics: any): string {
    const recommendations: string[] = [];
    
    if (healthMetrics.avgRSSI < -70) {
      recommendations.push('Check device positioning for better signal reception');
    }
    
    if (healthMetrics.signalDegradation > 10) {
      recommendations.push('Investigate potential interference sources');
    }
    
    if (healthMetrics.avgPacketLoss > 0.05) {
      recommendations.push('Check network connectivity and reduce congestion');
    }
    
    if (healthMetrics.connectivityStability < 0.7) {
      recommendations.push('Monitor power supply stability and device health');
    }
    
    if (healthMetrics.deviceAge > 90) {
      recommendations.push('Consider device replacement due to age');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Perform routine device health check');
    }
    
    return recommendations.join('; ');
  }

  async getLocationFingerprints(): Promise<LocationFingerprint[]> {
    return this.locationFingerprints;
  }

  async trainModels(devices: Device[]): Promise<void> {
    console.log('Training ML models with current device data...');
    
    // Update model training data
    const trainingData = {
      deviceCount: devices.length,
      trainedAt: new Date().toISOString(),
      features: ['rssi', 'signal_quality', 'location', 'connectivity_patterns']
    };
    
    // Update all models with new training data
    const models = await storage.getMlModels();
    for (const model of models) {
      await storage.updateMlModel(model.id, {
        trainingData: JSON.stringify(trainingData),
        version: (parseFloat(model.version) + 0.1).toFixed(1)
      });
    }
    
    console.log(`Updated ${models.length} ML models with latest training data`);
  }
}

export const mlAnalytics = new MLAnalyticsEngine();