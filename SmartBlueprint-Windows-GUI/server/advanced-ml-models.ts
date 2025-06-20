import { Device, DeviceTelemetry } from '@shared/schema';

// Advanced ML Model Interfaces
export interface LSTMAutoencoder {
  sequenceLength: number;
  hiddenDim: number;
  encodingDim: number;
  reconstructionThreshold: number;
  weights: number[][];
  biases: number[];
  trainedOn: Date;
  accuracy: number;
}

export interface IsolationForest {
  numTrees: number;
  maxSamples: number;
  trees: IsolationTree[];
  anomalyThreshold: number;
  featureNames: string[];
}

export interface IsolationTree {
  splitFeature: number;
  splitValue: number;
  left?: IsolationTree;
  right?: IsolationTree;
  pathLength: number;
  isLeaf: boolean;
}

export interface EnsembleAnomalyDetector {
  models: {
    statistical: StatisticalAnomalyDetector;
    isolation: IsolationForest;
    lstm: LSTMAutoencoder;
  };
  weights: { statistical: number; isolation: number; lstm: number };
  votingThreshold: number;
}

export interface StatisticalAnomalyDetector {
  zScoreThreshold: number;
  grubbs: {
    critical: number;
    alpha: 0.05;
  };
  seasonalDecomposition: {
    period: number;
    trend: number[];
    seasonal: number[];
    residual: number[];
  };
}

export interface LocationFingerprint {
  location: { x: number; y: number };
  signalPattern: Map<string, number>;
  signalVariance: Map<string, number>;
  roomId?: number;
  confidence: number;
  timestamp: Date;
  environmentalFactors: {
    temperature?: number;
    humidity?: number;
    timeOfDay: number;
    dayOfWeek: number;
  };
  measurements: number;
  spatialCluster?: number;
}

export interface AnomalyDetectionResult {
  deviceId: number;
  anomalyType: 'signal_drop' | 'device_offline' | 'performance_degradation' | 'unusual_pattern' | 'location_drift' | 'interference_spike' | 'temporal_anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  recommendedAction?: string;
  detectionMethod: 'statistical' | 'lstm_autoencoder' | 'isolation_forest' | 'ensemble';
  anomalyScore: number;
  baseline: {
    mean: number;
    variance: number;
    threshold: number;
  };
  contextualFactors: string[];
  timestamp: Date;
  features: number[];
}

export interface SignalPattern {
  deviceMac: string;
  rssiHistory: number[];
  timestamps: Date[];
  location: { x: number; y: number };
  features: number[];
  normalizedFeatures: number[];
}

export interface TemporalSequence {
  deviceId: number;
  sequences: number[][];
  labels: number[];
  lastUpdate: Date;
  windowSize: number;
}

/**
 * Advanced Location Fingerprinting Engine
 * Uses ensemble methods with Kalman filtering and Gaussian processes
 */
export class AdvancedLocationEngine {
  private fingerprints: Map<string, LocationFingerprint[]> = new Map();
  private kalmanFilters: Map<number, KalmanFilter> = new Map();
  private spatialClusters: SpatialCluster[] = [];
  
  constructor() {
    this.initializeSpatialClustering();
  }

  /**
   * Ensemble location prediction with uncertainty quantification
   */
  async predictLocation(deviceId: number, rssiReadings: Map<string, number>): Promise<{
    location: { x: number; y: number };
    confidence: number;
    uncertainty: number;
    method: string;
  }> {
    const predictions = await Promise.all([
      this.trilaterationPrediction(rssiReadings),
      this.fingerprintMatching(rssiReadings),
      this.gaussianProcessPrediction(rssiReadings),
      this.kalmanFilterPrediction(deviceId, rssiReadings)
    ]);

    // Ensemble voting with uncertainty-weighted averaging
    const weights = predictions.map(p => 1 / (p.uncertainty + 0.001)); // Inverse uncertainty weighting
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    
    const ensembleLocation = {
      x: predictions.reduce((sum, p, i) => sum + p.location.x * weights[i], 0) / totalWeight,
      y: predictions.reduce((sum, p, i) => sum + p.location.y * weights[i], 0) / totalWeight
    };

    const ensembleConfidence = predictions.reduce((sum, p, i) => sum + p.confidence * weights[i], 0) / totalWeight;
    const ensembleUncertainty = Math.sqrt(predictions.reduce((sum, p, i) => sum + Math.pow(p.uncertainty, 2) * weights[i], 0) / totalWeight);

    return {
      location: ensembleLocation,
      confidence: ensembleConfidence,
      uncertainty: ensembleUncertainty,
      method: 'ensemble_weighted_average'
    };
  }

