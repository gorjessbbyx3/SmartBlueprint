/**
 * Home Walk-Through Calibration
 *
 * Allows users to walk around their home with a device (phone, tablet, or dedicated IoT sensor)
 * and mark locations to teach the system:
 *
 * 1. Room boundaries and names
 * 2. Exit/entry points (doors)
 * 3. Signal strength baselines at known locations
 * 4. Sensor placement positions
 *
 * The calibration process:
 * 1. User starts calibration mode
 * 2. User walks to a location and taps "Mark Location"
 * 3. User labels the location (room name, exit point, etc.)
 * 4. System records signal readings from all available sensors
 * 5. User continues to other locations
 * 6. System builds a signal map of the home
 */

import { EventEmitter } from 'events';
import { smartDepartureDetection, ExitZone } from './smart-departure-detection';
import { multiDeviceTriangulation } from './multi-device-triangulation';

export interface CalibrationPoint {
  id: string;
  name: string;
  type: 'room' | 'exit' | 'sensor' | 'waypoint';
  position: { x: number; y: number }; // User-defined position on floor plan
  signalReadings: Map<string, number>; // MAC -> RSSI at this point
  timestamp: Date;
  roomId?: string;
  isExit?: boolean;
  exitType?: 'front_door' | 'back_door' | 'garage' | 'side_door';
}

export interface Room {
  id: string;
  name: string;
  calibrationPoints: CalibrationPoint[];
  bounds?: { x1: number; y1: number; x2: number; y2: number };
  signalBaseline: Map<string, number>; // Average signal per sensor in this room
}

export interface CalibrationSession {
  id: string;
  startedAt: Date;
  completedAt?: Date;
  deviceMac: string;
  deviceName: string;
  points: CalibrationPoint[];
  rooms: Room[];
  exitZones: ExitZone[];
  status: 'in_progress' | 'completed' | 'cancelled';
}

export interface CalibrationEvent {
  type: 'session_started' | 'point_recorded' | 'room_learned' | 'exit_learned' |
        'session_completed' | 'calibration_hint';
  session?: CalibrationSession;
  point?: CalibrationPoint;
  room?: Room;
  message: string;
  timestamp: Date;
}

export class HomeWalkthroughCalibration extends EventEmitter {
  private static instance: HomeWalkthroughCalibration;
  private activeSession: CalibrationSession | null = null;
  private completedSessions: CalibrationSession[] = [];
  private learnedRooms: Map<string, Room> = new Map();
  private signalMap: Map<string, Map<string, number>> = new Map(); // Location -> (Sensor -> RSSI)

  private constructor() {
    super();
  }

  static getInstance(): HomeWalkthroughCalibration {
    if (!HomeWalkthroughCalibration.instance) {
      HomeWalkthroughCalibration.instance = new HomeWalkthroughCalibration();
    }
    return HomeWalkthroughCalibration.instance;
  }

  /**
   * Start a new calibration walk-through session
   */
  startCalibration(deviceMac: string, deviceName: string): CalibrationSession {
    if (this.activeSession) {
      throw new Error('A calibration session is already in progress');
    }

    const session: CalibrationSession = {
      id: `cal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startedAt: new Date(),
      deviceMac: deviceMac.toLowerCase(),
      deviceName,
      points: [],
      rooms: [],
      exitZones: [],
      status: 'in_progress'
    };

    this.activeSession = session;

    this.emit('calibration', {
      type: 'session_started',
      session,
      message: `Calibration started! Walk around your home and mark locations.`,
      timestamp: new Date()
    } as CalibrationEvent);

    console.log(`[Calibration] Session started with device: ${deviceName}`);

    return session;
  }

  /**
   * Record a calibration point at the user's current location
   */
  async recordPoint(
    name: string,
    type: 'room' | 'exit' | 'sensor' | 'waypoint',
    position: { x: number; y: number },
    options?: {
      roomId?: string;
      isExit?: boolean;
      exitType?: 'front_door' | 'back_door' | 'garage' | 'side_door';
    }
  ): Promise<CalibrationPoint> {
    if (!this.activeSession) {
      throw new Error('No calibration session in progress');
    }

    // Collect current signal readings from all available sensors
    const signalReadings = await this.collectSignalReadings();

    const point: CalibrationPoint = {
      id: `point_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name,
      type,
      position,
      signalReadings,
      timestamp: new Date(),
      roomId: options?.roomId,
      isExit: options?.isExit || type === 'exit',
      exitType: options?.exitType
    };

    this.activeSession.points.push(point);

    // Update signal map
    const locationKey = `${position.x.toFixed(0)},${position.y.toFixed(0)}`;
    this.signalMap.set(locationKey, signalReadings);

    // If this is an exit point, register it
    if (point.isExit && point.exitType) {
      const exitZone: ExitZone = {
        id: point.id,
        name: point.name,
        type: point.exitType,
        position: point.position,
        radius: 15
      };
      this.activeSession.exitZones.push(exitZone);
      smartDepartureDetection.addExitZone(exitZone);

      this.emit('calibration', {
        type: 'exit_learned',
        point,
        message: `Exit point "${name}" recorded at position (${position.x}, ${position.y})`,
        timestamp: new Date()
      } as CalibrationEvent);
    }

    // If this is a room point, update or create room
    if (type === 'room') {
      this.updateRoomFromPoint(point);
    }

    this.emit('calibration', {
      type: 'point_recorded',
      point,
      message: `Point "${name}" recorded with ${signalReadings.size} sensor readings`,
      timestamp: new Date()
    } as CalibrationEvent);

    console.log(`[Calibration] Point recorded: ${name} (${type}) at (${position.x}, ${position.y})`);

    // Provide hints based on progress
    this.provideCalibrationHints();

    return point;
  }

