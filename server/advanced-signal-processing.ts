import { Device, DeviceTelemetry } from '../shared/schema';
import { storage } from './storage';

export interface CSIData {
  amplitude: number[];
  phase: number[];
  timestamp: Date;
  frequency: number;
  antennaCount: number;
}

export interface FingerprintDatabase {
  points: Map<string, LocationFingerprint>;
  pathLossModel: PathLossModel;
  environmentalFactors: EnvironmentalModel;
}

export interface LocationFingerprint {
  location: { x: number; y: number };
  rssiReadings: Map<string, number[]>; // deviceMac -> multiple readings
  csiData?: CSIData[];
  roomId?: number;
  confidence: number;
  measurementCount: number;
  timestamp: Date;
}

export interface PathLossModel {
  pathLossExponent: number; // n in log-distance model
  referenceDistance: number; // d0 (usually 1 meter)
  referencePower: number; // P(d0) at reference distance
  shadowingVariance: number; // σ for log-normal shadowing
  roomSpecificExponents: Map<number, number>;
}

export interface EnvironmentalModel {
  baselineRSSI: Map<string, number>; // deviceMac -> baseline
  adaptiveThresholds: Map<string, AdaptiveThreshold>;
  obstacleMap: ObstacleMap;
  seasonalFactors: SeasonalFactors;
}

export interface AdaptiveThreshold {
  mean: number;
  variance: number;
  sampleCount: number;
  lastUpdate: Date;
  alpha: number; // exponential smoothing factor
}

export interface ObstacleMap {
  walls: Wall[];
  rooms: Room[];
  powerOutlets: PowerOutlet[];
  networkDrops: NetworkDrop[];
}

export interface Wall {
  start: { x: number; y: number };
  end: { x: number; y: number };
  thickness: number;
  material: 'drywall' | 'concrete' | 'brick' | 'glass' | 'metal';
  attenuationFactor: number;
}

export interface Room {
  id: number;
  boundary: { x: number; y: number }[];
  type: 'living_room' | 'bedroom' | 'kitchen' | 'bathroom' | 'office' | 'hallway';
  pathLossExponent: number;
}

export interface PowerOutlet {
  location: { x: number; y: number };
  isAvailable: boolean;
  voltage: number;
}

export interface NetworkDrop {
  location: { x: number; y: number };
  isEthernet: boolean;
  isActive: boolean;
}

export interface SeasonalFactors {
  temperatureCoefficient: number;
  humidityCoefficient: number;
  timeOfDayFactors: Map<number, number>; // hour -> factor
  dayOfWeekFactors: Map<number, number>; // day -> factor
}

export class AdvancedSignalProcessor {
  private fingerprintDB: FingerprintDatabase;
  private pathLossModel: PathLossModel;
  private environmentalModel: EnvironmentalModel;
  
  constructor() {
    this.fingerprintDB = {
      points: new Map(),
      pathLossModel: this.initializePathLossModel(),
      environmentalFactors: this.initializeEnvironmentalModel()
    };
    this.pathLossModel = this.fingerprintDB.pathLossModel;
    this.environmentalModel = this.fingerprintDB.environmentalFactors;
  }

  private initializePathLossModel(): PathLossModel {
    return {
      pathLossExponent: 2.0, // Free space default, will be calibrated
      referenceDistance: 1.0,
      referencePower: -30, // dBm at 1 meter
      shadowingVariance: 4.0, // dB
      roomSpecificExponents: new Map([
        [1, 2.2], // Living room - more furniture
        [2, 1.8], // Bedroom - less obstruction
        [3, 2.5], // Kitchen - metal appliances
        [4, 2.8], // Bathroom - tile/water
        [5, 1.9], // Office - open space
        [6, 3.0]  // Hallway - multiple walls
      ])
    };
  }

  private initializeEnvironmentalModel(): EnvironmentalModel {
    return {
      baselineRSSI: new Map(),
      adaptiveThresholds: new Map(),
      obstacleMap: {
        walls: [],
        rooms: [],
        powerOutlets: [],
        networkDrops: []
      },
      seasonalFactors: {
        temperatureCoefficient: 0.1, // dB per degree C
        humidityCoefficient: 0.05, // dB per % humidity
        timeOfDayFactors: new Map([
          [6, 1.0], [12, 0.95], [18, 1.05], [22, 1.1] // Morning/evening interference
        ]),
        dayOfWeekFactors: new Map([
          [1, 1.0], [2, 1.0], [3, 1.0], [4, 1.0], [5, 1.0], [6, 1.1], [0, 1.1] // Weekend interference
        ])
      }
    };
  }

