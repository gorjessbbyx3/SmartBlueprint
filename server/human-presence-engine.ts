/**
 * Unified Human Presence Engine
 *
 * Combines multiple detection methods to provide reliable human presence detection:
 * 1. Bluetooth Presence - Detects known resident devices (phones, wearables)
 * 2. WiFi Signal Disruption - Detects when bodies block WiFi signals
 * 3. Multi-Device Triangulation - Estimates position from multiple sensor devices
 *
 * The engine fuses data from all sources to provide:
 * - Presence/absence detection
 * - Resident vs. unknown person classification
 * - Approximate location estimation
 * - Movement pattern analysis
 * - Intrusion alerts (motion when no residents present)
 */

import { EventEmitter } from 'events';
import { bluetoothPresence, PresenceEvent } from './bluetooth-presence';
import { signalDisruptionDetector, DisruptionEvent } from './signal-disruption-detector';
import { multiDeviceTriangulation, TriangulationEvent } from './multi-device-triangulation';
import { aiDeviceLearning } from './ai-device-learning';
import { smartDepartureDetection } from './smart-departure-detection';
import { storage } from './storage';

export interface PresenceState {
  anyoneHome: boolean;
  residentsPresent: number[];
  unknownPresenceDetected: boolean;
  lastMovementTime: Date | null;
  currentZones: string[];
  estimatedPosition: { x: number; y: number } | null;
  confidence: number;
}

export interface HumanPresenceEvent {
  type: 'resident_arrived' | 'resident_departed' | 'intrusion_detected' |
    'movement_detected' | 'all_clear' | 'presence_state_changed';
  residentsPresent: number[];
  unknownPresence: boolean;
  location?: string;
  position?: { x: number; y: number };
  confidence: number;
  sources: string[]; // Which detection methods triggered this
  timestamp: Date;
}

interface DetectionSource {
  name: string;
  weight: number;
  lastEvent: Date | null;
  isActive: boolean;
}

export class HumanPresenceEngine extends EventEmitter {
  private static instance: HumanPresenceEngine;
  private isRunning = false;

  // Current state
  private presenceState: PresenceState = {
    anyoneHome: false,
    residentsPresent: [],
    unknownPresenceDetected: false,
    lastMovementTime: null,
    currentZones: [],
    estimatedPosition: null,
    confidence: 0
  };

  // Detection sources with their reliability weights
  private sources: Map<string, DetectionSource> = new Map([
    ['bluetooth', { name: 'Bluetooth', weight: 0.9, lastEvent: null, isActive: false }],
    ['disruption', { name: 'Signal Disruption', weight: 0.6, lastEvent: null, isActive: false }],
    ['triangulation', { name: 'Triangulation', weight: 0.5, lastEvent: null, isActive: false }]
  ]);

  // Timing thresholds
  private movementTimeout = 120000; // 2 minutes - consider movement expired
  private intrusionDelay = 5000; // 5 seconds - delay before triggering intrusion alert

  // Pending intrusion timer
  private pendingIntrusionTimer: NodeJS.Timeout | null = null;

  private constructor() {
    super();
  }

  static getInstance(): HumanPresenceEngine {
    if (!HumanPresenceEngine.instance) {
      HumanPresenceEngine.instance = new HumanPresenceEngine();
    }
    return HumanPresenceEngine.instance;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[PresenceEngine] Already running');
      return;
    }

    console.log('[PresenceEngine] Starting human presence engine...');

    // Start all detection subsystems
    await this.startSubsystems();

    // Set up event listeners
    this.setupEventListeners();

    // Start periodic state evaluation
    setInterval(() => this.evaluateState(), 10000);

    this.isRunning = true;
    console.log('[PresenceEngine] Human presence engine started');

    // Emit initial state
    this.emitStateChange();
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    console.log('[PresenceEngine] Stopping...');

    await bluetoothPresence.stop();
    await signalDisruptionDetector.stop();
    await multiDeviceTriangulation.stop();