  private async trilaterationPrediction(rssiReadings: Map<string, number>): Promise<{
    location: { x: number; y: number };
    confidence: number;
    uncertainty: number;
  }> {
    // Weighted least squares trilateration with multipath mitigation
    const anchors = Array.from(rssiReadings.entries()).map(([mac, rssi]) => ({
      mac,
      rssi,
      distance: this.rssiToDistance(rssi),
      location: this.getAnchorLocation(mac),
      weight: this.calculateAnchorWeight(rssi)
    })).filter(a => a.location);

    if (anchors.length < 3) {
      return { location: { x: 0, y: 0 }, confidence: 0, uncertainty: 100 };
    }

    // Weighted least squares solution
    const A: number[][] = [];
    const b: number[] = [];
    
    for (let i = 0; i < anchors.length - 1; i++) {
      const x1 = anchors[i].location!.x;
      const y1 = anchors[i].location!.y;
      const r1 = anchors[i].distance;
      
      const x2 = anchors[i + 1].location!.x;
      const y2 = anchors[i + 1].location!.y;
      const r2 = anchors[i + 1].distance;
      
      A.push([2 * (x2 - x1), 2 * (y2 - y1)]);
      b.push(Math.pow(r1, 2) - Math.pow(r2, 2) + Math.pow(x2, 2) - Math.pow(x1, 2) + Math.pow(y2, 2) - Math.pow(y1, 2));
    }

    const solution = this.solveWeightedLeastSquares(A, b, anchors.map(a => a.weight));
    const uncertainty = this.calculateTriangulationUncertainty(anchors, solution);
    
    return {
      location: { x: solution[0] || 0, y: solution[1] || 0 },
      confidence: Math.max(0, 1 - uncertainty / 50), // Scale uncertainty to confidence
      uncertainty
    };
  }

  private async fingerprintMatching(rssiReadings: Map<string, number>): Promise<{
    location: { x: number; y: number };
    confidence: number;
    uncertainty: number;
  }> {
    // K-NN fingerprint matching with weighted distance
    const candidates: Array<{ fingerprint: LocationFingerprint; distance: number }> = [];
    
    for (const fingerprints of this.fingerprints.values()) {
      for (const fp of fingerprints) {
        const distance = this.calculateFingerprintDistance(rssiReadings, fp);
        candidates.push({ fingerprint: fp, distance });
      }
    }

    // Sort by distance and take top K
    candidates.sort((a, b) => a.distance - b.distance);
    const k = Math.min(5, candidates.length);
    const nearestNeighbors = candidates.slice(0, k);

    if (nearestNeighbors.length === 0) {
      return { location: { x: 0, y: 0 }, confidence: 0, uncertainty: 100 };
    }

    // Weighted average of nearest neighbors
    const weights = nearestNeighbors.map(n => 1 / (n.distance + 0.001));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    const location = {
      x: nearestNeighbors.reduce((sum, n, i) => sum + n.fingerprint.location.x * weights[i], 0) / totalWeight,
      y: nearestNeighbors.reduce((sum, n, i) => sum + n.fingerprint.location.y * weights[i], 0) / totalWeight
    };

    const avgConfidence = nearestNeighbors.reduce((sum, n, i) => sum + n.fingerprint.confidence * weights[i], 0) / totalWeight;
    const avgDistance = nearestNeighbors.reduce((sum, n) => sum + n.distance, 0) / nearestNeighbors.length;

    return {
      location,
      confidence: avgConfidence * (1 - Math.min(avgDistance / 20, 0.5)), // Penalty for large distances
      uncertainty: avgDistance
    };
  }

