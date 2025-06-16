import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Active Ping/Latency Probing System
 * Provides meter-level distance measurement using RTT (Round Trip Time)
 * Works with any AP, no special hardware required
 */

export interface PingMeasurement {
  host: string;
  rtt: number; // milliseconds
  distance: number; // meters
  timestamp: Date;
  status: 'success' | 'timeout' | 'error';
  packetLoss: number; // percentage
}

export interface RTTMeasurement {
  mac: string;
  rtt: number; // milliseconds
  distance: number; // meters
  timestamp: Date;
  signalStrength: number; // dBm
}

export interface ProbeData {
  type: 'probe';
  rtt: Record<string, number>; // MAC -> RTT mapping
  ping: Record<string, number>; // Host -> distance mapping
  timestamp: Date;
  location?: { x: number; y: number };
}

export interface CalibrationPoint {
  x: number;
  y: number;
  csiFeatures: number[];
  rttValues: number[];
  pingDistances: number[];
  timestamp: Date;
}

export class ActivePingProbing {
  private calibrationData: CalibrationPoint[] = [];
  private processingOffset = 5; // ms - device/AP processing time
  private speedOfLight = 3e8; // m/s
  private isCalibrating = false;
  private probeInterval?: NodeJS.Timeout;

  constructor() {
    console.log('[Active Ping] Initializing RTT/ping distance measurement system...');
  }

  /**
   * Measure distance using ping RTT
   * Formula: d ≈ ((RTT - t_proc) / 2) * c
   */
  async measurePingDistance(host: string, trials: number = 5): Promise<PingMeasurement> {
    const rtts: number[] = [];
    let successCount = 0;

    for (let i = 0; i < trials; i++) {
      try {
        const rtt = await this.performPing(host);
        if (rtt !== null) {
          rtts.push(rtt);
          successCount++;
        }
        // Small delay between pings
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.warn(`[Active Ping] Ping attempt ${i + 1} failed for ${host}:`, error);
      }
    }

    if (rtts.length === 0) {
      return {
        host,
        rtt: 0,
        distance: 0,
        timestamp: new Date(),
        status: 'timeout',
        packetLoss: 100
      };
    }

    // Calculate average RTT and convert to distance
    const avgRTT = rtts.reduce((a, b) => a + b, 0) / rtts.length;
    const oneWayTime = (avgRTT - this.processingOffset) / 2; // Remove processing delay and get one-way
    const distanceMeters = Math.max((oneWayTime / 1000) * this.speedOfLight, 0);
    const packetLoss = ((trials - successCount) / trials) * 100;

    return {
      host,
      rtt: avgRTT,
      distance: distanceMeters,
      timestamp: new Date(),
      status: 'success',
      packetLoss
    };
  }