    if (this.pendingIntrusionTimer) {
      clearTimeout(this.pendingIntrusionTimer);
      this.pendingIntrusionTimer = null;
    }

    this.isRunning = false;
    console.log('[PresenceEngine] Stopped');
  }

  private async startSubsystems(): Promise<void> {
    try {
      await bluetoothPresence.start();
      this.sources.get('bluetooth')!.isActive = true;
    } catch (err: any) {
      console.error('[PresenceEngine] Bluetooth start failed:', err.message);
    }

    try {
      await signalDisruptionDetector.start();
      this.sources.get('disruption')!.isActive = true;
    } catch (err: any) {
      console.error('[PresenceEngine] Signal disruption start failed:', err.message);
    }

    try {
      await multiDeviceTriangulation.start();
      this.sources.get('triangulation')!.isActive = true;
    } catch (err: any) {
      console.error('[PresenceEngine] Triangulation start failed:', err.message);
    }
  }

  private setupEventListeners(): void {
    // Bluetooth presence events
    bluetoothPresence.on('presence', (event: PresenceEvent) => {
      this.handleBluetoothEvent(event);
    });

    // WiFi signal disruption events
    signalDisruptionDetector.on('disruption', (event: DisruptionEvent) => {
      this.handleDisruptionEvent(event);
    });

    // Triangulation events
    multiDeviceTriangulation.on('triangulation', (event: TriangulationEvent) => {
      this.handleTriangulationEvent(event);
    });
  }

  private handleBluetoothEvent(event: PresenceEvent): void {
    const source = this.sources.get('bluetooth')!;
    source.lastEvent = event.timestamp;

    const previousState = { ...this.presenceState };

    switch (event.type) {
      case 'arrived':
        if (event.residentId !== undefined) {
          if (!this.presenceState.residentsPresent.includes(event.residentId)) {
            this.presenceState.residentsPresent.push(event.residentId);
          }
          this.presenceState.anyoneHome = true;

          this.emit('presence', {
            type: 'resident_arrived',
            residentsPresent: [...this.presenceState.residentsPresent],
            unknownPresence: this.presenceState.unknownPresenceDetected,
            confidence: 0.95,
            sources: ['bluetooth'],
            timestamp: event.timestamp
          } as HumanPresenceEvent);

          // Cancel any pending intrusion alert
          this.cancelPendingIntrusion();
        }
        break;

      case 'departed':
        if (event.residentId !== undefined) {
          this.presenceState.residentsPresent = this.presenceState.residentsPresent
            .filter(id => id !== event.residentId);
          this.presenceState.anyoneHome = this.presenceState.residentsPresent.length > 0;

          this.emit('presence', {
            type: 'resident_departed',
            residentsPresent: [...this.presenceState.residentsPresent],
            unknownPresence: this.presenceState.unknownPresenceDetected,
            confidence: 0.9,
            sources: ['bluetooth'],
            timestamp: event.timestamp
          } as HumanPresenceEvent);
        }
        break;

      case 'detected':
        // Unknown device detected - forward to AI learning service
        console.log(`[PresenceEngine] Unknown device detected: ${event.deviceName}`);
        aiDeviceLearning.onDeviceDetected(
          event.deviceMac,
          event.deviceName,
          'bluetooth',
          event.rssi
        ).catch(err => {
          console.error('[PresenceEngine] Failed to report device to AI learning:', err);
        });
        break;
    }

    // Also notify AI learning for resident devices (for tracking)
    if (event.type === 'arrived' || event.type === 'departed') {
      aiDeviceLearning.onDeviceDetected(
        event.deviceMac,
        event.deviceName,
        'bluetooth',
        event.rssi
      ).catch(err => {
        console.error('[PresenceEngine] Failed to report resident device:', err);
      });
    }

    if (this.hasStateChanged(previousState)) {
      this.emitStateChange();
    }
  }

  private handleDisruptionEvent(event: DisruptionEvent): void {
    const source = this.sources.get('disruption')!;
    source.lastEvent = event.timestamp;

    this.presenceState.lastMovementTime = event.timestamp;

    if (event.location) {
      // Update current zones
      this.presenceState.currentZones = [event.location];
    }

    // If no residents present but movement detected, potential intrusion
    if (this.presenceState.residentsPresent.length === 0 && event.confidence > 0.5) {
      this.presenceState.unknownPresenceDetected = true;
      this.triggerPendingIntrusion(event.confidence, ['disruption'], event.location);
    }

    // Emit movement event
    this.emit('presence', {
      type: 'movement_detected',
      residentsPresent: [...this.presenceState.residentsPresent],
      unknownPresence: this.presenceState.unknownPresenceDetected,
      location: event.location,
      confidence: event.confidence,
      sources: ['disruption'],
      timestamp: event.timestamp
    } as HumanPresenceEvent);
  }

  private async handleTriangulationEvent(event: TriangulationEvent): Promise<void> {
    const source = this.sources.get('triangulation')!;
    source.lastEvent = event.timestamp;

    this.presenceState.lastMovementTime = event.timestamp;
    this.presenceState.estimatedPosition = event.estimatedPosition;
    this.presenceState.currentZones = event.affectedZones;

    // Forward position to smart departure detection for resident tracking
    // This enables exit zone tracking and smart departure detection
    for (const residentId of this.presenceState.residentsPresent) {
      try {
        // Get resident's device info
        const devices = await storage.getResidentDevices(residentId);
        const residents = await storage.getResidents();
        const resident = residents.find(r => r.id === residentId);

        if (devices.length > 0 && resident) {
          // Use estimated RSSI based on confidence (rough approximation)
          const estimatedRssi = -40 - (1 - event.confidence) * 40;

          smartDepartureDetection.updateDevicePosition(
            devices[0].macAddress,
            event.estimatedPosition,
            estimatedRssi,
            residentId,
            resident.name
          );
        }
      } catch (err) {
        // Continue tracking other residents
      }
    }

    // If no residents present but movement detected, potential intrusion
    if (this.presenceState.residentsPresent.length === 0 && event.confidence > 0.4) {
      this.presenceState.unknownPresenceDetected = true;
      const location = event.affectedZones.length > 0 ? event.affectedZones.join(', ') : undefined;
      this.triggerPendingIntrusion(event.confidence, ['triangulation'], location);
    }

    // Emit appropriate event
    this.emit('presence', {
      type: event.type === 'zone_entry' || event.type === 'zone_exit' ? 'movement_detected' : 'movement_detected',
      residentsPresent: [...this.presenceState.residentsPresent],
      unknownPresence: this.presenceState.unknownPresenceDetected,
      location: event.affectedZones.join(', '),
      position: event.estimatedPosition,
      confidence: event.confidence,
      sources: ['triangulation'],
      timestamp: event.timestamp
    } as HumanPresenceEvent);
  }

  private triggerPendingIntrusion(confidence: number, sources: string[], location?: string): void {
    // Don't trigger if residents are present
    if (this.presenceState.residentsPresent.length > 0) {
      return;
    }

    // Don't trigger if already pending
    if (this.pendingIntrusionTimer) {
      return;
    }

    console.log('[PresenceEngine] Potential intrusion detected, waiting for confirmation...');

    this.pendingIntrusionTimer = setTimeout(() => {
      // Recheck - still no residents and still detecting presence
      if (this.presenceState.residentsPresent.length === 0 &&
        this.presenceState.unknownPresenceDetected) {

        this.emit('presence', {
          type: 'intrusion_detected',
          residentsPresent: [],
          unknownPresence: true,
          location,
          confidence,
          sources,
          timestamp: new Date()
        } as HumanPresenceEvent);

        console.log('[PresenceEngine] INTRUSION ALERT: Unknown presence detected!');
      }

      this.pendingIntrusionTimer = null;
    }, this.intrusionDelay);
  }

  private cancelPendingIntrusion(): void {
    if (this.pendingIntrusionTimer) {
      clearTimeout(this.pendingIntrusionTimer);
      this.pendingIntrusionTimer = null;
      console.log('[PresenceEngine] Pending intrusion alert cancelled - resident detected');
    }
  }

  private evaluateState(): void {
    const now = Date.now();
    const previousState = { ...this.presenceState };

    // Clear unknown presence if no movement for a while
    if (this.presenceState.unknownPresenceDetected &&
      this.presenceState.lastMovementTime) {
      const timeSinceMovement = now - this.presenceState.lastMovementTime.getTime();
      if (timeSinceMovement > this.movementTimeout) {
        this.presenceState.unknownPresenceDetected = false;
        this.presenceState.currentZones = [];
        this.presenceState.estimatedPosition = null;

        this.emit('presence', {
          type: 'all_clear',
          residentsPresent: [...this.presenceState.residentsPresent],
          unknownPresence: false,
          confidence: 0.7,
          sources: ['timeout'],
          timestamp: new Date()
        } as HumanPresenceEvent);
      }
    }

    // Update confidence based on source activity
    this.presenceState.confidence = this.calculateOverallConfidence();

    if (this.hasStateChanged(previousState)) {
      this.emitStateChange();
    }
  }

  private calculateOverallConfidence(): number {
    const now = Date.now();
    let totalWeight = 0;
    let weightedConfidence = 0;

    for (const source of this.sources.values()) {
      if (!source.isActive) continue;

      let sourceConfidence = 0;
      if (source.lastEvent) {
        const age = now - source.lastEvent.getTime();
        // Decay confidence over time (1 minute decay)
        sourceConfidence = Math.max(0, 1 - age / 60000);
      }

      weightedConfidence += sourceConfidence * source.weight;
      totalWeight += source.weight;
    }

    return totalWeight > 0 ? weightedConfidence / totalWeight : 0;
  }

  private hasStateChanged(previous: PresenceState): boolean {
    return previous.anyoneHome !== this.presenceState.anyoneHome ||
      previous.unknownPresenceDetected !== this.presenceState.unknownPresenceDetected ||
      previous.residentsPresent.length !== this.presenceState.residentsPresent.length ||
      previous.currentZones.join(',') !== this.presenceState.currentZones.join(',');
  }

  private emitStateChange(): void {
    this.emit('presence', {
      type: 'presence_state_changed',
      residentsPresent: [...this.presenceState.residentsPresent],
      unknownPresence: this.presenceState.unknownPresenceDetected,
      location: this.presenceState.currentZones.join(', ') || undefined,
      position: this.presenceState.estimatedPosition || undefined,
      confidence: this.presenceState.confidence,
      sources: Array.from(this.sources.values())
        .filter(s => s.isActive)
        .map(s => s.name.toLowerCase()),
      timestamp: new Date()
    } as HumanPresenceEvent);
  }

  // Public API methods
  getPresenceState(): PresenceState {
    return { ...this.presenceState };
  }

  isAnyoneHome(): boolean {
    return this.presenceState.anyoneHome;
  }

  getResidentsPresent(): number[] {
    return [...this.presenceState.residentsPresent];
  }

  isIntrusionDetected(): boolean {
    return this.presenceState.unknownPresenceDetected &&
      this.presenceState.residentsPresent.length === 0;
  }

  getSourceStatus(): Map<string, DetectionSource> {
    return new Map(this.sources);
  }

  getEstimatedPosition(): { x: number; y: number } | null {
    return this.presenceState.estimatedPosition;
  }

  getCurrentZones(): string[] {
    return [...this.presenceState.currentZones];
  }

  isRunningStatus(): boolean {
    return this.isRunning;
  }

  // Configuration methods
  async registerResidentDevice(macAddress: string, residentId: number, deviceName: string): Promise<void> {
    await bluetoothPresence.registerResidentDevice(macAddress, residentId, deviceName);
  }

  setMovementTimeout(timeoutMs: number): void {
    this.movementTimeout = timeoutMs;
  }

  setIntrusionDelay(delayMs: number): void {
    this.intrusionDelay = delayMs;
  }
}

export const humanPresenceEngine = HumanPresenceEngine.getInstance();
