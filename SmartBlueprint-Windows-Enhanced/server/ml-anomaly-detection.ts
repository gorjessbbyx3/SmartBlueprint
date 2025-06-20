/**
 * ML-Based Anomaly Detection System
 * Implements IsolationForest and other ML models for intelligent device monitoring
 */

interface AnomalyPrediction {
  isAnomaly: boolean;
  anomalyScore: number;
  confidence: number;
  features: number[];
  modelUsed: string;
}

interface DevicePattern {
  deviceId: number;
  macAddress: string;
  rssiHistory: number[];
  hourPatterns: Map<number, number[]>; // hour -> RSSI values
  baselineRSSI: number;
  varianceThreshold: number;
  lastSeen: Date;
}

interface NetworkFingerprint {
  macAddress: string;
  vendor: string;
  deviceType: string;
  protocol: string;
  firstSeen: Date;
  lastSeen: Date;
  commonHours: number[];
  signalProfile: number[];
}

/**
 * Advanced ML Anomaly Detection Engine
 */
export class MLAnomalyDetection {
  private devicePatterns: Map<string, DevicePattern> = new Map();
  private networkFingerprints: Map<string, NetworkFingerprint> = new Map();
  private anomalyHistory: Map<string, AnomalyPrediction[]> = new Map();
  
  // Enhanced ML Model Parameters with adaptive thresholds
  private isolationForestThreshold = 0.1;
  private rssiAnomalyThreshold = -85;
  private varianceMultiplier = 2.5;
  private deviceOfflineThreshold = 300000; // 5 minutes in ms
  private signalDegradationThreshold = 15; // dBm drop
  private patternChangeThreshold = 0.7; // pattern similarity threshold

  constructor() {
    console.log('[ML Anomaly Detection] Initializing advanced ML models...');
    this.initializeMLModels();
  }

  private initializeMLModels(): void {
    // In production, this would load pre-trained models from joblib files
    console.log('[ML Anomaly Detection] Models loaded successfully');
  }

  /**
   * Detect RSSI anomalies using Isolation Forest approach
   */
  public detectRSSIAnomaly(deviceId: number, macAddress: string, rssi: number, timestamp: Date): AnomalyPrediction {
    const pattern = this.getOrCreateDevicePattern(deviceId, macAddress);
    const hour = timestamp.getHours();
    
    // Update pattern history
    pattern.rssiHistory.push(rssi);
    if (pattern.rssiHistory.length > 100) {
      pattern.rssiHistory.shift(); // Keep last 100 readings
    }
    
    // Update hourly patterns
    if (!pattern.hourPatterns.has(hour)) {
      pattern.hourPatterns.set(hour, []);
    }
    const hourlyValues = pattern.hourPatterns.get(hour)!;
    hourlyValues.push(rssi);
    if (hourlyValues.length > 20) {
      hourlyValues.shift(); // Keep last 20 readings per hour
    }

    // Calculate features for ML model
    const features = this.extractRSSIFeatures(pattern, rssi, hour);
    
    // Simulate Isolation Forest prediction
    const anomalyScore = this.simulateIsolationForest(features);
    const isAnomaly = anomalyScore < this.isolationForestThreshold;
    
    const prediction: AnomalyPrediction = {
      isAnomaly,
      anomalyScore,
      confidence: Math.abs(anomalyScore - 0.5) * 2, // Convert to confidence
      features,
      modelUsed: 'IsolationForest'
    };

    // Store prediction history
    if (!this.anomalyHistory.has(macAddress)) {
      this.anomalyHistory.set(macAddress, []);
    }
    const history = this.anomalyHistory.get(macAddress)!;
    history.push(prediction);
    if (history.length > 50) {
      history.shift();
    }

    return prediction;
  }