  /**
   * Perform a single ping measurement
   */
  private async performPing(host: string): Promise<number | null> {
    try {
      // Use system ping command for accurate RTT measurement
      const { stdout } = await execAsync(`ping -c 1 -W 3000 ${host}`);
      
      // Parse RTT from ping output
      const rttMatch = stdout.match(/time=([0-9.]+)/);
      if (rttMatch) {
        return parseFloat(rttMatch[1]);
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Measure multiple hosts simultaneously
   */
  async measureMultipleHosts(hosts: string[]): Promise<PingMeasurement[]> {
    const measurements = await Promise.all(
      hosts.map(host => this.measurePingDistance(host))
    );
    
    return measurements;
  }

  /**
   * Convert RTT measurements to distance for WiFi devices
   */
  convertRTTToDistance(rtt: number): number {
    const oneWayTime = (rtt - this.processingOffset) / 2;
    return Math.max((oneWayTime / 1000) * this.speedOfLight, 0);
  }

  /**
   * Process probe data from mobile devices
   */
  processProbeData(probeData: ProbeData): {
    rttMeasurements: RTTMeasurement[];
    pingMeasurements: PingMeasurement[];
  } {
    const rttMeasurements: RTTMeasurement[] = [];
    const pingMeasurements: PingMeasurement[] = [];

    // Process RTT data (device-to-device)
    for (const [mac, rtt] of Object.entries(probeData.rtt)) {
      rttMeasurements.push({
        mac,
        rtt,
        distance: this.convertRTTToDistance(rtt),
        timestamp: probeData.timestamp,
        signalStrength: -50 // Default, should be provided with probe data
      });
    }

    // Process ping data (device-to-AP)
    for (const [host, distance] of Object.entries(probeData.ping)) {
      pingMeasurements.push({
        host,
        rtt: 0, // Not directly provided in ping distances
        distance,
        timestamp: probeData.timestamp,
        status: 'success',
        packetLoss: 0
      });
    }

    return { rttMeasurements, pingMeasurements };
  }

  /**
   * Start calibration phase - collect data at known waypoints
   */
  startCalibration(): void {
    this.isCalibrating = true;
    this.calibrationData = [];
    console.log('[Active Ping] Starting calibration phase...');
  }

  /**
   * Add calibration point with known position
   */
  addCalibrationPoint(
    x: number, 
    y: number, 
    csiFeatures: number[], 
    rttValues: number[], 
    pingDistances: number[]
  ): void {
    if (!this.isCalibrating) {
      console.warn('[Active Ping] Not in calibration mode');
      return;
    }

    this.calibrationData.push({
      x,
      y,
      csiFeatures,
      rttValues,
      pingDistances,
      timestamp: new Date()
    });

    console.log(`[Active Ping] Added calibration point (${x}, ${y}) - Total points: ${this.calibrationData.length}`);
  }

  /**
   * Complete calibration and prepare for live positioning
   */
  completeCalibration(): CalibrationPoint[] {
    this.isCalibrating = false;
    console.log(`[Active Ping] Calibration complete with ${this.calibrationData.length} points`);
    return this.calibrationData;
  }

  /**
   * Create combined feature vector for ML positioning
   */
  createFeatureVector(
    csiFeatures: number[], 
    rttValues: number[], 
    pingDistances: number[]
  ): number[] {
    return [
      ...csiFeatures,
      ...rttValues,
      ...pingDistances
    ];
  }

  /**
   * Weighted fusion of different ranging methods
   */
  fuseLocationEstimates(
    csiLocation: { x: number; y: number; confidence: number },
    rttLocation: { x: number; y: number; confidence: number },
    pingLocation: { x: number; y: number; confidence: number },
    weights: { csi: number; rtt: number; ping: number } = { csi: 0.5, rtt: 0.7, ping: 0.3 }
  ): { x: number; y: number; confidence: number } {
    const totalWeight = weights.csi + weights.rtt + weights.ping;
    
    const fusedX = (
      csiLocation.x * weights.csi + 
      rttLocation.x * weights.rtt + 
      pingLocation.x * weights.ping
    ) / totalWeight;
    
    const fusedY = (
      csiLocation.y * weights.csi + 
      rttLocation.y * weights.rtt + 
      pingLocation.y * weights.ping
    ) / totalWeight;
    
    // Weighted average of confidences
    const fusedConfidence = (
      csiLocation.confidence * weights.csi + 
      rttLocation.confidence * weights.rtt + 
      pingLocation.confidence * weights.ping
    ) / totalWeight;

    return {
      x: fusedX,
      y: fusedY,
      confidence: fusedConfidence
    };
  }

  /**
   * Start periodic probing for live positioning
   */
  startLiveProbing(hosts: string[], intervalMs: number = 30000): void {
    if (this.probeInterval) {
      clearInterval(this.probeInterval);
    }

    console.log(`[Active Ping] Starting live probing every ${intervalMs}ms for hosts:`, hosts);
    
    this.probeInterval = setInterval(async () => {
      try {
        const measurements = await this.measureMultipleHosts(hosts);
        
        // Emit measurements for processing
        this.onProbeResults(measurements);
        
      } catch (error) {
        console.error('[Active Ping] Live probing error:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop live probing
   */
  stopLiveProbing(): void {
    if (this.probeInterval) {
      clearInterval(this.probeInterval);
      this.probeInterval = undefined;
      console.log('[Active Ping] Stopped live probing');
    }
  }

  /**
   * Handle probe results (override in implementation)
   */
  protected onProbeResults(measurements: PingMeasurement[]): void {
    console.log('[Active Ping] Probe results:', measurements.map(m => 
      `${m.host}: ${m.distance.toFixed(1)}m (${m.rtt.toFixed(1)}ms)`
    ));
  }

  /**
   * Get calibration statistics
   */
  getCalibrationStats(): {
    pointCount: number;
    averageRTT: number;
    averageDistance: number;
    coverage: { minX: number; maxX: number; minY: number; maxY: number };
  } {
    if (this.calibrationData.length === 0) {
      return {
        pointCount: 0,
        averageRTT: 0,
        averageDistance: 0,
        coverage: { minX: 0, maxX: 0, minY: 0, maxY: 0 }
      };
    }

    const allRTTs = this.calibrationData.flatMap(point => point.rttValues);
    const allDistances = this.calibrationData.flatMap(point => point.pingDistances);
    
    const xs = this.calibrationData.map(p => p.x);
    const ys = this.calibrationData.map(p => p.y);

    return {
      pointCount: this.calibrationData.length,
      averageRTT: allRTTs.reduce((a, b) => a + b, 0) / allRTTs.length,
      averageDistance: allDistances.reduce((a, b) => a + b, 0) / allDistances.length,
      coverage: {
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys)
      }
    };
  }

  /**
   * Validate measurement quality
   */
  validateMeasurement(measurement: PingMeasurement): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    
    if (measurement.rtt > 1000) {
      issues.push('RTT too high (>1000ms)');
    }
    
    if (measurement.distance > 1000) {
      issues.push('Distance unrealistic (>1000m)');
    }
    
    if (measurement.packetLoss > 50) {
      issues.push('High packet loss (>50%)');
    }
    
    if (measurement.status !== 'success') {
      issues.push(`Measurement failed: ${measurement.status}`);
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Set processing offset for RTT calculations
   */
  setProcessingOffset(offsetMs: number): void {
    this.processingOffset = offsetMs;
    console.log(`[Active Ping] Updated processing offset to ${offsetMs}ms`);
  }

  /**
   * Get current configuration
   */
  getConfiguration(): {
    processingOffset: number;
    speedOfLight: number;
    isCalibrating: boolean;
    calibrationPoints: number;
    isProbing: boolean;
  } {
    return {
      processingOffset: this.processingOffset,
      speedOfLight: this.speedOfLight,
      isCalibrating: this.isCalibrating,
      calibrationPoints: this.calibrationData.length,
      isProbing: this.probeInterval !== undefined
    };
  }
}

export const activePingProbing = new ActivePingProbing();