  /**
   * Enhanced RSSI-to-distance conversion using room-specific path loss models
   */
  public rssiToDistance(rssi: number, deviceMac: string, roomId?: number): number {
    const device = this.getDeviceByMac(deviceMac);
    if (!device) return 0;

    // Get room-specific path loss exponent
    const pathLossExponent = roomId ? 
      (this.pathLossModel.roomSpecificExponents.get(roomId) || this.pathLossModel.pathLossExponent) :
      this.pathLossModel.pathLossExponent;

    // Enhanced log-distance path loss model: RSSI = P(d0) - 10*n*log10(d/d0) - X_σ
    // Rearranged: d = d0 * 10^((P(d0) - RSSI - X_σ) / (10*n))
    
    const shadowingCorrection = this.getShadowingCorrection(deviceMac);
    const environmentalCorrection = this.getEnvironmentalCorrection(deviceMac);
    
    const correctedRSSI = rssi + shadowingCorrection + environmentalCorrection;
    const pathLoss = this.pathLossModel.referencePower - correctedRSSI;
    const distance = this.pathLossModel.referenceDistance * 
      Math.pow(10, pathLoss / (10 * pathLossExponent));

    return Math.max(0.1, Math.min(100, distance)); // Clamp to reasonable range
  }

  /**
   * Advanced triangulation using weighted least squares with uncertainty quantification
   */
  public triangulatePosition(deviceMac: string, rssiReadings: Map<string, number>): {
    position: { x: number; y: number };
    uncertainty: number;
    confidence: number;
  } {
    const anchors = this.getAnchorDevices();
    if (anchors.length < 3) {
      return { position: { x: 0, y: 0 }, uncertainty: 100, confidence: 0.1 };
    }

    // Convert RSSI to distances with uncertainty
    const measurements: Array<{
      anchor: { x: number; y: number };
      distance: number;
      uncertainty: number;
      weight: number;
    }> = [];

    for (const [anchorMac, rssi] of rssiReadings) {
      const anchor = anchors.find(a => a.macAddress === anchorMac);
      if (!anchor || !anchor.x || !anchor.y) continue;

      const distance = this.rssiToDistance(rssi, deviceMac);
      const uncertainty = this.calculateDistanceUncertainty(rssi, deviceMac);
      const weight = 1 / (uncertainty * uncertainty); // Inverse variance weighting

      measurements.push({
        anchor: { x: anchor.x, y: anchor.y },
        distance,
        uncertainty,
        weight
      });
    }

    if (measurements.length < 3) {
      return { position: { x: 0, y: 0 }, uncertainty: 100, confidence: 0.1 };
    }

    // Weighted least squares trilateration
    const result = this.weightedLeastSquaresTrilateration(measurements);
    
    return result;
  }

  private weightedLeastSquaresTrilateration(measurements: Array<{
    anchor: { x: number; y: number };
    distance: number;
    uncertainty: number;
    weight: number;
  }>): { position: { x: number; y: number }; uncertainty: number; confidence: number } {
    
    // Initial guess using centroid
    let x = measurements.reduce((sum, m) => sum + m.anchor.x, 0) / measurements.length;
    let y = measurements.reduce((sum, m) => sum + m.anchor.y, 0) / measurements.length;

    // Gauss-Newton iteration for weighted least squares
    for (let iter = 0; iter < 10; iter++) {
      let A: number[][] = [];
      let b: number[] = [];
      let W: number[][] = [];

      for (let i = 0; i < measurements.length; i++) {
        const m = measurements[i];
        const dx = x - m.anchor.x;
        const dy = y - m.anchor.y;
        const currentDist = Math.sqrt(dx*dx + dy*dy);
        
        if (currentDist < 0.1) continue; // Avoid division by zero

        // Jacobian elements
        const jx = dx / currentDist;
        const jy = dy / currentDist;
        
        A.push([jx, jy]);
        b.push(m.distance - currentDist);
        
        // Weight matrix (diagonal)
        const row = new Array(measurements.length).fill(0);
        row[i] = m.weight;
        W.push(row);
      }

      if (A.length < 2) break;

      // Solve (A^T * W * A) * delta = A^T * W * b
      const delta = this.solveWeightedLeastSquares(A, b, W);
      
      if (!delta || (Math.abs(delta[0]) < 1e-6 && Math.abs(delta[1]) < 1e-6)) {
        break; // Converged
      }

      x += delta[0];
      y += delta[1];
    }

    // Calculate uncertainty using covariance matrix
    const uncertainty = this.calculatePositionUncertainty(measurements, { x, y });
    const confidence = this.calculateTriangulationConfidence(measurements, { x, y });

    return {
      position: { x, y },
      uncertainty,
      confidence
    };
  }

