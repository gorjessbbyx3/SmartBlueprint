import { Device } from "@shared/schema";

export interface Point {
  x: number;
  y: number;
}

export interface CoveragePoint extends Point {
  signalStrength: number;
  coveringDevices: Device[];
}

export class MappingAlgorithms {
  // Nearest neighbor algorithm for device positioning
  static nearestNeighborPositioning(
    targetRSSI: number,
    knownDevices: Device[]
  ): Point | null {
    const validDevices = knownDevices.filter(d => d.x && d.y && d.rssi);
    
    if (validDevices.length === 0) return null;

    // Find the device with the closest RSSI match
    let bestMatch = validDevices[0];
    let minDifference = Math.abs(targetRSSI - bestMatch.rssi);

    for (const device of validDevices.slice(1)) {
      const difference = Math.abs(targetRSSI - device.rssi);
      if (difference < minDifference) {
        minDifference = difference;
        bestMatch = device;
      }
    }

    // Estimate position based on RSSI difference and simple path loss model
    const rssiDiff = targetRSSI - bestMatch.rssi;
    const estimatedDistance = Math.abs(rssiDiff) * 2; // Simple scaling factor
    
    // Add some randomness to avoid exact overlap
    const angle = Math.random() * 2 * Math.PI;
    const offsetX = Math.cos(angle) * estimatedDistance;
    const offsetY = Math.sin(angle) * estimatedDistance;

    return {
      x: (bestMatch.x || 0) + offsetX,
      y: (bestMatch.y || 0) + offsetY
    };
  }

  // Trilateration using multiple reference points
  static trilateration(
    rssiMeasurements: { device: Device; rssi: number }[]
  ): Point | null {
    const validMeasurements = rssiMeasurements.filter(
      m => m.device.x && m.device.y
    );

    if (validMeasurements.length < 3) {
      // Fall back to nearest neighbor if insufficient reference points
      const targetRSSI = rssiMeasurements[0]?.rssi || -50;
      return this.nearestNeighborPositioning(
        targetRSSI,
        rssiMeasurements.map(m => m.device)
      );
    }

    // Convert RSSI to estimated distance (simplified path loss model)
    const distances = validMeasurements.map(m => {
      const pathLossExponent = 2.0;
      const referenceDistance = 1.0; // 1 meter
      const referenceRSSI = -30; // RSSI at 1 meter
      
      const distance = referenceDistance * Math.pow(
        10,
        (referenceRSSI - m.rssi) / (10 * pathLossExponent)
      );
      
      return {
        x: m.device.x || 0,
        y: m.device.y || 0,
        distance: Math.max(distance, 0.5) // Minimum distance
      };
    });

    // Least squares trilateration
    const [p1, p2, p3] = distances.slice(0, 3);
    
    const A = 2 * (p2.x - p1.x);
    const B = 2 * (p2.y - p1.y);
    const C = Math.pow(p1.distance, 2) - Math.pow(p2.distance, 2) - 
              Math.pow(p1.x, 2) + Math.pow(p2.x, 2) - 
              Math.pow(p1.y, 2) + Math.pow(p2.y, 2);
    
    const D = 2 * (p3.x - p2.x);
    const E = 2 * (p3.y - p2.y);
    const F = Math.pow(p2.distance, 2) - Math.pow(p3.distance, 2) - 
              Math.pow(p2.x, 2) + Math.pow(p3.x, 2) - 
              Math.pow(p2.y, 2) + Math.pow(p3.y, 2);

    const denominator = A * E - B * D;
    if (Math.abs(denominator) < 0.001) {
      // Fallback to centroid if points are collinear
      return {
        x: distances.reduce((sum, d) => sum + d.x, 0) / distances.length,
        y: distances.reduce((sum, d) => sum + d.y, 0) / distances.length
      };
    }

    const x = (C * E - F * B) / denominator;
    const y = (A * F - D * C) / denominator;

    return { x, y };
  }

