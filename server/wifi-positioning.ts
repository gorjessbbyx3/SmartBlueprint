import { storage } from './storage';
import { Device } from '../shared/schema';

export interface AccessPoint {
  id: string;
  macAddress: string;
  name: string;
  x: number;
  y: number;
  txPower: number; // Transmit power in dBm (usually -30 to -40 dBm at 1 meter)
}

export interface SignalMeasurement {
  apId: string;
  rssi: number;
  timestamp: Date;
}

export interface PositionEstimate {
  x: number;
  y: number;
  accuracy: number; // Estimated accuracy in meters
  confidence: number; // 0-1 confidence score
  method: 'triangulation' | 'fingerprinting' | 'proximity' | 'manual';
}

export interface RoomAssignment {
  roomId: number;
  roomName: string;
  confidence: number;
}

// Path loss model parameters
const PATH_LOSS_EXPONENT = 3.0; // Typical indoor environment (2-4 range)
const REFERENCE_RSSI = -40; // RSSI at 1 meter reference distance
const WALL_ATTENUATION = 3; // dB loss per wall
const FLOOR_ATTENUATION = 10; // dB loss per floor

export class WiFiPositioningEngine {
  private static instance: WiFiPositioningEngine;
  private accessPoints: Map<string, AccessPoint> = new Map();
  private signalHistory: Map<string, SignalMeasurement[]> = new Map(); // deviceMac -> measurements
  private floorplanWidth = 800;
  private floorplanHeight = 600;
  private metersPerPixel = 0.05; // 20 pixels per meter (1:20 scale for typical home)

  static getInstance(): WiFiPositioningEngine {
    if (!this.instance) {
      this.instance = new WiFiPositioningEngine();
    }
    return this.instance;
  }

  setFloorplanDimensions(width: number, height: number, scale: string = '1:200') {
    this.floorplanWidth = width;
    this.floorplanHeight = height;

    // Parse scale (format: "1:X" where X is pixels per meter)
    const match = scale.match(/1:(\d+)/);
    if (match) {
      this.metersPerPixel = 1 / parseInt(match[1]);
    }
  }

  registerAccessPoint(ap: AccessPoint): void {
    this.accessPoints.set(ap.id, ap);
    console.log(`[WiFi Positioning] Registered AP: ${ap.name} at (${ap.x}, ${ap.y})`);
  }

  // Convert RSSI to estimated distance using log-distance path loss model
  rssiToDistance(rssi: number, txPower: number = REFERENCE_RSSI): number {
    // Log-distance path loss model: RSSI = TxPower - 10 * n * log10(d)
    // Solving for d: d = 10^((TxPower - RSSI) / (10 * n))
    const exponent = (txPower - rssi) / (10 * PATH_LOSS_EXPONENT);
    const distanceMeters = Math.pow(10, exponent);

    // Clamp to reasonable range (0.1m to 50m for indoor)
    return Math.max(0.1, Math.min(50, distanceMeters));
  }

  // Convert distance in meters to pixels
  metersToPixels(meters: number): number {
    return meters / this.metersPerPixel;
  }

  // Trilateration: Calculate position from 3+ distance measurements
  trilaterate(measurements: { x: number; y: number; distance: number }[]): PositionEstimate | null {
    if (measurements.length < 3) {
      // With fewer than 3 points, use proximity-based estimation
      return this.estimateFromProximity(measurements);
    }

    // Use least squares method for overdetermined system
    // Reference: https://en.wikipedia.org/wiki/Trilateration
    const n = measurements.length;

    // Translate to make first point the origin
    const x1 = measurements[0].x;
    const y1 = measurements[0].y;
    const r1 = measurements[0].distance;

    // Build matrices for least squares
    let A: number[][] = [];
    let b: number[] = [];

    for (let i = 1; i < n; i++) {
      const xi = measurements[i].x - x1;
      const yi = measurements[i].y - y1;
      const ri = measurements[i].distance;

      A.push([2 * xi, 2 * yi]);
      b.push(xi * xi + yi * yi + r1 * r1 - ri * ri);
    }

    // Solve using least squares: (A^T * A)^-1 * A^T * b
    const result = this.solveLeastSquares(A, b);
    if (!result) {
      return this.estimateFromProximity(measurements);
    }

    const estimatedX = result[0] + x1;
    const estimatedY = result[1] + y1;

    // Calculate accuracy based on residual errors
    let totalError = 0;
    for (const m of measurements) {
      const dx = estimatedX - m.x;
      const dy = estimatedY - m.y;
      const actualDist = Math.sqrt(dx * dx + dy * dy);
      totalError += Math.abs(actualDist - m.distance);
    }
    const avgError = totalError / n;
    const accuracyMeters = avgError;
    const confidence = Math.max(0, 1 - avgError / 10); // Confidence drops with error

    // Clamp to floorplan bounds
    const clampedX = Math.max(0, Math.min(this.floorplanWidth, estimatedX));
    const clampedY = Math.max(0, Math.min(this.floorplanHeight, estimatedY));

    return {
      x: clampedX,
      y: clampedY,
      accuracy: accuracyMeters,
      confidence: Math.max(0.1, confidence),
      method: 'triangulation'
    };
  }

