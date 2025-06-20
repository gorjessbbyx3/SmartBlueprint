import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

interface DeviceHealthData {
  device_id: string;
  health_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  last_updated: string;
  recommendations: string[];
}

interface HealthSummary {
  total_devices: number;
  healthy_devices: number;
  at_risk_devices: number;
  critical_devices: number;
  average_health_score: number;
  devices_needing_attention: Array<{
    device_id: string;
    health_score: number;
    risk_level: string;
    last_updated: string;
  }>;
}

interface PredictiveInsight {
  type: string;
  severity: string;
  description: string;
  affected_devices: string[];
  predicted_impact: string;
  recommended_actions: string[];
  confidence: number;
  timestamp: string;
}

class MLPredictiveAnalytics {
  private deviceData = new Map<string, any[]>();
  private healthScores = new Map<string, DeviceHealthData>();
  private insights: PredictiveInsight[] = [];

  addTelemetry(deviceId: string, telemetry: any): { status: string; message: string } {
    try {
      // Add timestamp if not present
      if (!telemetry.timestamp) {
        telemetry.timestamp = new Date().toISOString();
      }

      // Initialize device data if not exists
      if (!this.deviceData.has(deviceId)) {
        this.deviceData.set(deviceId, []);
      }

      // Add telemetry data (keep last 100 entries)
      const deviceHistory = this.deviceData.get(deviceId)!;
      deviceHistory.push(telemetry);
      if (deviceHistory.length > 100) {
        deviceHistory.shift();
      }

      // Update health assessment
      this.updateDeviceHealth(deviceId);

      return { status: 'success', message: 'Telemetry added successfully' };
    } catch (error) {
      console.error('Error adding telemetry:', error);
      return { status: 'error', message: 'Failed to add telemetry' };
    }
  }

  private updateDeviceHealth(deviceId: string): void {
    const history = this.deviceData.get(deviceId) || [];
    if (history.length < 3) return;

    let healthScore = 100.0;

    // RSSI analysis
    const rssiValues = history.filter(d => d.rssi !== undefined).map(d => d.rssi);
    if (rssiValues.length > 0) {
      const avgRssi = rssiValues.reduce((sum, val) => sum + val, 0) / rssiValues.length;
      if (avgRssi < -70) healthScore -= 20;
      else if (avgRssi < -60) healthScore -= 10;
    }

    // Response time analysis
    const responseTimes = history.filter(d => d.response_time !== undefined).map(d => d.response_time);
    if (responseTimes.length > 0) {
      const avgResponse = responseTimes.reduce((sum, val) => sum + val, 0) / responseTimes.length;
      if (avgResponse > 1000) healthScore -= 25;
      else if (avgResponse > 500) healthScore -= 15;
    }

    // Connection stability
    const onlineStates = history.filter(d => d.is_online !== undefined).map(d => d.is_online);
    if (onlineStates.length > 0) {
      const uptimeRatio = onlineStates.filter(state => state).length / onlineStates.length;
      healthScore *= uptimeRatio;
    }

    // Error rate analysis
    const errorCounts = history.filter(d => d.error_count !== undefined).map(d => d.error_count);
    if (errorCounts.length > 0) {
      const avgErrors = errorCounts.reduce((sum, val) => sum + val, 0) / errorCounts.length;
      healthScore -= Math.min(avgErrors * 5, 30);
    }

    // Temperature check
    const temperatures = history.filter(d => d.temperature !== undefined).map(d => d.temperature);
    if (temperatures.length > 0) {
      const maxTemp = Math.max(...temperatures);
      if (maxTemp > 85) healthScore -= 20;
      else if (maxTemp > 75) healthScore -= 10;
    }

    const finalScore = Math.max(0, Math.min(100, healthScore));
    const riskLevel = this.getRiskLevel(finalScore);
    const recommendations = this.generateRecommendations(deviceId, finalScore, history);

    this.healthScores.set(deviceId, {
      device_id: deviceId,
      health_score: finalScore,
      risk_level: riskLevel,
      last_updated: new Date().toISOString(),
      recommendations
    });

    // Generate insights for poor health
    if (finalScore < 50) {
      this.generatePredictiveInsight(deviceId, finalScore);
    }
  }