  /**
   * Collect signal readings from all available sensors
   */
  private async collectSignalReadings(): Promise<Map<string, number>> {
    const readings = new Map<string, number>();

    // Get readings from triangulation sensors
    const sensors = multiDeviceTriangulation.getActiveSensors();
    for (const sensor of sensors) {
      readings.set(sensor.id, sensor.lastRssi);
    }

    // In simulation mode, generate realistic readings
    if (sensors.length === 0) {
      // Simulated sensor readings based on position
      readings.set('sim-router', -45 + Math.random() * 10);
      readings.set('sim-repeater-1', -55 + Math.random() * 15);
      readings.set('sim-repeater-2', -60 + Math.random() * 15);
    }

    return readings;
  }

  /**
   * Update or create a room based on calibration point
   */
  private updateRoomFromPoint(point: CalibrationPoint): void {
    const roomId = point.roomId || point.name.toLowerCase().replace(/\s+/g, '-');
    let room = this.learnedRooms.get(roomId);

    if (!room) {
      room = {
        id: roomId,
        name: point.name,
        calibrationPoints: [],
        signalBaseline: new Map()
      };
      this.learnedRooms.set(roomId, room);
      this.activeSession?.rooms.push(room);

      this.emit('calibration', {
        type: 'room_learned',
        room,
        message: `Room "${point.name}" discovered!`,
        timestamp: new Date()
      } as CalibrationEvent);
    }

    room.calibrationPoints.push(point);

    // Update signal baseline as average of all points in room
    this.updateRoomSignalBaseline(room);

    // Update room bounds
    this.updateRoomBounds(room);
  }

  private updateRoomSignalBaseline(room: Room): void {
    const sensorSums = new Map<string, { sum: number; count: number }>();

    for (const point of room.calibrationPoints) {
      for (const [sensorId, rssi] of point.signalReadings) {
        const existing = sensorSums.get(sensorId) || { sum: 0, count: 0 };
        existing.sum += rssi;
        existing.count++;
        sensorSums.set(sensorId, existing);
      }
    }

    room.signalBaseline.clear();
    for (const [sensorId, data] of sensorSums) {
      room.signalBaseline.set(sensorId, data.sum / data.count);
    }
  }

  private updateRoomBounds(room: Room): void {
    if (room.calibrationPoints.length === 0) return;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const point of room.calibrationPoints) {
      minX = Math.min(minX, point.position.x);
      minY = Math.min(minY, point.position.y);
      maxX = Math.max(maxX, point.position.x);
      maxY = Math.max(maxY, point.position.y);
    }