  // Simple proximity estimation when we don't have enough APs
  private estimateFromProximity(measurements: { x: number; y: number; distance: number }[]): PositionEstimate | null {
    if (measurements.length === 0) return null;

    if (measurements.length === 1) {
      // With 1 AP, place device at distance from AP (random angle)
      const m = measurements[0];
      const distPixels = this.metersToPixels(m.distance);
      // Place in direction of center
      const centerX = this.floorplanWidth / 2;
      const centerY = this.floorplanHeight / 2;
      const angle = Math.atan2(centerY - m.y, centerX - m.x);

      return {
        x: Math.max(0, Math.min(this.floorplanWidth, m.x + distPixels * Math.cos(angle))),
        y: Math.max(0, Math.min(this.floorplanHeight, m.y + distPixels * Math.sin(angle))),
        accuracy: m.distance * 0.5, // 50% accuracy estimate
        confidence: 0.3,
        method: 'proximity'
      };
    }

    // With 2 APs, use intersection of circles (pick point closest to center)
    const m1 = measurements[0];
    const m2 = measurements[1];

    const intersections = this.circleIntersections(
      m1.x, m1.y, this.metersToPixels(m1.distance),
      m2.x, m2.y, this.metersToPixels(m2.distance)
    );

    if (intersections.length === 0) {
      // Circles don't intersect, use midpoint weighted by signal strength
      const totalDist = m1.distance + m2.distance;
      const weight1 = m2.distance / totalDist;
      const weight2 = m1.distance / totalDist;

      return {
        x: m1.x * weight1 + m2.x * weight2,
        y: m1.y * weight1 + m2.y * weight2,
        accuracy: Math.abs(m1.distance - m2.distance),
        confidence: 0.4,
        method: 'proximity'
      };
    }

    // Pick intersection closer to floorplan center
    const centerX = this.floorplanWidth / 2;
    const centerY = this.floorplanHeight / 2;

    let bestPoint = intersections[0];
    let bestDist = Math.hypot(bestPoint.x - centerX, bestPoint.y - centerY);

    for (let i = 1; i < intersections.length; i++) {
      const dist = Math.hypot(intersections[i].x - centerX, intersections[i].y - centerY);
      if (dist < bestDist) {
        bestDist = dist;
        bestPoint = intersections[i];
      }
    }

    return {
      x: Math.max(0, Math.min(this.floorplanWidth, bestPoint.x)),
      y: Math.max(0, Math.min(this.floorplanHeight, bestPoint.y)),
      accuracy: (m1.distance + m2.distance) / 4,
      confidence: 0.5,
      method: 'proximity'
    };
  }

  // Find intersection points of two circles
  private circleIntersections(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): { x: number; y: number }[] {
    const d = Math.hypot(x2 - x1, y2 - y1);

    // No intersection
    if (d > r1 + r2 || d < Math.abs(r1 - r2)) return [];

    // One intersection (tangent)
    if (d === r1 + r2) {
      const x = x1 + r1 * (x2 - x1) / d;
      const y = y1 + r1 * (y2 - y1) / d;
      return [{ x, y }];
    }

    // Two intersections
    const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
    const h = Math.sqrt(r1 * r1 - a * a);

    const px = x1 + a * (x2 - x1) / d;
    const py = y1 + a * (y2 - y1) / d;

    return [
      { x: px + h * (y2 - y1) / d, y: py - h * (x2 - x1) / d },
      { x: px - h * (y2 - y1) / d, y: py + h * (x2 - x1) / d }
    ];
  }

