/**
 * Predictive Maintenance AI System
 * Uses machine learning to predict device failures and schedule maintenance
 */

export interface DeviceHealthMetrics {
  deviceId: string;
  currentHealth: number; // 0-1 scale
  degradationRate: number; // per day
  performanceScore: number; // 0-1 scale
  signalStability: number; // 0-1 scale
  connectionQuality: number; // 0-1 scale
  batteryLevel?: number; // 0-100% if applicable
  temperature?: number; // Celsius
  lastMaintenance?: Date;
  operatingHours: number;
  errorCount: number;
  restartCount: number;
  dataCorruption: number; // incidents count
  timestamp: Date;
}

export interface FailurePrediction {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  failureProbability: number; // 0-1 scale
  timeToFailure: number; // days
  failureType: 'hardware' | 'software' | 'battery' | 'connectivity' | 'performance';
  confidence: number; // 0-1 scale
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  contributingFactors: string[];
  recommendedActions: string[];
  estimatedCost: number; // USD
  urgency: number; // 1-10 scale
  lastUpdated: Date;
}

export interface MaintenanceSchedule {
  scheduleId: string;
  deviceId: string;
  deviceName: string;
  maintenanceType: 'preventive' | 'corrective' | 'emergency' | 'routine';
  scheduledDate: Date;
  estimatedDuration: number; // minutes
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  requiredParts: string[];
  estimatedCost: number;
  assignedTechnician?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'postponed' | 'cancelled';
  notes?: string;
  completedDate?: Date;
  actualDuration?: number;
  actualCost?: number;
}

export interface DevicePerformanceTrend {
  deviceId: string;
  timeframe: '24h' | '7d' | '30d' | '90d';
  performanceData: {
    timestamp: Date;
    metric: string;
    value: number;
    threshold: number;
  }[];
  trendDirection: 'improving' | 'stable' | 'degrading' | 'critical';
  changeRate: number; // percentage change per day
  anomalies: {
    timestamp: Date;
    severity: number;
    description: string;
  }[];
}

export interface MaintenanceCostAnalysis {
  deviceId: string;
  totalCost: number;
  preventiveCost: number;
  correctiveCost: number;
  emergencyCost: number;
  costPerDay: number;
  savingsFromPredictive: number;
  roi: number; // return on investment
  recommendations: string[];
}

export class PredictiveMaintenanceAI {
  private healthHistory: Map<string, DeviceHealthMetrics[]> = new Map();
  private predictions: Map<string, FailurePrediction> = new Map();
  private schedules: Map<string, MaintenanceSchedule> = new Map();
  private performanceTrends: Map<string, DevicePerformanceTrend> = new Map();
  private costAnalysis: Map<string, MaintenanceCostAnalysis> = new Map();

  constructor() {
    this.initializeMLModels();
    this.startContinuousMonitoring();
  }

  /**
   * Analyze device health and predict failures
   */
  async analyzeDeviceHealth(deviceId: string, telemetryData: any): Promise<DeviceHealthMetrics> {
    const currentMetrics = this.calculateHealthMetrics(deviceId, telemetryData);
    
    // Store historical data
    const history = this.healthHistory.get(deviceId) || [];
    history.push(currentMetrics);
    
    // Keep only last 90 days of data
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const filteredHistory = history.filter(h => h.timestamp > cutoffDate);
    this.healthHistory.set(deviceId, filteredHistory);

    // Generate failure prediction
    const prediction = await this.predictFailure(deviceId, filteredHistory);
    this.predictions.set(deviceId, prediction);

    // Schedule maintenance if needed
    await this.evaluateMaintenanceNeeds(deviceId, prediction);

    return currentMetrics;
  }