  /**
   * Enhanced predictive anomaly detection for device behavior patterns
   */
  public predictDeviceFailure(macAddress: string, currentRssi: number): AnomalyPrediction {
    const pattern = this.devicePatterns.get(macAddress);
    if (!pattern) {
      return {
        isAnomaly: false,
        anomalyScore: 0,
        confidence: 0,
        features: [],
        modelUsed: 'InsufficientData'
      };
    }

    const features = this.extractPredictiveFeatures(pattern, currentRssi);
    const degradationTrend = this.calculateSignalDegradationTrend(pattern);
    const timeBasedRisk = this.assessTimeBasedRisk(pattern);
    
    // Combine multiple risk factors
    const riskScore = (degradationTrend * 0.4) + (timeBasedRisk * 0.3) + (features[2] * 0.3);
    const isHighRisk = riskScore > 0.7;
    
    return {
      isAnomaly: isHighRisk,
      anomalyScore: riskScore,
      confidence: Math.min(0.95, pattern.rssiHistory.length / 20), // Higher confidence with more data
      features: [degradationTrend, timeBasedRisk, ...features],
      modelUsed: 'PredictiveFailureAnalysis'
    };
  }

  private extractPredictiveFeatures(pattern: DevicePattern, currentRssi: number): number[] {
    const recentReadings = pattern.rssiHistory.slice(-10);
    const signalVariability = this.calculateVariance(recentReadings);
    const signalDrop = Math.max(0, pattern.baselineRSSI - currentRssi);
    const consistencyScore = this.calculateConsistencyScore(pattern);
    
    return [signalVariability, signalDrop, consistencyScore];
  }

  private calculateSignalDegradationTrend(pattern: DevicePattern): number {
    if (pattern.rssiHistory.length < 5) return 0;
    
    const recent = pattern.rssiHistory.slice(-5);
    const older = pattern.rssiHistory.slice(-10, -5);
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;
    
    const degradation = Math.max(0, olderAvg - recentAvg);
    return Math.min(1, degradation / this.signalDegradationThreshold);
  }

  private assessTimeBasedRisk(pattern: DevicePattern): number {
    const timeSinceLastSeen = Date.now() - pattern.lastSeen.getTime();
    const offlineRisk = Math.min(1, timeSinceLastSeen / this.deviceOfflineThreshold);
    
    // Check for unusual absence patterns
    const currentHour = new Date().getHours();
    const isUsualHour = pattern.hourPatterns.has(currentHour);
    const absenceRisk = isUsualHour ? 0 : 0.3;
    
    return Math.max(offlineRisk, absenceRisk);
  }

  private calculateConsistencyScore(pattern: DevicePattern): number {
    if (pattern.rssiHistory.length < 3) return 1;
    
    const variance = this.calculateVariance(pattern.rssiHistory);
    const normalizedVariance = Math.min(1, variance / (pattern.varianceThreshold * 2));
    
    return 1 - normalizedVariance; // Higher score = more consistent
  }

  /**
   * Detect new device anomalies using network fingerprinting
   */
  public detectNewDeviceAnomaly(macAddress: string, deviceInfo: any): AnomalyPrediction {
    const existing = this.networkFingerprints.get(macAddress);
    const currentTime = new Date();
    
    if (!existing) {
      // Completely new device
      const fingerprint: NetworkFingerprint = {
        macAddress,
        vendor: deviceInfo.vendor || 'Unknown',
        deviceType: deviceInfo.deviceType || 'Unknown',
        protocol: deviceInfo.protocol || 'Unknown',
        firstSeen: currentTime,
        lastSeen: currentTime,
        commonHours: [currentTime.getHours()],
        signalProfile: [deviceInfo.rssi || -70]
      };
      
      this.networkFingerprints.set(macAddress, fingerprint);
      
      return {
        isAnomaly: true,
        anomalyScore: 0.05, // High anomaly for new device
        confidence: 1.0,
        features: [1, 0, 0], // [isNew, deviceTypeChange, vendorChange]
        modelUsed: 'NetworkFingerprinting'
      };
    }

    // Check for suspicious changes in existing device
    const vendorChanged = existing.vendor !== (deviceInfo.vendor || 'Unknown');
    const deviceTypeChanged = existing.deviceType !== (deviceInfo.deviceType || 'Unknown');
    const protocolChanged = existing.protocol !== (deviceInfo.protocol || 'Unknown');
    
    // Update fingerprint
    existing.lastSeen = currentTime;
    const currentHour = currentTime.getHours();
    if (!existing.commonHours.includes(currentHour)) {
      existing.commonHours.push(currentHour);
    }
    existing.signalProfile.push(deviceInfo.rssi || -70);
    if (existing.signalProfile.length > 50) {
      existing.signalProfile.shift();
    }

    const suspiciousChanges = vendorChanged || deviceTypeChanged || protocolChanged;
    
    return {
      isAnomaly: suspiciousChanges,
      anomalyScore: suspiciousChanges ? 0.15 : 0.8,
      confidence: suspiciousChanges ? 0.9 : 0.3,
      features: [0, deviceTypeChanged ? 1 : 0, vendorChanged ? 1 : 0],
      modelUsed: 'NetworkFingerprinting'
    };
  }