  private solveWeightedLeastSquares(A: number[][], b: number[], W: number[][]): number[] | null {
    // Simplified 2x2 case for position estimation
    if (A.length < 2 || A[0].length !== 2) return null;

    try {
      // A^T * W * A
      let AtWA = [[0, 0], [0, 0]];
      let AtWb = [0, 0];

      for (let i = 0; i < A.length; i++) {
        const weight = W[i][i] || 1;
        
        // A^T * W * A
        AtWA[0][0] += A[i][0] * A[i][0] * weight;
        AtWA[0][1] += A[i][0] * A[i][1] * weight;
        AtWA[1][0] += A[i][1] * A[i][0] * weight;
        AtWA[1][1] += A[i][1] * A[i][1] * weight;
        
        // A^T * W * b
        AtWb[0] += A[i][0] * b[i] * weight;
        AtWb[1] += A[i][1] * b[i] * weight;
      }

      // Solve 2x2 system
      const det = AtWA[0][0] * AtWA[1][1] - AtWA[0][1] * AtWA[1][0];
      if (Math.abs(det) < 1e-10) return null;

      const invDet = 1 / det;
      return [
        invDet * (AtWA[1][1] * AtWb[0] - AtWA[0][1] * AtWb[1]),
        invDet * (AtWA[0][0] * AtWb[1] - AtWA[1][0] * AtWb[0])
      ];
    } catch (error) {
      return null;
    }
  }

  /**
   * Build fingerprint database through calibration walks
   */
  public async addFingerprintPoint(
    location: { x: number; y: number },
    rssiReadings: Map<string, number>,
    roomId?: number
  ): Promise<void> {
    const key = `${location.x},${location.y}`;
    
    let fingerprint = this.fingerprintDB.points.get(key);
    if (!fingerprint) {
      fingerprint = {
        location,
        rssiReadings: new Map(),
        roomId,
        confidence: 0,
        measurementCount: 0,
        timestamp: new Date()
      };
    }

    // Accumulate RSSI readings for statistical analysis
    for (const [deviceMac, rssi] of rssiReadings) {
      if (!fingerprint.rssiReadings.has(deviceMac)) {
        fingerprint.rssiReadings.set(deviceMac, []);
      }
      fingerprint.rssiReadings.get(deviceMac)!.push(rssi);
    }

    fingerprint.measurementCount++;
    fingerprint.confidence = Math.min(0.95, fingerprint.measurementCount / 10);
    fingerprint.timestamp = new Date();

    this.fingerprintDB.points.set(key, fingerprint);
    
    // Update path loss model with new data
    this.updatePathLossModel();
  }

  /**
   * K-NN fingerprint matching for improved location estimation
   */
  public findLocationByFingerprint(
    rssiReadings: Map<string, number>,
    k: number = 5
  ): { location: { x: number; y: number }; confidence: number } {
    
    const candidates: Array<{
      fingerprint: LocationFingerprint;
      similarity: number;
      distance: number;
    }> = [];

    // Calculate similarity with all fingerprint points
    for (const [key, fingerprint] of this.fingerprintDB.points) {
      const similarity = this.calculateRSSISimilarity(rssiReadings, fingerprint.rssiReadings);
      const euclideanDist = this.calculateFingerprintDistance(rssiReadings, fingerprint.rssiReadings);
      
      candidates.push({
        fingerprint,
        similarity,
        distance: euclideanDist
      });
    }

    if (candidates.length === 0) {
      return { location: { x: 0, y: 0 }, confidence: 0 };
    }

    // Sort by similarity (descending) and take top k
    candidates.sort((a, b) => b.similarity - a.similarity);
    const topK = candidates.slice(0, Math.min(k, candidates.length));

    // Weighted average of top k locations
    let totalWeight = 0;
    let weightedX = 0;
    let weightedY = 0;
    let avgConfidence = 0;

    for (const candidate of topK) {
      const weight = candidate.similarity;
      totalWeight += weight;
      weightedX += candidate.fingerprint.location.x * weight;
      weightedY += candidate.fingerprint.location.y * weight;
      avgConfidence += candidate.fingerprint.confidence * weight;
    }

    if (totalWeight === 0) {
      return { location: { x: 0, y: 0 }, confidence: 0 };
    }

    return {
      location: {
        x: weightedX / totalWeight,
        y: weightedY / totalWeight
      },
      confidence: avgConfidence / totalWeight
    };
  }