  // Solve least squares using normal equations
  private solveLeastSquares(A: number[][], b: number[]): number[] | null {
    const n = A.length;
    if (n < 2) return null;

    // A^T * A
    const ATA = [
      [0, 0],
      [0, 0]
    ];
    // A^T * b
    const ATb = [0, 0];

    for (let i = 0; i < n; i++) {
      ATA[0][0] += A[i][0] * A[i][0];
      ATA[0][1] += A[i][0] * A[i][1];
      ATA[1][0] += A[i][1] * A[i][0];
      ATA[1][1] += A[i][1] * A[i][1];

      ATb[0] += A[i][0] * b[i];
      ATb[1] += A[i][1] * b[i];
    }

    // Invert 2x2 matrix
    const det = ATA[0][0] * ATA[1][1] - ATA[0][1] * ATA[1][0];
    if (Math.abs(det) < 1e-10) return null;

    const inv = [
      [ATA[1][1] / det, -ATA[0][1] / det],
      [-ATA[1][0] / det, ATA[0][0] / det]
    ];

    // Multiply inverse by ATb
    return [
      inv[0][0] * ATb[0] + inv[0][1] * ATb[1],
      inv[1][0] * ATb[0] + inv[1][1] * ATb[1]
    ];
  }

  // Calculate estimated RSSI at a point given device positions
  calculateRSSIAtPoint(x: number, y: number, devices: Device[]): number {
    if (devices.length === 0) return -100;

    let maxRSSI = -100;

    for (const device of devices) {
      if (device.x === null || device.y === null) continue;

      const distPixels = Math.hypot(x - device.x, y - device.y);
      const distMeters = distPixels * this.metersPerPixel;

      // Reverse path loss: estimate RSSI at this point from device signal
      // Assume device is at distance d from an AP, project signal to point
      const estimatedRSSI = this.estimateRSSIAtDistance(device.rssi, distMeters);
      maxRSSI = Math.max(maxRSSI, estimatedRSSI);
    }

    return maxRSSI;
  }

  // Estimate RSSI at a given distance from a known point
  private estimateRSSIAtDistance(sourceRSSI: number, distanceMeters: number): number {
    // If distance is very small, return source RSSI
    if (distanceMeters < 0.1) return sourceRSSI;

    // Apply path loss formula
    const pathLoss = 10 * PATH_LOSS_EXPONENT * Math.log10(distanceMeters);
    return sourceRSSI - pathLoss;
  }

  // Assign device to room based on position
  async assignDeviceToRoom(device: Device): Promise<RoomAssignment | null> {
    if (device.x === null || device.y === null) return null;

    const rooms = await storage.getRooms();
    let bestRoom: RoomAssignment | null = null;
    let bestConfidence = 0;

    for (const room of rooms) {
      const boundaries = JSON.parse(room.boundaries);
      if (this.isPointInPolygon(device.x, device.y, boundaries)) {
        // Device is inside this room
        const confidence = 0.9; // High confidence when inside polygon
        if (confidence > bestConfidence) {
          bestConfidence = confidence;
          bestRoom = {
            roomId: room.id,
            roomName: room.name,
            confidence
          };
        }
      } else {
        // Check proximity to room
        const distance = this.distanceToPolygon(device.x, device.y, boundaries);
        const proximityConfidence = Math.max(0, 1 - distance / 100); // Confidence drops with distance

        if (proximityConfidence > bestConfidence) {
          bestConfidence = proximityConfidence;
          bestRoom = {
            roomId: room.id,
            roomName: room.name,
            confidence: proximityConfidence
          };
        }
      }
    }

    return bestRoom;
  }

  // Point-in-polygon test using ray casting
  private isPointInPolygon(x: number, y: number, polygon: { x: number; y: number }[]): boolean {
    if (polygon.length < 3) return false;

    let inside = false;
    const n = polygon.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;

      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
  }