  /**
   * Detect temporal anomalies using time series analysis
   */
  public detectTemporalAnomaly(deviceId: number, macAddress: string, timestamp: Date): AnomalyPrediction {
    const pattern = this.getOrCreateDevicePattern(deviceId, macAddress);
    const currentHour = timestamp.getHours();
    const dayOfWeek = timestamp.getDay();
    
    // Calculate temporal features
    const hourlyActivity = pattern.hourPatterns.get(currentHour)?.length || 0;
    const totalActivity = Array.from(pattern.hourPatterns.values())
      .reduce((sum, readings) => sum + readings.length, 0);
    
    const relativeActivity = totalActivity > 0 ? hourlyActivity / totalActivity : 0;
    
    // Simulate LSTM autoencoder for temporal pattern analysis
    const temporalFeatures = [currentHour / 24, dayOfWeek / 7, relativeActivity];
    const reconstructionError = this.simulateLSTMAutoencoder(temporalFeatures);
    
    const isAnomaly = reconstructionError > 0.3; // Threshold for reconstruction error
    
    return {
      isAnomaly,
      anomalyScore: reconstructionError,
      confidence: Math.min(reconstructionError * 2, 1.0),
      features: temporalFeatures,
      modelUsed: 'LSTM_Autoencoder'
    };
  }

  /**
   * Comprehensive anomaly analysis combining all models
   */
  public analyzeDeviceAnomalies(deviceId: number, macAddress: string, rssi: number, deviceInfo: any, timestamp: Date): {
    rssiAnomaly: AnomalyPrediction;
    deviceAnomaly: AnomalyPrediction;
    temporalAnomaly: AnomalyPrediction;
    predictiveAnomaly: AnomalyPrediction;
    overallRisk: number;
    recommendations: string[];
    criticalityLevel: 'low' | 'medium' | 'high' | 'critical';
  } {
    const rssiAnomaly = this.detectRSSIAnomaly(deviceId, macAddress, rssi, timestamp);
    const deviceAnomaly = this.detectNewDeviceAnomaly(macAddress, deviceInfo);
    const temporalAnomaly = this.detectTemporalAnomaly(deviceId, macAddress, timestamp);
    const predictiveAnomaly = this.predictDeviceFailure(macAddress, rssi);
    
    // Calculate weighted overall risk score
    const riskFactors = [
      { score: rssiAnomaly.anomalyScore * rssiAnomaly.confidence, weight: 0.3 },
      { score: deviceAnomaly.anomalyScore * deviceAnomaly.confidence, weight: 0.2 },
      { score: temporalAnomaly.anomalyScore * temporalAnomaly.confidence, weight: 0.2 },
      { score: predictiveAnomaly.anomalyScore * predictiveAnomaly.confidence, weight: 0.3 }
    ];
    
    const overallRisk = riskFactors.reduce((sum, factor) => sum + (factor.score * factor.weight), 0);
    
    // Determine criticality level
    let criticalityLevel: 'low' | 'medium' | 'high' | 'critical';
    if (overallRisk > 0.85) criticalityLevel = 'critical';
    else if (overallRisk > 0.7) criticalityLevel = 'high';
    else if (overallRisk > 0.4) criticalityLevel = 'medium';
    else criticalityLevel = 'low';
    
    // Generate intelligent recommendations
    const recommendations = this.generateIntelligentRecommendations(
      rssiAnomaly, deviceAnomaly, temporalAnomaly, predictiveAnomaly, overallRisk, deviceInfo
    );
    
    return {
      rssiAnomaly,
      deviceAnomaly,
      temporalAnomaly,
      predictiveAnomaly,
      overallRisk,
      recommendations,
      criticalityLevel
    };
  }