  /**
   * Update adaptive thresholds using exponential smoothing
   */
  public updateAdaptiveThreshold(deviceMac: string, rssi: number): void {
    let threshold = this.environmentalModel.adaptiveThresholds.get(deviceMac);
    
    if (!threshold) {
      threshold = {
        mean: rssi,
        variance: 4.0, // Initial variance
        sampleCount: 1,
        lastUpdate: new Date(),
        alpha: 0.1 // Smoothing factor
      };
    } else {
      // Exponential smoothing
      const alpha = threshold.alpha;
      const oldMean = threshold.mean;
      
      threshold.mean = alpha * rssi + (1 - alpha) * oldMean;
      threshold.variance = alpha * Math.pow(rssi - threshold.mean, 2) + 
                          (1 - alpha) * threshold.variance;
      threshold.sampleCount++;
      threshold.lastUpdate = new Date();
      
      // Adapt alpha based on sample count (more samples = less adaptation)
      threshold.alpha = Math.max(0.01, 0.1 / Math.sqrt(threshold.sampleCount));
    }

    this.environmentalModel.adaptiveThresholds.set(deviceMac, threshold);
  }

  /**
   * Intelligent placement recommendation considering realistic constraints
   */
  public recommendExtenderPlacement(
    floorplanBounds: { width: number; height: number },
    existingDevices: Device[],
    gridResolution: number = 20
  ): Array<{
    location: { x: number; y: number };
    coverageImprovement: number;
    feasibilityScore: number;
    constraints: string[];
  }> {
    const recommendations: Array<{
      location: { x: number; y: number };
      coverageImprovement: number;
      feasibilityScore: number;
      constraints: string[];
    }> = [];

    // Generate candidate locations near power outlets and network drops
    const candidates = this.generateSmartCandidateLocations(floorplanBounds, gridResolution);

    for (const candidate of candidates) {
      const coverageImprovement = this.calculateCoverageImprovement(
        candidate, existingDevices, floorplanBounds
      );
      
      const feasibilityScore = this.calculateFeasibilityScore(candidate);
      const constraints = this.identifyPlacementConstraints(candidate);

      if (coverageImprovement > 0.1 && feasibilityScore > 0.3) {
        recommendations.push({
          location: candidate,
          coverageImprovement,
          feasibilityScore,
          constraints
        });
      }
    }

    // Sort by combined score (coverage improvement × feasibility)
    recommendations.sort((a, b) => 
      (b.coverageImprovement * b.feasibilityScore) - 
      (a.coverageImprovement * a.feasibilityScore)
    );

    return recommendations.slice(0, 5); // Top 5 recommendations
  }

  // Helper methods
  private getDeviceByMac(macAddress: string): Device | null {
    // This would integrate with storage to get device by MAC
    return null; // Placeholder
  }

  private getAnchorDevices(): Device[] {
    // Return devices that can serve as anchors for triangulation
    return []; // Placeholder
  }

  private getShadowingCorrection(deviceMac: string): number {
    // Apply shadowing correction based on environment
    return 0; // Placeholder
  }

  private getEnvironmentalCorrection(deviceMac: string): number {
    const threshold = this.environmentalModel.adaptiveThresholds.get(deviceMac);
    if (!threshold) return 0;

    const timeOfDay = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    
    const timeCorrection = this.environmentalModel.seasonalFactors.timeOfDayFactors.get(timeOfDay) || 1.0;
    const dayCorrection = this.environmentalModel.seasonalFactors.dayOfWeekFactors.get(dayOfWeek) || 1.0;
    
    return (timeCorrection * dayCorrection - 1) * 3; // Convert to dB
  }