  private async gaussianProcessPrediction(rssiReadings: Map<string, number>): Promise<{
    location: { x: number; y: number };
    confidence: number;
    uncertainty: number;
  }> {
    // Simplified Gaussian Process regression for spatial interpolation
    const observations = Array.from(this.fingerprints.values()).flat();
    
    if (observations.length < 2) {
      return { location: { x: 0, y: 0 }, confidence: 0, uncertainty: 100 };
    }

    // Calculate kernel similarities
    const similarities = observations.map(obs => {
      const similarity = this.rbfKernel(rssiReadings, obs.signalPattern, 10); // gamma = 10
      return { observation: obs, similarity };
    });

    // Sort by similarity
    similarities.sort((a, b) => b.similarity - a.similarity);
    const topSimilar = similarities.slice(0, Math.min(10, similarities.length));

    // Weighted prediction
    const totalSimilarity = topSimilar.reduce((sum, s) => sum + s.similarity, 0);
    
    if (totalSimilarity === 0) {
      return { location: { x: 0, y: 0 }, confidence: 0, uncertainty: 100 };
    }

    const location = {
      x: topSimilar.reduce((sum, s) => sum + s.observation.location.x * s.similarity, 0) / totalSimilarity,
      y: topSimilar.reduce((sum, s) => sum + s.observation.location.y * s.similarity, 0) / totalSimilarity
    };

    const maxSimilarity = Math.max(...topSimilar.map(s => s.similarity));
    const variance = topSimilar.reduce((sum, s) => {
      const dx = s.observation.location.x - location.x;
      const dy = s.observation.location.y - location.y;
      return sum + (dx * dx + dy * dy) * s.similarity;
    }, 0) / totalSimilarity;

    return {
      location,
      confidence: maxSimilarity,
      uncertainty: Math.sqrt(variance)
    };
  }

  private async kalmanFilterPrediction(deviceId: number, rssiReadings: Map<string, number>): Promise<{
    location: { x: number; y: number };
    confidence: number;
    uncertainty: number;
  }> {
    let filter = this.kalmanFilters.get(deviceId);
    
    if (!filter) {
      filter = new KalmanFilter();
      this.kalmanFilters.set(deviceId, filter);
    }

    // Convert RSSI readings to position estimate
    const rawPosition = await this.trilaterationPrediction(rssiReadings);
    
    // Update Kalman filter
    const filteredPosition = filter.update(rawPosition.location);
    
    return {
      location: filteredPosition,
      confidence: rawPosition.confidence * 0.9, // Slightly lower confidence for filtered result
      uncertainty: filter.getUncertainty()
    };
  }

  private initializeSpatialClustering(): void {
    // Initialize spatial clustering for room detection
    this.spatialClusters = [];
  }

  private rssiToDistance(rssi: number): number {
    // Path loss model: d = 10^((Tx - RSSI - A) / (10 * n))
    const txPower = -20; // Typical transmission power
    const pathLossExponent = 2.5; // Indoor environment
    const pathLossConstant = 30;
    
    return Math.pow(10, (txPower - rssi - pathLossConstant) / (10 * pathLossExponent));
  }

  private getAnchorLocation(mac: string): { x: number; y: number } | null {
    // Return known anchor device locations
    // In real implementation, this would query device database
    return null;
  }

  private calculateAnchorWeight(rssi: number): number {
    // Weight based on signal strength and reliability
    return Math.max(0, Math.min(1, (rssi + 100) / 60)); // Normalize -100 to -40 dBm
  }

  private solveWeightedLeastSquares(A: number[][], b: number[], weights: number[]): number[] {
    // Simplified weighted least squares solver
    if (A.length < 2 || A[0].length < 2) return [0, 0];
    
    // For 2x2 system: solve Ax = b
    const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
    if (Math.abs(det) < 1e-10) return [0, 0];
    
    const x = (A[1][1] * b[0] - A[0][1] * b[1]) / det;
    const y = (A[0][0] * b[1] - A[1][0] * b[0]) / det;
    
    return [x, y];
  }