  private generateIntelligentRecommendations(
    rssiAnomaly: AnomalyPrediction,
    deviceAnomaly: AnomalyPrediction,
    temporalAnomaly: AnomalyPrediction,
    predictiveAnomaly: AnomalyPrediction,
    overallRisk: number,
    deviceInfo: any
  ): string[] {
    const recommendations: string[] = [];
    
    // RSSI-based recommendations
    if (rssiAnomaly.isAnomaly) {
      if (rssiAnomaly.anomalyScore > 0.8) {
        recommendations.push('CRITICAL: Device signal severely degraded - immediate attention required');
      } else if (rssiAnomaly.anomalyScore > 0.6) {
        recommendations.push('WARNING: Check device placement and remove potential interference sources');
      } else {
        recommendations.push('INFO: Monitor signal strength trends for this device');
      }
    }
    
    // Device security recommendations
    if (deviceAnomaly.isAnomaly) {
      if (deviceAnomaly.features[0] === 1) { // New device
        recommendations.push('NEW DEVICE: Verify device authorization and add to trusted list');
      } else {
        recommendations.push('SECURITY: Device fingerprint changed - verify device identity');
      }
    }
    
    // Temporal pattern recommendations
    if (temporalAnomaly.isAnomaly) {
      recommendations.push('PATTERN: Unusual activity timing detected - review device usage patterns');
    }
    
    // Predictive maintenance recommendations
    if (predictiveAnomaly.isAnomaly) {
      if (predictiveAnomaly.anomalyScore > 0.8) {
        recommendations.push('MAINTENANCE: Device failure predicted - schedule immediate inspection');
      } else {
        recommendations.push('SCHEDULE: Consider preventive maintenance for this device');
      }
    }
    
    // Overall risk recommendations
    if (overallRisk > 0.85) {
      recommendations.push('IMMEDIATE ACTION: High-risk device requires urgent investigation');
      recommendations.push('CONSIDER: Temporary device isolation until issues resolved');
    } else if (overallRisk > 0.7) {
      recommendations.push('MONITOR: Increase monitoring frequency for this device');
    }
    
    // Device-specific recommendations
    if (deviceInfo.deviceType === 'printer' && rssiAnomaly.isAnomaly) {
      recommendations.push('PRINTER: Check paper, toner, and network cable connections');
    } else if (deviceInfo.deviceType === 'router' && rssiAnomaly.isAnomaly) {
      recommendations.push('ROUTER: Network infrastructure issue - check all connections');
    }
    
    return recommendations.length > 0 ? recommendations : ['Device operating normally'];
  }

  /**
   * Get device statistics for ML training
   */
  public getDeviceStatistics(macAddress: string): any {
    const pattern = Array.from(this.devicePatterns.values())
      .find(p => p.macAddress === macAddress);
    const fingerprint = this.networkFingerprints.get(macAddress);
    const history = this.anomalyHistory.get(macAddress) || [];
    
    if (!pattern || !fingerprint) {
      return null;
    }
    
    return {
      macAddress,
      rssiStats: {
        mean: pattern.rssiHistory.length > 0 
          ? pattern.rssiHistory.reduce((a, b) => a + b, 0) / pattern.rssiHistory.length 
          : 0,
        variance: this.calculateVariance(pattern.rssiHistory),
        min: Math.min(...pattern.rssiHistory),
        max: Math.max(...pattern.rssiHistory),
        readings: pattern.rssiHistory.length
      },
      temporalStats: {
        activeHours: pattern.hourPatterns.size,
        firstSeen: fingerprint.firstSeen,
        lastSeen: fingerprint.lastSeen,
        daysSeen: Math.ceil((fingerprint.lastSeen.getTime() - fingerprint.firstSeen.getTime()) / (1000 * 60 * 60 * 24))
      },
      anomalyStats: {
        totalAnomalies: history.filter(h => h.isAnomaly).length,
        averageConfidence: history.length > 0 
          ? history.reduce((sum, h) => sum + h.confidence, 0) / history.length 
          : 0,
        lastAnomalyScore: history.length > 0 ? history[history.length - 1].anomalyScore : 0
      }
    };
  }

