/**
 * Smart Departure Detection
 *
 * Intelligently detects when residents leave the house by analyzing:
 * 1. Movement trajectory towards exit points (doors)
 * 2. Signal strength fade patterns
 * 3. Correlation with home map zones
 * 4. Historical departure patterns
 *
 * Instead of just waiting for a timeout, we detect:
 * - Device moving towards front door/garage/exit
 * - Signal gradually fading (walking away)
 * - Device enters "exit zone" then signal disappears
 */

import { EventEmitter } from 'events';

export interface ExitZone {
  id: string;
  name: string;
  type: 'front_door' | 'back_door' | 'garage' | 'side_door' | 'custom';
  position: { x: number; y: number };
  radius: number; // Detection radius
}

export interface DeviceTrajectory {
  macAddress: string;
  residentId?: number;
  residentName?: string;
  positions: Array<{
    x: number;
    y: number;
    rssi: number;
    timestamp: Date;
  }>;
  currentDirection: { dx: number; dy: number } | null;
  isMovingTowardsExit: boolean;
  nearestExit: ExitZone | null;
  distanceToExit: number | null;
  signalTrend: 'stable' | 'strengthening' | 'weakening' | 'fading';
  departureConfidence: number;
}

export interface DepartureEvent {
  type: 'approaching_exit' | 'entered_exit_zone' | 'signal_fading' | 'departed' | 'departure_cancelled';
  macAddress: string;
  residentId?: number;
  residentName?: string;
  exitZone?: ExitZone;
  confidence: number;
  message: string;
  timestamp: Date;
}

export class SmartDepartureDetection extends EventEmitter {
  private static instance: SmartDepartureDetection;
  private isRunning = false;

  // Exit zones configured for the home
  private exitZones: Map<string, ExitZone> = new Map();

  // Track device movements
  private deviceTrajectories: Map<string, DeviceTrajectory> = new Map();

  // Configuration
  private readonly TRAJECTORY_HISTORY_SIZE = 20; // Keep last 20 position samples
  private readonly EXIT_ZONE_RADIUS = 15; // Default radius for exit zones (map units)
  private readonly SIGNAL_FADE_THRESHOLD = -5; // dBm drop considered "fading"
  private readonly DEPARTURE_CONFIDENCE_THRESHOLD = 0.7;
  private readonly MOVEMENT_TOWARDS_EXIT_ANGLE = 45; // degrees

  private checkInterval: NodeJS.Timeout | null = null;

  private constructor() {
    super();
    this.initializeDefaultExitZones();
  }

  static getInstance(): SmartDepartureDetection {
    if (!SmartDepartureDetection.instance) {
      SmartDepartureDetection.instance = new SmartDepartureDetection();
    }
    return SmartDepartureDetection.instance;
  }