    // Add padding
    const padding = 10;
    room.bounds = {
      x1: Math.max(0, minX - padding),
      y1: Math.max(0, minY - padding),
      x2: Math.min(100, maxX + padding),
      y2: Math.min(100, maxY + padding)
    };
  }

  private provideCalibrationHints(): void {
    if (!this.activeSession) return;

    const pointCount = this.activeSession.points.length;
    const roomCount = this.activeSession.rooms.length;
    const exitCount = this.activeSession.exitZones.length;

    let hint = '';

    if (pointCount < 3) {
      hint = 'Keep going! Mark at least 3 points for basic calibration.';
    } else if (exitCount === 0) {
      hint = 'Tip: Mark your entry/exit points (front door, back door, garage).';
    } else if (roomCount < 3) {
      hint = 'Tip: Mark points in different rooms to improve room detection.';
    } else if (pointCount < 10) {
      hint = 'Good progress! More points = more accurate tracking.';
    } else {
      hint = 'Great! You can complete calibration or add more detail.';
    }

    if (hint) {
      this.emit('calibration', {
        type: 'calibration_hint',
        message: hint,
        timestamp: new Date()
      } as CalibrationEvent);
    }
  }

  /**
   * Complete the calibration session
   */
  completeCalibration(): CalibrationSession {
    if (!this.activeSession) {
      throw new Error('No calibration session in progress');
    }

    this.activeSession.completedAt = new Date();
    this.activeSession.status = 'completed';

    // Register all exit zones with smart departure detection
    for (const exitZone of this.activeSession.exitZones) {
      smartDepartureDetection.addExitZone(exitZone);
    }

    // Register rooms with triangulation system
    for (const room of this.activeSession.rooms) {
      if (room.bounds) {
        multiDeviceTriangulation.addZone({
          id: room.id,
          name: room.name,
          bounds: room.bounds,
          sensorIds: []
        });
      }
    }

    const session = this.activeSession;
    this.completedSessions.push(session);
    this.activeSession = null;

    this.emit('calibration', {
      type: 'session_completed',
      session,
      message: `Calibration complete! ${session.points.length} points, ${session.rooms.length} rooms, ${session.exitZones.length} exits learned.`,
      timestamp: new Date()
    } as CalibrationEvent);

    console.log(`[Calibration] Session completed: ${session.points.length} points recorded`);

    return session;
  }

  /**
   * Cancel the active calibration session
   */
  cancelCalibration(): void {
    if (!this.activeSession) return;

    this.activeSession.status = 'cancelled';
    this.activeSession = null;

    console.log('[Calibration] Session cancelled');
  }

  /**
   * Estimate current location based on signal readings
   */
  estimateLocation(currentReadings: Map<string, number>): {
    position: { x: number; y: number };
    room?: string;
    confidence: number
  } | null {
    if (this.signalMap.size === 0) {
      return null;
    }

    let bestMatch: { position: { x: number; y: number }; room?: string; similarity: number } | null = null;

    for (const [locationKey, readings] of this.signalMap) {
      const similarity = this.calculateSignalSimilarity(currentReadings, readings);

      if (!bestMatch || similarity > bestMatch.similarity) {
        const [x, y] = locationKey.split(',').map(Number);
        const room = this.findRoomAtPosition({ x, y });

        bestMatch = {
          position: { x, y },
          room: room?.name,
          similarity
        };
      }
    }

    if (bestMatch) {
      return {
        position: bestMatch.position,
        room: bestMatch.room,
        confidence: bestMatch.similarity
      };
    }

    return null;
  }

  private calculateSignalSimilarity(
    current: Map<string, number>,
    reference: Map<string, number>
  ): number {
    let totalDiff = 0;
    let matchCount = 0;

    for (const [sensorId, refRssi] of reference) {
      const currentRssi = current.get(sensorId);
      if (currentRssi !== undefined) {
        // Lower difference = higher similarity
        const diff = Math.abs(currentRssi - refRssi);
        totalDiff += diff;
        matchCount++;
      }
    }

    if (matchCount === 0) return 0;

    // Convert average dBm difference to similarity (0-1)
    const avgDiff = totalDiff / matchCount;
    // 0 dBm diff = 1.0 similarity, 20 dBm diff = 0.0 similarity
    return Math.max(0, 1 - avgDiff / 20);
  }

  private findRoomAtPosition(position: { x: number; y: number }): Room | null {
    for (const room of this.learnedRooms.values()) {
      if (room.bounds) {
        if (position.x >= room.bounds.x1 && position.x <= room.bounds.x2 &&
            position.y >= room.bounds.y1 && position.y <= room.bounds.y2) {
          return room;
        }
      }
    }
    return null;
  }

  // Public API methods

  getActiveSession(): CalibrationSession | null {
    return this.activeSession;
  }

  getCompletedSessions(): CalibrationSession[] {
    return [...this.completedSessions];
  }

  getLearnedRooms(): Room[] {
    return Array.from(this.learnedRooms.values());
  }

  getCalibrationPointCount(): number {
    let total = 0;
    for (const session of this.completedSessions) {
      total += session.points.length;
    }
    if (this.activeSession) {
      total += this.activeSession.points.length;
    }
    return total;
  }

  isCalibrationInProgress(): boolean {
    return this.activeSession !== null;
  }

  getSignalMap(): Map<string, Map<string, number>> {
    return new Map(this.signalMap);
  }
}

export const homeWalkthroughCalibration = HomeWalkthroughCalibration.getInstance();