  private calculateTriangulationUncertainty(anchors: any[], solution: number[]): number {
    // Calculate geometric dilution of precision (GDOP)
    let sumSquaredError = 0;
    for (const anchor of anchors) {
      if (anchor.location) {
        const dx = solution[0] - anchor.location.x;
        const dy = solution[1] - anchor.location.y;
        const predictedDistance = Math.sqrt(dx * dx + dy * dy);
        const error = Math.abs(predictedDistance - anchor.distance);
        sumSquaredError += error * error;
      }
    }
    return Math.sqrt(sumSquaredError / anchors.length);
  }

  private calculateFingerprintDistance(rssiReadings: Map<string, number>, fingerprint: LocationFingerprint): number {
    // Euclidean distance in signal space
    let distance = 0;
    let count = 0;
    
    for (const [mac, rssi] of rssiReadings) {
      const fpRssi = fingerprint.signalPattern.get(mac);
      if (fpRssi !== undefined) {
        distance += Math.pow(rssi - fpRssi, 2);
        count++;
      }
    }
    
    return count > 0 ? Math.sqrt(distance / count) : Infinity;
  }

  private rbfKernel(readings1: Map<string, number>, readings2: Map<string, number>, gamma: number): number {
    // RBF (Gaussian) kernel for similarity calculation
    let distance = 0;
    let count = 0;
    
    for (const [mac, rssi1] of readings1) {
      const rssi2 = readings2.get(mac);
      if (rssi2 !== undefined) {
        distance += Math.pow(rssi1 - rssi2, 2);
        count++;
      }
    }
    
    if (count === 0) return 0;
    return Math.exp(-gamma * distance / count);
  }
}

/**
 * Simple Kalman Filter for position tracking
 */
class KalmanFilter {
  private state: number[] = [0, 0]; // [x, y]
  private covariance: number[][] = [[100, 0], [0, 100]]; // Initial uncertainty
  private processNoise = 1.0;
  private measurementNoise = 5.0;

  update(measurement: { x: number; y: number }): { x: number; y: number } {
    // Prediction step (no motion model, static assumption)
    const predictedState = [...this.state];
    const predictedCovariance = this.covariance.map((row, i) => 
      row.map((val, j) => val + (i === j ? this.processNoise : 0))
    );

    // Update step
    const innovation = [measurement.x - predictedState[0], measurement.y - predictedState[1]];
    const innovationCovariance = predictedCovariance.map((row, i) => 
      row.map((val, j) => val + (i === j ? this.measurementNoise : 0))
    );

    // Kalman gain (simplified for 2D) with division-by-zero protection
    const gain = [
      innovationCovariance[0][0] !== 0 ? predictedCovariance[0][0] / innovationCovariance[0][0] : 0,
      innovationCovariance[1][1] !== 0 ? predictedCovariance[1][1] / innovationCovariance[1][1] : 0
    ];

    // Update state and covariance
    this.state = [
      predictedState[0] + gain[0] * innovation[0],
      predictedState[1] + gain[1] * innovation[1]
    ];

    this.covariance = predictedCovariance.map((row, i) => 
      row.map((val, j) => val * (1 - (i === j ? gain[i] : 0)))
    );

    return { x: this.state[0], y: this.state[1] };
  }

  getUncertainty(): number {
    // Return trace of covariance matrix as uncertainty measure
    return Math.sqrt(this.covariance[0][0] + this.covariance[1][1]);
  }
}

interface SpatialCluster {
  id: number;
  center: { x: number; y: number };
  radius: number;
  points: LocationFingerprint[];
}

/**
 * LSTM Autoencoder for Temporal Anomaly Detection
 */
export class LSTMAnomalyDetector {
  private model: LSTMAutoencoder;
  private sequenceBuffer: Map<number, number[]> = new Map();

  constructor(model: LSTMAutoencoder) {
    this.model = model;
  }