  private calculateDistanceUncertainty(rssi: number, deviceMac: string): number {
    const threshold = this.environmentalModel.adaptiveThresholds.get(deviceMac);
    const baseUncertainty = 2.0; // meters
    
    if (!threshold) return baseUncertainty;
    
    // Uncertainty increases with RSSI variance
    const rssiUncertainty = Math.sqrt(threshold.variance) / 10; // Convert dB to meters roughly
    return baseUncertainty + rssiUncertainty;
  }

  private calculatePositionUncertainty(measurements: any[], position: { x: number; y: number }): number {
    // Calculate position uncertainty based on measurement geometry and quality
    let avgUncertainty = 0;
    
    for (const m of measurements) {
      const dist = Math.sqrt(
        Math.pow(position.x - m.anchor.x, 2) + 
        Math.pow(position.y - m.anchor.y, 2)
      );
      avgUncertainty += m.uncertainty * (1 + dist / 10); // Distance degradation
    }
    
    return measurements.length > 0 ? avgUncertainty / measurements.length : 10;
  }

  private calculateTriangulationConfidence(measurements: any[], position: { x: number; y: number }): number {
    // Confidence based on measurement quality and geometric dilution of precision
    if (measurements.length < 3) return 0.1;
    
    let totalWeight = 0;
    for (const m of measurements) {
      totalWeight += m.weight;
    }
    
    const avgWeight = totalWeight / measurements.length;
    const geometryFactor = this.calculateGeometryFactor(measurements);
    
    return Math.min(0.95, avgWeight * geometryFactor / 100);
  }

  private calculateGeometryFactor(measurements: any[]): number {
    // Calculate geometric dilution of precision
    if (measurements.length < 3) return 0.1;
    
    // Simplified: measure spread of anchor points
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const m of measurements) {
      minX = Math.min(minX, m.anchor.x);
      maxX = Math.max(maxX, m.anchor.x);
      minY = Math.min(minY, m.anchor.y);
      maxY = Math.max(maxY, m.anchor.y);
    }
    