  private initializeDefaultExitZones(): void {
    // Default exit zones - user can customize based on their home map
    this.exitZones.set('front_door', {
      id: 'front_door',
      name: 'Front Door',
      type: 'front_door',
      position: { x: 50, y: 0 }, // Bottom center of map (typical front)
      radius: this.EXIT_ZONE_RADIUS
    });

    this.exitZones.set('back_door', {
      id: 'back_door',
      name: 'Back Door',
      type: 'back_door',
      position: { x: 50, y: 100 }, // Top center (back of house)
      radius: this.EXIT_ZONE_RADIUS
    });

    this.exitZones.set('garage', {
      id: 'garage',
      name: 'Garage',
      type: 'garage',
      position: { x: 0, y: 25 }, // Left side
      radius: this.EXIT_ZONE_RADIUS * 1.5 // Larger zone for garage
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[SmartDeparture] Already running');
      return;
    }

    console.log('[SmartDeparture] Starting smart departure detection...');
    this.isRunning = true;

    // Periodic analysis of trajectories
    this.checkInterval = setInterval(() => {
      this.analyzeAllTrajectories();
    }, 5000); // Analyze every 5 seconds

    console.log('[SmartDeparture] Started with', this.exitZones.size, 'exit zones');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    console.log('[SmartDeparture] Stopped');
  }

  /**
   * Update device position from triangulation data
   */
  updateDevicePosition(
    macAddress: string,
    position: { x: number; y: number },
    rssi: number,
    residentId?: number,
    residentName?: string
  ): void {
    const mac = macAddress.toLowerCase();
    let trajectory = this.deviceTrajectories.get(mac);

    if (!trajectory) {
      trajectory = {
        macAddress: mac,
        residentId,
        residentName,
        positions: [],
        currentDirection: null,
        isMovingTowardsExit: false,
        nearestExit: null,
        distanceToExit: null,
        signalTrend: 'stable',
        departureConfidence: 0
      };
      this.deviceTrajectories.set(mac, trajectory);
    }

    // Update resident info if provided
    if (residentId !== undefined) trajectory.residentId = residentId;
    if (residentName) trajectory.residentName = residentName;

    // Add new position
    trajectory.positions.push({
      x: position.x,
      y: position.y,
      rssi,
      timestamp: new Date()
    });

    // Keep only recent history
    if (trajectory.positions.length > this.TRAJECTORY_HISTORY_SIZE) {
      trajectory.positions.shift();
    }

    // Analyze this device's trajectory
    this.analyzeTrajectory(trajectory);
  }

  /**
   * Report signal fade (device signal getting weaker)
   */
  reportSignalFade(macAddress: string, rssiDrop: number): void {
    const mac = macAddress.toLowerCase();
    const trajectory = this.deviceTrajectories.get(mac);

    if (!trajectory) return;

    // Update signal trend
    if (rssiDrop > 10) {
      trajectory.signalTrend = 'fading';
    } else if (rssiDrop > 5) {
      trajectory.signalTrend = 'weakening';
    }

    // If device is near exit and signal is fading, high departure confidence
    if (trajectory.isMovingTowardsExit && trajectory.signalTrend === 'fading') {
      trajectory.departureConfidence = Math.min(1, trajectory.departureConfidence + 0.3);

      if (trajectory.departureConfidence >= this.DEPARTURE_CONFIDENCE_THRESHOLD) {
        this.emitDepartureEvent(trajectory, 'signal_fading');
      }
    }
  }

  /**
   * Device signal completely lost
   */
  reportSignalLost(macAddress: string): void {
    const mac = macAddress.toLowerCase();
    const trajectory = this.deviceTrajectories.get(mac);

    if (!trajectory) return;

    // If they were moving towards exit or near exit zone, confident they left
    if (trajectory.isMovingTowardsExit ||
        (trajectory.nearestExit && trajectory.distanceToExit !== null && trajectory.distanceToExit < this.EXIT_ZONE_RADIUS * 1.5)) {
      trajectory.departureConfidence = 0.95;
      this.emitDepartureEvent(trajectory, 'departed');
    }

    // Clean up trajectory
    this.deviceTrajectories.delete(mac);
  }

  private analyzeTrajectory(trajectory: DeviceTrajectory): void {
    if (trajectory.positions.length < 3) return;

    // Calculate movement direction
    const recentPositions = trajectory.positions.slice(-5);
    const direction = this.calculateDirection(recentPositions);
    trajectory.currentDirection = direction;

    // Find nearest exit
    const currentPos = recentPositions[recentPositions.length - 1];
    const { nearestExit, distance } = this.findNearestExit(currentPos);
    trajectory.nearestExit = nearestExit;
    trajectory.distanceToExit = distance;

    // Check if moving towards exit
    if (direction && nearestExit) {
      const isMovingTowards = this.isMovingTowardsPoint(
        currentPos,
        direction,
        nearestExit.position
      );
      trajectory.isMovingTowardsExit = isMovingTowards;
    }

    // Analyze signal trend
    trajectory.signalTrend = this.analyzeSignalTrend(recentPositions);

    // Calculate departure confidence
    trajectory.departureConfidence = this.calculateDepartureConfidence(trajectory);

    // Emit events based on analysis
    if (trajectory.distanceToExit !== null && trajectory.distanceToExit < this.EXIT_ZONE_RADIUS) {
      // Entered exit zone!
      this.emit('departure', {
        type: 'entered_exit_zone',
        macAddress: trajectory.macAddress,
        residentId: trajectory.residentId,
        residentName: trajectory.residentName,
        exitZone: trajectory.nearestExit,
        confidence: trajectory.departureConfidence,
        message: `${trajectory.residentName || 'Device'} entered ${trajectory.nearestExit?.name || 'exit zone'}`,
        timestamp: new Date()
      } as DepartureEvent);
    } else if (trajectory.isMovingTowardsExit && trajectory.departureConfidence > 0.4) {
      // Approaching exit
      this.emit('departure', {
        type: 'approaching_exit',
        macAddress: trajectory.macAddress,
        residentId: trajectory.residentId,
        residentName: trajectory.residentName,
        exitZone: trajectory.nearestExit,
        confidence: trajectory.departureConfidence,
        message: `${trajectory.residentName || 'Device'} heading towards ${trajectory.nearestExit?.name || 'exit'}`,
        timestamp: new Date()
      } as DepartureEvent);
    }
  }

  private analyzeAllTrajectories(): void {
    const now = Date.now();

    for (const trajectory of this.deviceTrajectories.values()) {
      // Check for stale trajectories (no updates in 30 seconds)
      const lastPosition = trajectory.positions[trajectory.positions.length - 1];
      if (lastPosition && (now - lastPosition.timestamp.getTime()) > 30000) {
        // No recent updates - might have departed
        if (trajectory.departureConfidence > 0.5) {
          this.emitDepartureEvent(trajectory, 'departed');
          this.deviceTrajectories.delete(trajectory.macAddress);
        }
      }
    }
  }

  private calculateDirection(
    positions: Array<{ x: number; y: number; timestamp: Date }>
  ): { dx: number; dy: number } | null {
    if (positions.length < 2) return null;

    // Use weighted average of recent movements
    let totalDx = 0;
    let totalDy = 0;
    let weight = 0;

    for (let i = 1; i < positions.length; i++) {
      const dx = positions[i].x - positions[i - 1].x;
      const dy = positions[i].y - positions[i - 1].y;
      const w = i; // More recent = higher weight

      totalDx += dx * w;
      totalDy += dy * w;
      weight += w;
    }

    if (weight === 0) return null;

    return {
      dx: totalDx / weight,
      dy: totalDy / weight
    };
  }

  private findNearestExit(position: { x: number; y: number }): {
    nearestExit: ExitZone | null;
    distance: number;
  } {
    let nearestExit: ExitZone | null = null;
    let minDistance = Infinity;

    for (const exit of this.exitZones.values()) {
      const distance = Math.sqrt(
        Math.pow(position.x - exit.position.x, 2) +
        Math.pow(position.y - exit.position.y, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestExit = exit;
      }
    }

    return { nearestExit, distance: minDistance };
  }

  private isMovingTowardsPoint(
    currentPos: { x: number; y: number },
    direction: { dx: number; dy: number },
    targetPos: { x: number; y: number }
  ): boolean {
    // Vector to target
    const toTarget = {
      x: targetPos.x - currentPos.x,
      y: targetPos.y - currentPos.y
    };

    // Normalize vectors
    const dirMag = Math.sqrt(direction.dx * direction.dx + direction.dy * direction.dy);
    const targetMag = Math.sqrt(toTarget.x * toTarget.x + toTarget.y * toTarget.y);

    if (dirMag === 0 || targetMag === 0) return false;

    // Calculate dot product (cosine of angle)
    const dot = (direction.dx * toTarget.x + direction.dy * toTarget.y) / (dirMag * targetMag);

    // cos(45°) ≈ 0.707
    return dot > 0.707;
  }

  private analyzeSignalTrend(
    positions: Array<{ rssi: number; timestamp: Date }>
  ): 'stable' | 'strengthening' | 'weakening' | 'fading' {
    if (positions.length < 3) return 'stable';

    // Compare first half to second half
    const mid = Math.floor(positions.length / 2);
    const firstHalf = positions.slice(0, mid);
    const secondHalf = positions.slice(mid);

    const avgFirst = firstHalf.reduce((sum, p) => sum + p.rssi, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((sum, p) => sum + p.rssi, 0) / secondHalf.length;

    const diff = avgSecond - avgFirst;

    if (diff < -10) return 'fading';
    if (diff < -5) return 'weakening';
    if (diff > 5) return 'strengthening';
    return 'stable';
  }

  private calculateDepartureConfidence(trajectory: DeviceTrajectory): number {
    let confidence = 0;

    // Factor 1: Distance to exit (closer = higher confidence)
    if (trajectory.distanceToExit !== null) {
      if (trajectory.distanceToExit < this.EXIT_ZONE_RADIUS) {
        confidence += 0.4; // In exit zone
      } else if (trajectory.distanceToExit < this.EXIT_ZONE_RADIUS * 2) {
        confidence += 0.2; // Near exit
      }
    }

    // Factor 2: Moving towards exit
    if (trajectory.isMovingTowardsExit) {
      confidence += 0.25;
    }

    // Factor 3: Signal trend
    switch (trajectory.signalTrend) {
      case 'fading':
        confidence += 0.3;
        break;
      case 'weakening':
        confidence += 0.15;
        break;
      case 'strengthening':
        confidence -= 0.2; // Less likely departing
        break;
    }

    // Factor 4: Consistent direction (not wandering)
    if (trajectory.positions.length >= 5) {
      const direction = this.calculateDirection(trajectory.positions.slice(-5));
      if (direction) {
        const magnitude = Math.sqrt(direction.dx * direction.dx + direction.dy * direction.dy);
        if (magnitude > 2) confidence += 0.1; // Moving with purpose
      }
    }

    return Math.max(0, Math.min(1, confidence));
  }

  private emitDepartureEvent(trajectory: DeviceTrajectory, type: DepartureEvent['type']): void {
    const messages: Record<string, string> = {
      'approaching_exit': `${trajectory.residentName || 'Someone'} heading towards ${trajectory.nearestExit?.name || 'exit'}`,
      'entered_exit_zone': `${trajectory.residentName || 'Someone'} at ${trajectory.nearestExit?.name || 'exit'}`,
      'signal_fading': `${trajectory.residentName || 'Someone'}'s signal fading near ${trajectory.nearestExit?.name || 'exit'}`,
      'departed': `${trajectory.residentName || 'Someone'} has left via ${trajectory.nearestExit?.name || 'exit'}`,
      'departure_cancelled': `${trajectory.residentName || 'Someone'} moved away from exit`
    };

    this.emit('departure', {
      type,
      macAddress: trajectory.macAddress,
      residentId: trajectory.residentId,
      residentName: trajectory.residentName,
      exitZone: trajectory.nearestExit || undefined,
      confidence: trajectory.departureConfidence,
      message: messages[type],
      timestamp: new Date()
    } as DepartureEvent);

    console.log(`[SmartDeparture] ${messages[type]} (confidence: ${(trajectory.departureConfidence * 100).toFixed(0)}%)`);
  }

  // Public API methods

  getExitZones(): ExitZone[] {
    return Array.from(this.exitZones.values());
  }

  addExitZone(zone: ExitZone): void {
    this.exitZones.set(zone.id, zone);
    console.log(`[SmartDeparture] Added exit zone: ${zone.name}`);
  }

  updateExitZone(zoneId: string, updates: Partial<ExitZone>): void {
    const zone = this.exitZones.get(zoneId);
    if (zone) {
      Object.assign(zone, updates);
      console.log(`[SmartDeparture] Updated exit zone: ${zone.name}`);
    }
  }

  removeExitZone(zoneId: string): void {
    this.exitZones.delete(zoneId);
  }

  getDeviceTrajectory(macAddress: string): DeviceTrajectory | null {
    return this.deviceTrajectories.get(macAddress.toLowerCase()) || null;
  }

  getAllTrajectories(): DeviceTrajectory[] {
    return Array.from(this.deviceTrajectories.values());
  }

  isRunningStatus(): boolean {
    return this.isRunning;
  }
}

export const smartDepartureDetection = SmartDepartureDetection.getInstance();