  /**
   * Detect temporal anomalies in RSSI sequences
   */
  detectTemporalAnomalies(deviceId: number, rssiValue: number): {
    isAnomaly: boolean;
    anomalyScore: number;
    reconstructionError: number;
  } {
    // Maintain sequence buffer for each device
    if (!this.sequenceBuffer.has(deviceId)) {
      this.sequenceBuffer.set(deviceId, []);
    }

    const sequence = this.sequenceBuffer.get(deviceId)!;
    sequence.push(rssiValue);

    // Keep only the last sequenceLength values
    if (sequence.length > this.model.sequenceLength) {
      sequence.shift();
    }

    // Need full sequence for detection
    if (sequence.length < this.model.sequenceLength) {
      return { isAnomaly: false, anomalyScore: 0, reconstructionError: 0 };
    }

    // Normalize sequence
    const normalizedSequence = this.normalizeSequence(sequence);
    
    // Forward pass through LSTM autoencoder
    const reconstruction = this.forwardPass(normalizedSequence);
    
    // Calculate reconstruction error
    const reconstructionError = this.calculateReconstructionError(normalizedSequence, reconstruction);
    
    // Determine if anomaly
    const isAnomaly = reconstructionError > this.model.reconstructionThreshold;
    const anomalyScore = Math.min(1, reconstructionError / this.model.reconstructionThreshold);

    return { isAnomaly, anomalyScore, reconstructionError };
  }

  private normalizeSequence(sequence: number[]): number[] {
    const mean = sequence.reduce((sum, val) => sum + val, 0) / sequence.length;
    const variance = sequence.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / sequence.length;
    const std = Math.sqrt(variance);
    
    return sequence.map(val => std > 0 ? (val - mean) / std : 0);
  }

  private forwardPass(input: number[]): number[] {
    // Simplified LSTM forward pass
    // In real implementation, this would involve LSTM cells with gates
    const encoded = this.encode(input);
    const decoded = this.decode(encoded);
    return decoded;
  }

  private encode(input: number[]): number[] {
    // Simplified encoding: linear transformation
    const encoded = new Array(this.model.encodingDim).fill(0);
    
    for (let i = 0; i < this.model.encodingDim; i++) {
      for (let j = 0; j < input.length && j < this.model.weights.length; j++) {
        encoded[i] += input[j] * this.model.weights[j][i];
      }
      encoded[i] += this.model.biases[i];
      encoded[i] = Math.tanh(encoded[i]); // Activation function
    }
    
    return encoded;
  }

  private decode(encoded: number[]): number[] {
    // Simplified decoding: reverse linear transformation
    const decoded = new Array(this.model.sequenceLength).fill(0);
    
    for (let i = 0; i < this.model.sequenceLength; i++) {
      for (let j = 0; j < encoded.length && i < this.model.weights.length; j++) {
        decoded[i] += encoded[j] * this.model.weights[i][j];
      }
      decoded[i] = Math.tanh(decoded[i]);
    }
    
    return decoded;
  }

  private calculateReconstructionError(original: number[], reconstruction: number[]): number {
    let error = 0;
    for (let i = 0; i < original.length; i++) {
      error += Math.pow(original[i] - reconstruction[i], 2);
    }
    return Math.sqrt(error / original.length);
  }
}

/**
 * Isolation Forest for Outlier Detection
 */
export class IsolationForestDetector {
  private forest: IsolationForest;

  constructor(forest: IsolationForest) {
    this.forest = forest;
  }

  /**
   * Calculate anomaly score using isolation forest
   */
  calculateAnomalyScore(features: number[]): number {
    let avgPathLength = 0;
    
    for (const tree of this.forest.trees) {
      avgPathLength += this.pathLength(features, tree, 0);
    }
    
    avgPathLength /= this.forest.trees.length;
    
    // Normalize path length to anomaly score
    const expectedPathLength = this.averagePathLength(this.forest.maxSamples);
    const anomalyScore = Math.pow(2, -avgPathLength / expectedPathLength);
    
    return anomalyScore;
  }

  private pathLength(features: number[], tree: IsolationTree, currentDepth: number): number {
    if (tree.isLeaf || !tree.left || !tree.right) {
      return currentDepth + this.averagePathLength(1); // Estimate for remaining path
    }

    if (features[tree.splitFeature] < tree.splitValue) {
      return this.pathLength(features, tree.left, currentDepth + 1);
    } else {
      return this.pathLength(features, tree.right, currentDepth + 1);
    }
  }

  private averagePathLength(n: number): number {
    if (n <= 1) return 0;
    return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n); // Euler's constant
  }

  isAnomaly(features: number[]): boolean {
    return this.calculateAnomalyScore(features) > this.forest.anomalyThreshold;
  }
}