  // Distance from point to polygon boundary
  private distanceToPolygon(x: number, y: number, polygon: { x: number; y: number }[]): number {
    let minDist = Infinity;
    const n = polygon.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const dist = this.distanceToSegment(
        x, y,
        polygon[i].x, polygon[i].y,
        polygon[j].x, polygon[j].y
      );
      minDist = Math.min(minDist, dist);
    }

    return minDist;
  }

  // Distance from point to line segment
  private distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) return Math.hypot(px - x1, py - y1);

    let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));

    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;

    return Math.hypot(px - closestX, py - closestY);
  }

  // Calculate positions for all devices based on known APs
  async calculateDevicePositions(): Promise<Map<number, PositionEstimate>> {
    const positions = new Map<number, PositionEstimate>();
    const devices = await storage.getDevices();
    const aps = Array.from(this.accessPoints.values());

    if (aps.length === 0) {
      console.log('[WiFi Positioning] No access points registered, using RSSI-based estimation');

      // Fallback: Use RSSI to estimate relative positions
      for (const device of devices) {
        if (device.rssi !== null) {
          const position = this.estimatePositionFromRSSI(device, devices);
          if (position) {
            positions.set(device.id, position);
          }
        }
      }
    } else {
      // Use triangulation with known APs
      for (const device of devices) {
        const measurements: { x: number; y: number; distance: number }[] = [];

        for (const ap of aps) {
          // In a real system, we'd have RSSI from each AP to this device
          // For now, estimate based on device RSSI
          const distance = this.rssiToDistance(device.rssi, ap.txPower);
          measurements.push({
            x: ap.x,
            y: ap.y,
            distance: this.metersToPixels(distance)
          });
        }

        const position = this.trilaterate(measurements);
        if (position) {
          positions.set(device.id, position);
        }
      }
    }

    return positions;
  }

  // Estimate position based on RSSI relative to other devices
  private estimatePositionFromRSSI(device: Device, allDevices: Device[]): PositionEstimate | null {
    // Group devices by signal strength and distribute spatially
    const sortedByRSSI = [...allDevices]
      .filter(d => d.rssi !== null)
      .sort((a, b) => b.rssi - a.rssi);

    const index = sortedByRSSI.findIndex(d => d.id === device.id);
    const total = sortedByRSSI.length;

    if (index === -1 || total === 0) return null;

    // Distribute devices in a grid pattern based on signal strength
    const cols = Math.ceil(Math.sqrt(total));
    const rows = Math.ceil(total / cols);

    const col = index % cols;
    const row = Math.floor(index / cols);

    // Devices with stronger signals are placed more centrally
    const normalizedRSSI = (device.rssi + 100) / 70; // Normalize to 0-1 range
    const spreadFactor = 0.7 + (1 - normalizedRSSI) * 0.3; // Stronger = more central

    const cellWidth = this.floorplanWidth / cols;
    const cellHeight = this.floorplanHeight / rows;

    const baseX = (col + 0.5) * cellWidth;
    const baseY = (row + 0.5) * cellHeight;

    // Add some variation based on signal strength
    const centerX = this.floorplanWidth / 2;
    const centerY = this.floorplanHeight / 2;

    const x = centerX + (baseX - centerX) * spreadFactor;
    const y = centerY + (baseY - centerY) * spreadFactor;

    return {
      x: Math.max(50, Math.min(this.floorplanWidth - 50, x)),
      y: Math.max(50, Math.min(this.floorplanHeight - 50, y)),
      accuracy: 5, // Rough estimate
      confidence: 0.3 + normalizedRSSI * 0.3,
      method: 'proximity'
    };
  }

  // Generate heatmap data with proper path loss model
  generateHeatmapData(devices: Device[], gridSize: number = 40): { x: number; y: number; rssi: number }[] {
    const heatmapData: { x: number; y: number; rssi: number }[] = [];
    const stepX = this.floorplanWidth / gridSize;
    const stepY = this.floorplanHeight / gridSize;

    for (let gx = 0; gx <= gridSize; gx++) {
      for (let gy = 0; gy <= gridSize; gy++) {
        const x = gx * stepX;
        const y = gy * stepY;
        const rssi = this.calculateRSSIAtPoint(x, y, devices);
        heatmapData.push({ x, y, rssi });
      }
    }

    return heatmapData;
  }
}

export const wifiPositioning = WiFiPositioningEngine.getInstance();