  // Coverage analysis using signal propagation model
  static analyzeCoverage(
    devices: Device[],
    areaWidth: number = 800,
    areaHeight: number = 600,
    gridSize: number = 20
  ): {
    coveragePoints: CoveragePoint[];
    overallScore: number;
    weakSpots: Point[];
  } {
    const coveragePoints: CoveragePoint[] = [];
    const weakSpots: Point[] = [];
    let totalPoints = 0;
    let coveredPoints = 0;

    for (let x = 0; x < areaWidth; x += gridSize) {
      for (let y = 0; y < areaHeight; y += gridSize) {
        let maxSignal = -100;
        const coveringDevices: Device[] = [];

        // Calculate signal strength at this point from all devices
        devices.forEach(device => {
          if (device.x && device.y && device.isOnline) {
            const distance = Math.sqrt(
              Math.pow(x - device.x, 2) + Math.pow(y - device.y, 2)
            );
            
            // Simple path loss model: RSSI decreases with distance
            const pathLoss = distance * 0.1; // 0.1 dB per unit distance
            const estimatedRSSI = device.rssi - pathLoss;
            
            if (estimatedRSSI > maxSignal) {
              maxSignal = estimatedRSSI;
            }
            
            if (estimatedRSSI > -70) { // Device contributes to coverage
              coveringDevices.push(device);
            }
          }
        });

        coveragePoints.push({
          x,
          y,
          signalStrength: maxSignal,
          coveringDevices
        });

        totalPoints++;
        
        if (maxSignal > -70) { // Minimum usable signal
          coveredPoints++;
        } else {
          weakSpots.push({ x, y });
        }
      }
    }

    const overallScore = Math.round((coveredPoints / totalPoints) * 100);

    return {
      coveragePoints,
      overallScore,
      weakSpots: weakSpots.slice(0, 10) // Limit to top 10 weak spots
    };
  }

  // Greedy algorithm for optimal device placement
  static greedyPlacementOptimization(
    existingDevices: Device[],
    candidates: Point[],
    deviceType: string = "wifi_extender",
    maxDevices: number = 3
  ): Point[] {
    const recommendations: Point[] = [];
    let currentDevices = [...existingDevices];

    for (let i = 0; i < maxDevices; i++) {
      let bestCandidate: Point | null = null;
      let bestImprovement = 0;

      // Evaluate each candidate position
      for (const candidate of candidates) {
        // Create a temporary device at this position
        const tempDevice: Device = {
          id: -1,
          name: `Temp ${deviceType}`,
          macAddress: "00:00:00:00:00:00",
          deviceType,
          protocol: "wifi",
          rssi: -30, // Assume good signal strength for new device
          x: candidate.x,
          y: candidate.y,
          isOnline: true,
          lastSeen: new Date(),
          telemetryData: null
        };

        // Calculate coverage improvement
        const currentCoverage = this.analyzeCoverage(currentDevices);
        const newCoverage = this.analyzeCoverage([...currentDevices, tempDevice]);
        const improvement = newCoverage.overallScore - currentCoverage.overallScore;

        if (improvement > bestImprovement) {
          bestImprovement = improvement;
          bestCandidate = candidate;
        }
      }

      // Add the best candidate if it provides meaningful improvement
      if (bestCandidate && bestImprovement > 5) { // Minimum 5% improvement
        recommendations.push(bestCandidate);
        
        // Add to current devices for next iteration
        currentDevices.push({
          id: -1,
          name: `Recommended ${deviceType}`,
          macAddress: "00:00:00:00:00:00",
          deviceType,
          protocol: "wifi",
          rssi: -30,
          x: bestCandidate.x,
          y: bestCandidate.y,
          isOnline: true,
          lastSeen: new Date(),
          telemetryData: null
        });

        // Remove this candidate from future consideration
        const candidateIndex = candidates.indexOf(bestCandidate);
        if (candidateIndex > -1) {
          candidates.splice(candidateIndex, 1);
        }
      } else {
        break; // No more meaningful improvements possible
      }
    }

    return recommendations;
  }

  // Anomaly detection using statistical thresholds
  static detectAnomalies(
    device: Device,
    historicalRSSI: number[],
    threshold: number = 2.0
  ): {
    isAnomaly: boolean;
    severity: "low" | "medium" | "high";
    description: string;
  } {
    if (historicalRSSI.length < 5) {
      return {
        isAnomaly: false,
        severity: "low",
        description: "Insufficient historical data"
      };
    }

    const mean = historicalRSSI.reduce((sum, val) => sum + val, 0) / historicalRSSI.length;
    const variance = historicalRSSI.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / historicalRSSI.length;
    const stdDev = Math.sqrt(variance);

    const currentRSSI = device.rssi;
    const zScore = Math.abs(currentRSSI - mean) / stdDev;

    if (zScore < threshold) {
      return {
        isAnomaly: false,
        severity: "low",
        description: "Signal within normal range"
      };
    }

    let severity: "low" | "medium" | "high";
    let description: string;

    if (zScore > threshold * 2) {
      severity = "high";
      description = `Severe signal anomaly detected (${zScore.toFixed(1)}σ from mean)`;
    } else if (zScore > threshold * 1.5) {
      severity = "medium";
      description = `Moderate signal anomaly detected (${zScore.toFixed(1)}σ from mean)`;
    } else {
      severity = "low";
      description = `Minor signal variation detected (${zScore.toFixed(1)}σ from mean)`;
    }

    return {
      isAnomaly: true,
      severity,
      description
    };
  }
}