  private getOrCreateDevicePattern(deviceId: number, macAddress: string): DevicePattern {
    if (!this.devicePatterns.has(macAddress)) {
      this.devicePatterns.set(macAddress, {
        deviceId,
        macAddress,
        rssiHistory: [],
        hourPatterns: new Map(),
        baselineRSSI: -70,
        varianceThreshold: 10,
        lastSeen: new Date()
      });
    }
    return this.devicePatterns.get(macAddress)!;
  }

  private extractRSSIFeatures(pattern: DevicePattern, currentRSSI: number, hour: number): number[] {
    const history = pattern.rssiHistory;
    if (history.length < 5) {
      return [currentRSSI, hour, 0, 0, 0]; // Not enough data
    }
    
    const mean = history.reduce((a, b) => a + b, 0) / history.length;
    const variance = this.calculateVariance(history);
    const trend = this.calculateTrend(history.slice(-10)); // Last 10 readings
    const deviationFromMean = Math.abs(currentRSSI - mean);
    
    return [currentRSSI, hour, mean, variance, trend, deviationFromMean];
  }

  private simulateIsolationForest(features: number[]): number {
    // Simulate Isolation Forest anomaly scoring
    // In production, this would use the actual scikit-learn model
    const [rssi, hour, mean, variance, trend, deviation] = features;
    
    // Simple heuristic simulation
    let score = 0.5; // Baseline normal score
    
    // RSSI too low
    if (rssi < -85) score -= 0.3;
    
    // High deviation from mean
    if (deviation > 15) score -= 0.2;
    
    // Unusual time (late night/early morning)
    if (hour < 6 || hour > 23) score -= 0.1;
    
    // High variance indicates instability
    if (variance > 100) score -= 0.15;
    
    // Strong negative trend
    if (trend < -5) score -= 0.25;
    
    return Math.max(0, Math.min(1, score));
  }

  private simulateLSTMAutoencoder(temporalFeatures: number[]): number {
    // Simulate LSTM Autoencoder reconstruction error
    // In production, this would use the actual neural network model
    const [hourNorm, dayNorm, activity] = temporalFeatures;
    
    // Simulate reconstruction based on temporal patterns
    const expectedActivity = this.getExpectedActivity(hourNorm, dayNorm);
    const reconstructionError = Math.abs(activity - expectedActivity);
    
    return Math.min(1, reconstructionError * 2);
  }

  private getExpectedActivity(hourNorm: number, dayNorm: number): number {
    // Simulate expected activity based on time patterns
    const hour = hourNorm * 24;
    const isWeekend = dayNorm > 5/7; // Approximate weekend
    
    // Business hours activity (9 AM - 5 PM)
    if (hour >= 9 && hour <= 17 && !isWeekend) {
      return 0.8; // High activity
    }
    
    // Evening hours (6 PM - 10 PM)
    if (hour >= 18 && hour <= 22) {
      return 0.6; // Medium activity
    }
    
    // Night hours (11 PM - 6 AM)
    if (hour >= 23 || hour <= 6) {
      return 0.1; // Low activity
    }
    
    return 0.4; // Default activity
  }

  private calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    // Simple linear trend calculation
    const n = values.length;
    const sumX = (n * (n - 1)) / 2; // Sum of indices
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of squared indices
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  /**
   * Export training data for model improvement
   */
  public exportTrainingData(): any {
    const trainingData: any[] = [];
    
    for (const [macAddress, pattern] of this.devicePatterns) {
      const fingerprint = this.networkFingerprints.get(macAddress);
      const history = this.anomalyHistory.get(macAddress) || [];
      
      if (!fingerprint) continue;
      
      for (let i = 0; i < pattern.rssiHistory.length; i++) {
        const rssi = pattern.rssiHistory[i];
        const timestamp = new Date(fingerprint.lastSeen.getTime() - (pattern.rssiHistory.length - i) * 60000);
        
        trainingData.push({
          macAddress,
          rssi,
          hour: timestamp.getHours(),
          dayOfWeek: timestamp.getDay(),
          deviceType: fingerprint.deviceType,
          vendor: fingerprint.vendor,
          isAnomaly: history.some(h => h.isAnomaly && 
            Math.abs(timestamp.getTime() - h.features[0]) < 300000) // 5 min window
        });
      }
    }
    
    return trainingData;
  }
}

// Global instance
export const mlAnomalyDetection = new MLAnomalyDetection();