  /**
   * Calculate comprehensive health metrics for a device
   */
  private calculateHealthMetrics(deviceId: string, telemetry: any): DeviceHealthMetrics {
    const now = new Date();
    const history = this.healthHistory.get(deviceId) || [];
    
    // Calculate degradation rate based on historical performance
    const degradationRate = this.calculateDegradationRate(history);
    
    // Performance score based on multiple factors
    const performanceScore = this.calculatePerformanceScore(telemetry);
    
    // Signal stability analysis
    const signalStability = this.calculateSignalStability(telemetry);
    
    // Connection quality assessment
    const connectionQuality = this.calculateConnectionQuality(telemetry);
    
    // Overall health score (weighted average)
    const currentHealth = (
      performanceScore * 0.4 +
      signalStability * 0.3 +
      connectionQuality * 0.2 +
      (1 - degradationRate) * 0.1
    );

    return {
      deviceId,
      currentHealth: Math.max(0, Math.min(1, currentHealth)),
      degradationRate,
      performanceScore,
      signalStability,
      connectionQuality,
      batteryLevel: telemetry.batteryLevel,
      temperature: telemetry.temperature,
      lastMaintenance: telemetry.lastMaintenance ? new Date(telemetry.lastMaintenance) : undefined,
      operatingHours: telemetry.operatingHours || 0,
      errorCount: telemetry.errorCount || 0,
      restartCount: telemetry.restartCount || 0,
      dataCorruption: telemetry.dataCorruption || 0,
      timestamp: now
    };
  }

  /**
   * Calculate performance degradation rate
   */
  private calculateDegradationRate(history: DeviceHealthMetrics[]): number {
    if (history.length < 2) return 0;

    const recent = history.slice(-30); // Last 30 readings
    if (recent.length < 2) return 0;

    const startPerformance = recent[0].performanceScore;
    const endPerformance = recent[recent.length - 1].performanceScore;
    const timeDiff = (recent[recent.length - 1].timestamp.getTime() - recent[0].timestamp.getTime()) / (1000 * 60 * 60 * 24);

    if (timeDiff === 0) return 0;

    const degradationRate = (startPerformance - endPerformance) / timeDiff;
    return Math.max(0, degradationRate); // Only count degradation, not improvement
  }