  private getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'low';
    if (score >= 60) return 'medium';
    if (score >= 30) return 'high';
    return 'critical';
  }

  private generateRecommendations(deviceId: string, healthScore: number, history: any[]): string[] {
    const recommendations: string[] = [];

    if (healthScore < 30) {
      recommendations.push('Schedule immediate maintenance inspection');
    } else if (healthScore < 50) {
      recommendations.push('Plan preventive maintenance within 2 weeks');
    }

    // Analyze recent data for specific recommendations
    const recentData = history.slice(-5);
    if (recentData.length > 0) {
      const avgRssi = recentData.filter(d => d.rssi !== undefined)
        .reduce((sum, d, _, arr) => sum + d.rssi / arr.length, 0);
      
      if (avgRssi < -70) {
        recommendations.push('Improve device positioning or add WiFi extender');
      }

      const avgTemp = recentData.filter(d => d.temperature !== undefined)
        .reduce((sum, d, _, arr) => sum + d.temperature / arr.length, 0);
      
      if (avgTemp > 80) {
        recommendations.push('Improve device ventilation or cooling');
      }

      const avgResponse = recentData.filter(d => d.response_time !== undefined)
        .reduce((sum, d, _, arr) => sum + d.response_time / arr.length, 0);
      
      if (avgResponse > 1000) {
        recommendations.push('Check network congestion and device load');
      }
    }

    return recommendations;
  }

  private generatePredictiveInsight(deviceId: string, healthScore: number): void {
    const severity = healthScore < 30 ? 'high' : 'medium';
    
    const insight: PredictiveInsight = {
      type: 'device_health_decline',
      severity,
      description: `Device ${deviceId} showing health decline (score: ${healthScore.toFixed(1)}%)`,
      affected_devices: [deviceId],
      predicted_impact: 'Potential service disruption within 30 days',
      recommended_actions: this.healthScores.get(deviceId)?.recommendations || [],
      confidence: 0.85,
      timestamp: new Date().toISOString()
    };

    this.insights.push(insight);
    console.log(`Generated predictive insight for ${deviceId}: ${insight.description}`);
  }

  getDeviceHealth(deviceId: string): DeviceHealthData | null {
    return this.healthScores.get(deviceId) || null;
  }

  getHealthSummary(): HealthSummary {
    const devices = Array.from(this.healthScores.values());
    
    if (devices.length === 0) {
      return {
        total_devices: 0,
        healthy_devices: 0,
        at_risk_devices: 0,
        critical_devices: 0,
        average_health_score: 0,
        devices_needing_attention: []
      };
    }

    const scores = devices.map(d => d.health_score);
    const riskCounts = {
      low: devices.filter(d => d.risk_level === 'low').length,
      medium: devices.filter(d => d.risk_level === 'medium').length,
      high: devices.filter(d => d.risk_level === 'high').length,
      critical: devices.filter(d => d.risk_level === 'critical').length
    };

    return {
      total_devices: devices.length,
      healthy_devices: riskCounts.low,
      at_risk_devices: riskCounts.medium + riskCounts.high,
      critical_devices: riskCounts.critical,
      average_health_score: scores.reduce((sum, score) => sum + score, 0) / scores.length,
      devices_needing_attention: devices
        .filter(d => d.risk_level === 'high' || d.risk_level === 'critical')
        .map(d => ({
          device_id: d.device_id,
          health_score: d.health_score,
          risk_level: d.risk_level,
          last_updated: d.last_updated
        }))
    };
  }

  getPredictiveInsights(hoursBack: number = 24): PredictiveInsight[] {
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    
    return this.insights
      .filter(insight => new Date(insight.timestamp) > cutoffTime)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  runHealthAssessment(): HealthSummary {
    // Update health for all devices
    for (const deviceId of this.deviceData.keys()) {
      this.updateDeviceHealth(deviceId);
    }
    
    console.log(`Health assessment completed for ${this.deviceData.size} devices`);
    return this.getHealthSummary();
  }
}

// Global instance
export const mlPredictiveAnalytics = new MLPredictiveAnalytics();

// Add some demo data for testing
mlPredictiveAnalytics.addTelemetry('office_printer_001', {
  rssi: -65,
  response_time: 850,
  is_online: true,
  error_count: 3,
  temperature: 75,
  power_consumption: 45
});

mlPredictiveAnalytics.addTelemetry('main_router', {
  rssi: -45,
  response_time: 120,
  is_online: true,
  error_count: 0,
  temperature: 68,
  power_consumption: 25
});

mlPredictiveAnalytics.addTelemetry('security_camera_01', {
  rssi: -72,
  response_time: 950,
  is_online: false,
  error_count: 5,
  temperature: 82,
  power_consumption: 38
});