    const spread = Math.sqrt(Math.pow(maxX - minX, 2) + Math.pow(maxY - minY, 2));
    return Math.min(1.0, spread / 100); // Normalize to 0-1
  }

  private updatePathLossModel(): void {
    // Update path loss model parameters based on accumulated fingerprint data
    // This would involve regression analysis of distance vs RSSI data
  }

  private calculateRSSISimilarity(
    readings1: Map<string, number>, 
    readings2: Map<string, number[]>
  ): number {
    let similarity = 0;
    let commonDevices = 0;

    for (const [deviceMac, rssi1] of readings1) {
      const rssiList2 = readings2.get(deviceMac);
      if (rssiList2 && rssiList2.length > 0) {
        const avgRssi2 = rssiList2.reduce((sum, val) => sum + val, 0) / rssiList2.length;
        const diff = Math.abs(rssi1 - avgRssi2);
        similarity += Math.exp(-diff / 10); // Exponential similarity
        commonDevices++;
      }
    }

    return commonDevices > 0 ? similarity / commonDevices : 0;
  }

  private calculateFingerprintDistance(
    readings1: Map<string, number>, 
    readings2: Map<string, number[]>
  ): number {
    let sumSquares = 0;
    let commonDevices = 0;

    for (const [deviceMac, rssi1] of readings1) {
      const rssiList2 = readings2.get(deviceMac);
      if (rssiList2 && rssiList2.length > 0) {
        const avgRssi2 = rssiList2.reduce((sum, val) => sum + val, 0) / rssiList2.length;
        sumSquares += Math.pow(rssi1 - avgRssi2, 2);
        commonDevices++;
      }
    }

    return commonDevices > 0 ? Math.sqrt(sumSquares / commonDevices) : Infinity;
  }

  private generateSmartCandidateLocations(
    bounds: { width: number; height: number }, 
    resolution: number
  ): { x: number; y: number }[] {
    const candidates: { x: number; y: number }[] = [];
    
    // Generate grid points near power outlets and network drops
    for (const outlet of this.environmentalModel.obstacleMap.powerOutlets) {
      if (outlet.isAvailable) {
        // Add points in a small radius around power outlets
        for (let dx = -resolution; dx <= resolution; dx += resolution/2) {
          for (let dy = -resolution; dy <= resolution; dy += resolution/2) {
            const x = outlet.location.x + dx;
            const y = outlet.location.y + dy;
            
            if (x >= 0 && x <= bounds.width && y >= 0 && y <= bounds.height) {
              candidates.push({ x, y });
            }
          }
        }
      }
    }

    // Add network drop locations
    for (const drop of this.environmentalModel.obstacleMap.networkDrops) {
      if (drop.isActive) {
        candidates.push(drop.location);
      }
    }

    // If no specific locations, fall back to filtered grid
    if (candidates.length === 0) {
      for (let x = resolution; x < bounds.width; x += resolution) {
        for (let y = resolution; y < bounds.height; y += resolution) {
          // Avoid walls and other obstacles
          if (!this.isLocationBlocked({ x, y })) {
            candidates.push({ x, y });
          }
        }
      }
    }

    return candidates;
  }

  private calculateCoverageImprovement(
    candidate: { x: number; y: number },
    existingDevices: Device[],
    bounds: { width: number; height: number }
  ): number {
    // Calculate coverage improvement if extender placed at candidate location
    // This would involve detailed coverage simulation
    return Math.random() * 0.5; // Placeholder
  }

  private calculateFeasibilityScore(candidate: { x: number; y: number }): number {
    let score = 1.0;
    
    // Check proximity to power outlets
    let nearPowerOutlet = false;
    for (const outlet of this.environmentalModel.obstacleMap.powerOutlets) {
      const distance = Math.sqrt(
        Math.pow(candidate.x - outlet.location.x, 2) + 
        Math.pow(candidate.y - outlet.location.y, 2)
      );
      if (distance < 50 && outlet.isAvailable) { // Within 50 units
        nearPowerOutlet = true;
        break;
      }
    }
    
    if (!nearPowerOutlet) score *= 0.3;
    
    // Check for wall interference
    if (this.isLocationBlocked(candidate)) score *= 0.1;
    
    return score;
  }

  private identifyPlacementConstraints(candidate: { x: number; y: number }): string[] {
    const constraints: string[] = [];
    
    // Check power outlet proximity
    let nearPowerOutlet = false;
    for (const outlet of this.environmentalModel.obstacleMap.powerOutlets) {
      const distance = Math.sqrt(
        Math.pow(candidate.x - outlet.location.x, 2) + 
        Math.pow(candidate.y - outlet.location.y, 2)
      );
      if (distance < 50 && outlet.isAvailable) {
        nearPowerOutlet = true;
        break;
      }
    }
    
    if (!nearPowerOutlet) {
      constraints.push('No power outlet within range');
    }
    
    // Check wall proximity
    for (const wall of this.environmentalModel.obstacleMap.walls) {
      if (this.isPointNearWall(candidate, wall, 20)) {
        constraints.push(`Near ${wall.material} wall (${wall.attenuationFactor}dB loss)`);
      }
    }
    
    return constraints;
  }

  private isLocationBlocked(location: { x: number; y: number }): boolean {
    // Check if location intersects with walls or other obstacles
    for (const wall of this.environmentalModel.obstacleMap.walls) {
      if (this.isPointOnWall(location, wall)) {
        return true;
      }
    }
    return false;
  }

  private isPointNearWall(
    point: { x: number; y: number }, 
    wall: Wall, 
    threshold: number
  ): boolean {
    const distance = this.distanceToLineSegment(point, wall.start, wall.end);
    return distance < threshold;
  }

  private isPointOnWall(point: { x: number; y: number }, wall: Wall): boolean {
    const distance = this.distanceToLineSegment(point, wall.start, wall.end);
    return distance < wall.thickness / 2;
  }

  private distanceToLineSegment(
    point: { x: number; y: number },
    lineStart: { x: number; y: number },
    lineEnd: { x: number; y: number }
  ): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) {
      return Math.sqrt(A * A + B * B);
    }

    let param = dot / lenSq;
    param = Math.max(0, Math.min(1, param));

    const xx = lineStart.x + param * C;
    const yy = lineStart.y + param * D;

    const dx = point.x - xx;
    const dy = point.y - yy;

    return Math.sqrt(dx * dx + dy * dy);
  }
}

export const advancedSignalProcessor = new AdvancedSignalProcessor();