  /**
   * Calculate device performance score
   */
  private calculatePerformanceScore(telemetry: any): number {
    let score = 1.0;

    // Response time factor
    if (telemetry.responseTime) {
      const responseTimeFactor = Math.max(0, 1 - (telemetry.responseTime - 100) / 1000);
      score *= responseTimeFactor;
    }

    // Error rate factor
    if (telemetry.errorRate) {
      const errorFactor = Math.max(0, 1 - telemetry.errorRate);
      score *= errorFactor;
    }

    // Uptime factor
    if (telemetry.uptime !== undefined) {
      score *= telemetry.uptime / 100;
    }

    // CPU/Memory usage factor
    if (telemetry.cpuUsage) {
      const cpuFactor = Math.max(0, 1 - Math.max(0, telemetry.cpuUsage - 70) / 30);
      score *= cpuFactor;
    }

    if (telemetry.memoryUsage) {
      const memoryFactor = Math.max(0, 1 - Math.max(0, telemetry.memoryUsage - 80) / 20);
      score *= memoryFactor;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate signal stability
   */
  private calculateSignalStability(telemetry: any): number {
    if (!telemetry.rssi && !telemetry.signalStrength) return 0.8; // Default if no signal data

    const signalStrength = telemetry.rssi || telemetry.signalStrength || -50;
    
    // Convert RSSI to stability score
    // -30 to -50 dBm = excellent (1.0)
    // -50 to -70 dBm = good (0.8)
    // -70 to -85 dBm = fair (0.6)
    // -85 to -100 dBm = poor (0.3)
    // < -100 dBm = very poor (0.1)
    
    if (signalStrength >= -50) return 1.0;
    if (signalStrength >= -70) return 0.8;
    if (signalStrength >= -85) return 0.6;
    if (signalStrength >= -100) return 0.3;
    return 0.1;
  }

  /**
   * Calculate connection quality
   */
  private calculateConnectionQuality(telemetry: any): number {
    let quality = 1.0;

    // Packet loss factor
    if (telemetry.packetLoss !== undefined) {
      quality *= Math.max(0, 1 - telemetry.packetLoss / 100);
    }

    // Latency factor
    if (telemetry.latency) {
      const latencyFactor = Math.max(0, 1 - Math.max(0, telemetry.latency - 50) / 200);
      quality *= latencyFactor;
    }

    // Connection drops factor
    if (telemetry.connectionDrops) {
      const dropsFactor = Math.max(0, 1 - telemetry.connectionDrops / 10);
      quality *= dropsFactor;
    }

    return Math.max(0, Math.min(1, quality));
  }

  /**
   * Predict device failure using ML models
   */
  private async predictFailure(deviceId: string, history: DeviceHealthMetrics[]): Promise<FailurePrediction> {
    if (history.length < 5) {
      // Not enough data for reliable prediction
      return this.createDefaultPrediction(deviceId);
    }

    const latestMetrics = history[history.length - 1];
    const device = await this.getDeviceInfo(deviceId);
    
    // Analyze trends and patterns
    const healthTrend = this.calculateHealthTrend(history);
    const degradationAcceleration = this.calculateDegradationAcceleration(history);
    const anomalyCount = this.countRecentAnomalies(history);
    
    // ML-based failure probability calculation
    const failureProbability = this.calculateFailureProbability(
      latestMetrics,
      healthTrend,
      degradationAcceleration,
      anomalyCount
    );
    
    // Estimate time to failure
    const timeToFailure = this.estimateTimeToFailure(latestMetrics, healthTrend);
    
    // Determine failure type
    const failureType = this.predictFailureType(latestMetrics, history);
    
    // Calculate confidence based on data quality and quantity
    const confidence = this.calculatePredictionConfidence(history, anomalyCount);
    
    return {
      deviceId,
      deviceName: device.name || `Device ${deviceId}`,
      deviceType: device.type || 'unknown',
      failureProbability,
      timeToFailure,
      failureType,
      confidence,
      riskLevel: this.determineRiskLevel(failureProbability, timeToFailure),
      contributingFactors: this.identifyContributingFactors(latestMetrics, history),
      recommendedActions: this.generateRecommendations(failureProbability, failureType, timeToFailure),
      estimatedCost: this.estimateMaintenanceCost(failureType, device.type),
      urgency: this.calculateUrgency(failureProbability, timeToFailure),
      lastUpdated: new Date()
    };
  }

  /**
   * Calculate failure probability using multiple factors
   */
  private calculateFailureProbability(
    metrics: DeviceHealthMetrics,
    trend: number,
    acceleration: number,
    anomalies: number
  ): number {
    let probability = 0;

    // Health score factor (inverse relationship)
    probability += (1 - metrics.currentHealth) * 0.4;

    // Degradation rate factor
    probability += Math.min(metrics.degradationRate * 10, 1) * 0.3;

    // Trend factor (negative trend increases probability)
    if (trend < 0) {
      probability += Math.abs(trend) * 0.15;
    }

    // Acceleration factor
    probability += Math.min(acceleration, 1) * 0.1;

    // Anomaly factor
    probability += Math.min(anomalies / 10, 1) * 0.05;

    return Math.max(0, Math.min(1, probability));
  }

  /**
   * Estimate time to failure in days
   */
  private estimateTimeToFailure(metrics: DeviceHealthMetrics, trend: number): number {
    if (metrics.degradationRate <= 0 || trend >= 0) {
      return 365; // More than a year if no degradation
    }

    // Calculate days until health reaches critical threshold (0.2)
    const currentHealth = metrics.currentHealth;
    const criticalThreshold = 0.2;
    const healthToLose = currentHealth - criticalThreshold;
    
    if (healthToLose <= 0) {
      return 1; // Already critical
    }

    const daysToFailure = healthToLose / metrics.degradationRate;
    return Math.max(1, Math.min(365, daysToFailure));
  }

  /**
   * Predict the most likely failure type
   */
  private predictFailureType(
    metrics: DeviceHealthMetrics,
    history: DeviceHealthMetrics[]
  ): 'hardware' | 'software' | 'battery' | 'connectivity' | 'performance' {
    const scores = {
      hardware: 0,
      software: 0,
      battery: 0,
      connectivity: 0,
      performance: 0
    };

    // Battery-related indicators
    if (metrics.batteryLevel !== undefined && metrics.batteryLevel < 20) {
      scores.battery += 0.5;
    }

    // Connectivity indicators
    if (metrics.connectionQuality < 0.6 || metrics.signalStability < 0.6) {
      scores.connectivity += 0.4;
    }

    // Performance indicators
    if (metrics.performanceScore < 0.7) {
      scores.performance += 0.3;
    }

    // Software indicators (high error counts, frequent restarts)
    if (metrics.errorCount > 10 || metrics.restartCount > 5) {
      scores.software += 0.4;
    }

    // Hardware indicators (temperature, gradual degradation)
    if (metrics.temperature && metrics.temperature > 70) {
      scores.hardware += 0.3;
    }

    if (metrics.operatingHours > 8760) { // More than a year of operation
      scores.hardware += 0.2;
    }

    // Return the type with highest score
    return Object.entries(scores).reduce((a, b) => scores[a[0] as keyof typeof scores] > scores[b[0] as keyof typeof scores] ? a : b)[0] as 'hardware' | 'software' | 'battery' | 'connectivity' | 'performance';
  }

  /**
   * Schedule maintenance based on predictions
   */
  private async evaluateMaintenanceNeeds(deviceId: string, prediction: FailurePrediction): Promise<void> {
    const existingSchedule = Array.from(this.schedules.values())
      .find(s => s.deviceId === deviceId && s.status === 'scheduled');

    if (existingSchedule) {
      // Update existing schedule if risk has changed significantly
      if (prediction.riskLevel === 'critical' && existingSchedule.priority !== 'critical') {
        existingSchedule.priority = 'critical';
        existingSchedule.scheduledDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      }
      return;
    }

    // Create new maintenance schedule based on risk level
    if (prediction.riskLevel === 'critical' || prediction.timeToFailure <= 7) {
      await this.scheduleEmergencyMaintenance(deviceId, prediction);
    } else if (prediction.riskLevel === 'high' || prediction.timeToFailure <= 30) {
      await this.schedulePreventiveMaintenance(deviceId, prediction);
    } else if (prediction.timeToFailure <= 90) {
      await this.scheduleRoutineMaintenance(deviceId, prediction);
    }
  }

  /**
   * Schedule emergency maintenance
   */
  private async scheduleEmergencyMaintenance(deviceId: string, prediction: FailurePrediction): Promise<void> {
    const schedule: MaintenanceSchedule = {
      scheduleId: `emergency_${deviceId}_${Date.now()}`,
      deviceId,
      deviceName: prediction.deviceName,
      maintenanceType: 'emergency',
      scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      estimatedDuration: 120, // 2 hours
      priority: 'critical',
      description: `Emergency maintenance due to critical failure risk (${Math.round(prediction.failureProbability * 100)}%)`,
      requiredParts: this.getRequiredParts(prediction.failureType),
      estimatedCost: prediction.estimatedCost * 1.5, // Emergency premium
      status: 'scheduled',
      notes: `Predicted failure type: ${prediction.failureType}. Time to failure: ${Math.round(prediction.timeToFailure)} days.`
    };

    this.schedules.set(schedule.scheduleId, schedule);
  }

  /**
   * Schedule preventive maintenance
   */
  private async schedulePreventiveMaintenance(deviceId: string, prediction: FailurePrediction): Promise<void> {
    const daysBeforeFailure = Math.max(7, prediction.timeToFailure * 0.5);
    const scheduledDate = new Date(Date.now() + daysBeforeFailure * 24 * 60 * 60 * 1000);

    const schedule: MaintenanceSchedule = {
      scheduleId: `preventive_${deviceId}_${Date.now()}`,
      deviceId,
      deviceName: prediction.deviceName,
      maintenanceType: 'preventive',
      scheduledDate,
      estimatedDuration: 90,
      priority: prediction.riskLevel === 'high' ? 'high' : 'medium',
      description: `Preventive maintenance to prevent predicted ${prediction.failureType} failure`,
      requiredParts: this.getRequiredParts(prediction.failureType),
      estimatedCost: prediction.estimatedCost,
      status: 'scheduled'
    };

    this.schedules.set(schedule.scheduleId, schedule);
  }

  /**
   * Schedule routine maintenance
   */
  private async scheduleRoutineMaintenance(deviceId: string, prediction: FailurePrediction): Promise<void> {
    const scheduledDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // In 30 days

    const schedule: MaintenanceSchedule = {
      scheduleId: `routine_${deviceId}_${Date.now()}`,
      deviceId,
      deviceName: prediction.deviceName,
      maintenanceType: 'routine',
      scheduledDate,
      estimatedDuration: 60,
      priority: 'low',
      description: 'Routine maintenance and inspection',
      requiredParts: ['cleaning_supplies', 'basic_tools'],
      estimatedCost: 50,
      status: 'scheduled'
    };

    this.schedules.set(schedule.scheduleId, schedule);
  }

  /**
   * Helper methods for calculations
   */
  private calculateHealthTrend(history: DeviceHealthMetrics[]): number {
    if (history.length < 2) return 0;

    const recent = history.slice(-10); // Last 10 readings
    if (recent.length < 2) return 0;

    const startHealth = recent[0].currentHealth;
    const endHealth = recent[recent.length - 1].currentHealth;
    
    return (endHealth - startHealth) / recent.length;
  }

  private calculateDegradationAcceleration(history: DeviceHealthMetrics[]): number {
    if (history.length < 3) return 0;

    const degradationRates = history.slice(-5).map(h => h.degradationRate);
    if (degradationRates.length < 2) return 0;

    const acceleration = degradationRates[degradationRates.length - 1] - degradationRates[0];
    return Math.max(0, acceleration);
  }

  private countRecentAnomalies(history: DeviceHealthMetrics[]): number {
    const recent = history.slice(-24); // Last 24 readings
    return recent.filter(h => h.currentHealth < 0.5 || h.errorCount > 5).length;
  }

  private determineRiskLevel(probability: number, timeToFailure: number): 'low' | 'medium' | 'high' | 'critical' {
    if (probability >= 0.8 || timeToFailure <= 7) return 'critical';
    if (probability >= 0.6 || timeToFailure <= 30) return 'high';
    if (probability >= 0.4 || timeToFailure <= 90) return 'medium';
    return 'low';
  }

  private identifyContributingFactors(metrics: DeviceHealthMetrics, history: DeviceHealthMetrics[]): string[] {
    const factors: string[] = [];

    if (metrics.currentHealth < 0.6) factors.push('Poor overall health');
    if (metrics.degradationRate > 0.01) factors.push('Rapid performance degradation');
    if (metrics.signalStability < 0.6) factors.push('Unstable signal quality');
    if (metrics.connectionQuality < 0.6) factors.push('Poor connection quality');
    if (metrics.errorCount > 10) factors.push('High error rate');
    if (metrics.restartCount > 5) factors.push('Frequent restarts');
    if (metrics.temperature && metrics.temperature > 70) factors.push('High operating temperature');
    if (metrics.batteryLevel && metrics.batteryLevel < 20) factors.push('Low battery level');
    if (metrics.operatingHours > 8760) factors.push('Extended operating time');

    return factors;
  }

  private generateRecommendations(
    probability: number,
    failureType: string,
    timeToFailure: number
  ): string[] {
    const recommendations: string[] = [];

    if (probability >= 0.8) {
      recommendations.push('Schedule immediate inspection');
      recommendations.push('Prepare replacement device');
    }

    if (timeToFailure <= 7) {
      recommendations.push('Schedule emergency maintenance within 24 hours');
    } else if (timeToFailure <= 30) {
      recommendations.push('Schedule preventive maintenance within 2 weeks');
    }

    switch (failureType) {
      case 'battery':
        recommendations.push('Replace battery');
        recommendations.push('Check charging system');
        break;
      case 'connectivity':
        recommendations.push('Check network infrastructure');
        recommendations.push('Verify antenna connections');
        break;
      case 'hardware':
        recommendations.push('Inspect physical components');
        recommendations.push('Check for overheating');
        break;
      case 'software':
        recommendations.push('Update firmware');
        recommendations.push('Clear error logs');
        break;
      case 'performance':
        recommendations.push('Optimize device settings');
        recommendations.push('Clear cache and temporary files');
        break;
    }

    return recommendations;
  }

  private estimateMaintenanceCost(failureType: string, deviceType: string): number {
    const baseCosts: Record<string, number> = {
      battery: 50,
      connectivity: 75,
      hardware: 150,
      software: 25,
      performance: 30
    };

    const deviceMultipliers: Record<string, number> = {
      router: 1.5,
      camera: 1.2,
      sensor: 0.8,
      smart_tv: 2.0,
      speaker: 1.0
    };

    const baseCost = baseCosts[failureType] || 100;
    const multiplier = deviceMultipliers[deviceType] || 1.0;

    return baseCost * multiplier;
  }

  private calculateUrgency(probability: number, timeToFailure: number): number {
    const probabilityUrgency = probability * 5;
    const timeUrgency = Math.max(0, 5 - (timeToFailure / 30) * 5);
    
    return Math.min(10, Math.round(probabilityUrgency + timeUrgency));
  }

  private calculatePredictionConfidence(history: DeviceHealthMetrics[], anomalies: number): number {
    let confidence = 0.5; // Base confidence

    // More data = higher confidence
    confidence += Math.min(history.length / 30, 0.3);

    // Fewer anomalies = higher confidence
    confidence += Math.max(0, 0.2 - (anomalies / 50));

    return Math.max(0.1, Math.min(0.95, confidence));
  }

  private getRequiredParts(failureType: string): string[] {
    const parts: Record<string, string[]> = {
      battery: ['battery_pack', 'battery_connector'],
      connectivity: ['antenna', 'network_module', 'cables'],
      hardware: ['replacement_parts', 'thermal_paste', 'screws'],
      software: ['firmware_update', 'configuration_backup'],
      performance: ['cleaning_supplies', 'optimization_tools']
    };

    return parts[failureType] || ['basic_tools'];
  }

  private createDefaultPrediction(deviceId: string): FailurePrediction {
    return {
      deviceId,
      deviceName: `Device ${deviceId}`,
      deviceType: 'unknown',
      failureProbability: 0.1,
      timeToFailure: 365,
      failureType: 'performance',
      confidence: 0.3,
      riskLevel: 'low',
      contributingFactors: ['Insufficient data for analysis'],
      recommendedActions: ['Monitor device performance', 'Collect more telemetry data'],
      estimatedCost: 50,
      urgency: 2,
      lastUpdated: new Date()
    };
  }

  private async getDeviceInfo(deviceId: string): Promise<any> {
    // This would typically fetch from device database
    return {
      id: deviceId,
      name: `Device ${deviceId}`,
      type: 'unknown'
    };
  }

  private initializeMLModels(): void {
    console.log('[Predictive Maintenance AI] Initializing ML models for failure prediction...');
    // Initialize machine learning models for failure prediction
  }

  private startContinuousMonitoring(): void {
    // Start continuous monitoring loop
    setInterval(() => {
      this.performPeriodicAnalysis();
    }, 60000); // Every minute
  }

  private async performPeriodicAnalysis(): Promise<void> {
    // Perform periodic analysis of all monitored devices
    for (const [deviceId, history] of Array.from(this.healthHistory.entries())) {
      if (history.length > 0) {
        const latest = history[history.length - 1];
        if (Date.now() - latest.timestamp.getTime() < 300000) { // Within last 5 minutes
          await this.predictFailure(deviceId, history);
        }
      }
    }
  }

  /**
   * Public API methods
   */
  async getFailurePredictions(): Promise<FailurePrediction[]> {
    return Array.from(this.predictions.values());
  }

  async getMaintenanceSchedule(): Promise<MaintenanceSchedule[]> {
    return Array.from(this.schedules.values()).sort((a, b) => 
      a.scheduledDate.getTime() - b.scheduledDate.getTime()
    );
  }

  async getDeviceHealthStatus(deviceId: string): Promise<DeviceHealthMetrics | null> {
    const history = this.healthHistory.get(deviceId);
    return history && history.length > 0 ? history[history.length - 1] : null;
  }

  async updateMaintenanceStatus(scheduleId: string, status: MaintenanceSchedule['status'], notes?: string): Promise<void> {
    const schedule = this.schedules.get(scheduleId);
    if (schedule) {
      schedule.status = status;
      if (notes) schedule.notes = notes;
      if (status === 'completed') schedule.completedDate = new Date();
    }
  }

  async getCostAnalysis(deviceId: string): Promise<MaintenanceCostAnalysis | null> {
    return this.costAnalysis.get(deviceId) || null;
  }

  async getPerformanceTrend(deviceId: string, timeframe: '24h' | '7d' | '30d' | '90d'): Promise<DevicePerformanceTrend | null> {
    const trend = this.performanceTrends.get(`${deviceId}_${timeframe}`);
    return trend || null;
  }
}

export const predictiveMaintenanceAI = new PredictiveMaintenanceAI();