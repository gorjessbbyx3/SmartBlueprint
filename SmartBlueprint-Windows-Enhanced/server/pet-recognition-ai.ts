/**
 * Pet Recognition AI System
 * Identifies pets through device interactions and movement patterns
 */

export interface PetDetection {
  id: string;
  petType: 'dog' | 'cat' | 'bird' | 'rabbit' | 'other';
  confidence: number;
  location: { x: number; y: number };
  timestamp: Date;
  detectionMethod: 'motion_pattern' | 'device_interaction' | 'sensor_trigger' | 'camera_vision';
  deviceTriggers: string[];
  movementPattern: MovementPattern;
  size: 'small' | 'medium' | 'large';
  activityLevel: number; // 0-1 scale
}

export interface MovementPattern {
  speed: number; // meters per second
  direction: number; // degrees
  pathType: 'linear' | 'circular' | 'erratic' | 'stationary';
  repeatability: number; // 0-1 scale for pattern consistency
  timeOfDay: number[]; // hours when most active
  zones: string[]; // areas frequently visited
}

export interface PetDevice {
  deviceId: string;
  deviceType: 'feeder' | 'water_fountain' | 'camera' | 'door' | 'toy' | 'tracker' | 'litter_box';
  petAssociated: string[]; // pet IDs
  lastInteraction: Date;
  interactionFrequency: number; // per day
  brand: string;
  location: { x: number; y: number };
}

export interface PetBehaviorPattern {
  petId: string;
  feedingTimes: Date[];
  sleepPattern: { start: Date; end: Date }[];
  playTimes: Date[];
  outdoorActivity: Date[];
  socialInteraction: Date[];
  stressIndicators: string[];
}

export class PetRecognitionAI {
  private detectedPets: Map<string, PetDetection> = new Map();
  private petDevices: Map<string, PetDevice> = new Map();
  private behaviorPatterns: Map<string, PetBehaviorPattern> = new Map();
  private movementHistory: Map<string, MovementPattern[]> = new Map();

  constructor() {
    this.initializePetDeviceDatabase();
  }

  /**
   * Identify pets through network device interactions
   */
  async identifyPetsFromDevices(devices: any[]): Promise<PetDetection[]> {
    const petDetections: PetDetection[] = [];

    for (const device of devices) {
      const petDevice = this.classifyPetDevice(device);
      if (petDevice) {
        this.petDevices.set(device.id, petDevice);
        
        // Analyze interaction patterns
        const detection = await this.analyzePetInteraction(device, petDevice);
        if (detection) {
          petDetections.push(detection);
          this.detectedPets.set(detection.id, detection);
        }
      }
    }

    return petDetections;
  }

  /**
   * Classify device as pet-related
   */
  private classifyPetDevice(device: any): PetDevice | null {
    const petDevicePatterns = {
      feeder: ['petnet', 'surefeed', 'whistle', 'petkit', 'feeder', 'food', 'bowl'],
      water_fountain: ['catit', 'drinkwell', 'fountain', 'water', 'hydration'],
      camera: ['furbo', 'petcube', 'wyze', 'pet', 'camera', 'monitor'],
      door: ['sureflap', 'petporte', 'cat', 'dog', 'door', 'flap'],
      toy: ['petcube', 'ifetch', 'toy', 'laser', 'interactive', 'play'],
      tracker: ['whistle', 'fitbark', 'tractive', 'gps', 'tracker', 'collar'],
      litter_box: ['litter', 'robot', 'scoop', 'petmate', 'catgenie']
    };

    const deviceName = (device.name || device.hostname || '').toLowerCase();
    const vendor = (device.vendor || '').toLowerCase();
    const combined = `${deviceName} ${vendor}`;

    for (const [type, patterns] of Object.entries(petDevicePatterns)) {
      if (patterns.some(pattern => combined.includes(pattern))) {
        return {
          deviceId: device.id,
          deviceType: type as any,
          petAssociated: [],
          lastInteraction: new Date(),
          interactionFrequency: 0,
          brand: device.vendor || 'Unknown',
          location: device.location || { x: 0, y: 0 }
        };
      }
    }

    return null;
  }

  /**
   * Analyze pet interaction with device
   */
  private async analyzePetInteraction(device: any, petDevice: PetDevice): Promise<PetDetection | null> {
    const interactions = this.getDeviceInteractionHistory(device.id);
    
    if (interactions.length === 0) return null;

    // Analyze interaction patterns to infer pet characteristics
    const petType = this.inferPetTypeFromDevice(petDevice, interactions);
    const movementPattern = this.analyzeMovementFromInteractions(interactions);
    const size = this.inferPetSizeFromInteractions(interactions, petDevice);

    const detection: PetDetection = {
      id: `pet_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      petType,
      confidence: this.calculateDetectionConfidence(petDevice, interactions),
      location: petDevice.location,
      timestamp: new Date(),
      detectionMethod: 'device_interaction',
      deviceTriggers: [device.id],
      movementPattern,
      size,
      activityLevel: this.calculateActivityLevel(interactions)
    };

    return detection;
  }

  /**
   * Infer pet type from device usage patterns
   */
  private inferPetTypeFromDevice(petDevice: PetDevice, interactions: any[]): 'dog' | 'cat' | 'bird' | 'rabbit' | 'other' {
    switch (petDevice.deviceType) {
      case 'litter_box':
        return 'cat';
      case 'door':
        // Pet doors are more common for cats and small dogs
        return Math.random() > 0.6 ? 'cat' : 'dog';
      case 'feeder':
        // Analyze feeding frequency and amount
        const avgDailyFeedings = interactions.length / 7; // assuming week of data
        if (avgDailyFeedings > 3) return 'cat'; // Cats eat more frequently
        return 'dog';
      case 'toy':
        // Interactive toys more common with dogs
        return 'dog';
      case 'water_fountain':
        return 'cat'; // Cats prefer moving water
      default:
        return 'other';
    }
  }

  /**
   * Analyze movement patterns from device interactions
   */
  private analyzeMovementFromInteractions(interactions: any[]): MovementPattern {
    // Simulate movement analysis from interaction timestamps and locations
    const timeIntervals = interactions.map((_, i, arr) => 
      i > 0 ? arr[i].timestamp - arr[i-1].timestamp : 0
    ).filter(t => t > 0);

    const avgSpeed = timeIntervals.length > 0 ? 
      Math.random() * 2 + 0.5 : 1.0; // 0.5-2.5 m/s

    const activeHours = interactions.map(i => new Date(i.timestamp).getHours());
    const uniqueHours = Array.from(new Set(activeHours));

    return {
      speed: avgSpeed,
      direction: Math.random() * 360,
      pathType: this.determinePathType(interactions),
      repeatability: Math.random() * 0.8 + 0.2, // 0.2-1.0
      timeOfDay: uniqueHours,
      zones: this.identifyFrequentZones(interactions)
    };
  }

  /**
   * Determine movement path type from interactions
   */
  private determinePathType(interactions: any[]): 'linear' | 'circular' | 'erratic' | 'stationary' {
    if (interactions.length < 3) return 'stationary';
    
    // Analyze spatial distribution of interactions
    const locations = interactions.map(i => i.location).filter(Boolean);
    if (locations.length < 2) return 'stationary';

    const variance = this.calculateLocationVariance(locations);
    
    if (variance < 1) return 'stationary';
    if (variance < 5) return 'circular';
    if (variance < 15) return 'linear';
    return 'erratic';
  }

  /**
   * Calculate variance in location data
   */
  private calculateLocationVariance(locations: any[]): number {
    if (locations.length < 2) return 0;

    const avgX = locations.reduce((sum, loc) => sum + (loc.x || 0), 0) / locations.length;
    const avgY = locations.reduce((sum, loc) => sum + (loc.y || 0), 0) / locations.length;

    const variance = locations.reduce((sum, loc) => {
      const dx = (loc.x || 0) - avgX;
      const dy = (loc.y || 0) - avgY;
      return sum + (dx * dx + dy * dy);
    }, 0) / locations.length;

    return Math.sqrt(variance);
  }

  /**
   * Identify frequently visited zones
   */
  private identifyFrequentZones(interactions: any[]): string[] {
    const zones = ['kitchen', 'living_room', 'bedroom', 'bathroom'];
    return zones.filter(() => Math.random() > 0.6); // Simulate zone detection
  }

  /**
   * Infer pet size from interaction patterns
   */
  private inferPetSizeFromInteractions(interactions: any[], petDevice: PetDevice): 'small' | 'medium' | 'large' {
    switch (petDevice.deviceType) {
      case 'feeder':
        // Analyze feeding amounts and frequency
        const avgDailyInteractions = interactions.length / 7;
        if (avgDailyInteractions > 4) return 'small'; // Small pets eat more frequently
        if (avgDailyInteractions < 2) return 'large'; // Large pets eat less frequently
        return 'medium';
      
      case 'door':
        // Pet door size might indicate pet size
        return Math.random() > 0.5 ? 'small' : 'medium'; // Most pet doors for small-medium pets
      
      case 'toy':
        // Interactive toy usage patterns
        const interactionDuration = interactions.reduce((sum, i) => sum + (i.duration || 5), 0) / interactions.length;
        if (interactionDuration > 10) return 'large'; // Larger pets play longer
        return 'small';
      
      default:
        return 'medium';
    }
  }

  /**
   * Calculate detection confidence based on available data
   */
  private calculateDetectionConfidence(petDevice: PetDevice, interactions: any[]): number {
    let confidence = 0.3; // Base confidence

    // More interactions = higher confidence
    confidence += Math.min(interactions.length * 0.1, 0.4);

    // Device type specificity
    const specificityScores = {
      litter_box: 0.9, // Very specific to cats
      feeder: 0.7,
      water_fountain: 0.6,
      door: 0.8,
      toy: 0.5,
      tracker: 0.9,
      camera: 0.4
    };

    confidence += specificityScores[petDevice.deviceType] || 0.3;

    return Math.min(confidence, 0.95); // Cap at 95%
  }

  /**
   * Calculate activity level from interactions
   */
  private calculateActivityLevel(interactions: any[]): number {
    const dailyInteractions = interactions.length / 7; // Assuming week of data
    
    // Normalize to 0-1 scale
    // 0-2 interactions/day = low (0-0.3)
    // 2-8 interactions/day = medium (0.3-0.7)
    // 8+ interactions/day = high (0.7-1.0)
    
    if (dailyInteractions <= 2) return dailyInteractions / 2 * 0.3;
    if (dailyInteractions <= 8) return 0.3 + ((dailyInteractions - 2) / 6) * 0.4;
    return 0.7 + Math.min((dailyInteractions - 8) / 10, 0.3);
  }

  /**
   * Get device interaction history (simulated)
   */
  private getDeviceInteractionHistory(deviceId: string): any[] {
    // Simulate interaction history
    const interactions = [];
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    for (let i = 0; i < 7; i++) { // 7 days of data
      const dayStart = now - (i * dayMs);
      const interactionsPerDay = Math.floor(Math.random() * 6) + 1;

      for (let j = 0; j < interactionsPerDay; j++) {
        interactions.push({
          timestamp: dayStart + Math.random() * dayMs,
          duration: Math.random() * 10 + 2, // 2-12 minutes
          location: {
            x: Math.random() * 100,
            y: Math.random() * 100
          }
        });
      }
    }

    return interactions.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Initialize database of known pet device patterns
   */
  private initializePetDeviceDatabase(): void {
    // This would typically load from a database
    console.log('[Pet Recognition AI] Initialized with pet device recognition patterns');
  }

  /**
   * Analyze behavior patterns for pet health insights
   */
  async analyzePetBehavior(petId: string): Promise<{
    healthScore: number;
    insights: string[];
    recommendations: string[];
  }> {
    const pet = this.detectedPets.get(petId);
    if (!pet) {
      throw new Error('Pet not found');
    }

    const behavior = this.behaviorPatterns.get(petId);
    const insights: string[] = [];
    const recommendations: string[] = [];
    let healthScore = 0.8; // Base health score

    // Analyze activity level
    if (pet.activityLevel < 0.3) {
      insights.push('Low activity level detected');
      recommendations.push('Consider increasing playtime and exercise');
      healthScore -= 0.1;
    } else if (pet.activityLevel > 0.8) {
      insights.push('High activity level - very healthy!');
      healthScore += 0.1;
    }

    // Analyze movement patterns
    if (pet.movementPattern.pathType === 'erratic') {
      insights.push('Erratic movement patterns may indicate stress');
      recommendations.push('Check for environmental stressors');
      healthScore -= 0.15;
    }

    // Pet-specific analysis
    if (pet.petType === 'cat' && (pet.movementPattern.timeOfDay.includes(2) || pet.movementPattern.timeOfDay.includes(3) || pet.movementPattern.timeOfDay.includes(4))) {
      insights.push('Nocturnal activity pattern detected - typical for cats');
    }

    if (pet.petType === 'dog' && pet.activityLevel > 0.6) {
      insights.push('Good exercise levels for canine health');
    }

    return {
      healthScore: Math.max(0, Math.min(1, healthScore)),
      insights,
      recommendations
    };
  }

  /**
   * Get all detected pets
   */
  getDetectedPets(): PetDetection[] {
    return Array.from(this.detectedPets.values());
  }

  /**
   * Get pet devices
   */
  getPetDevices(): PetDevice[] {
    return Array.from(this.petDevices.values());
  }

  /**
   * Update pet detection with new data
   */
  updatePetDetection(petId: string, updates: Partial<PetDetection>): void {
    const pet = this.detectedPets.get(petId);
    if (pet) {
      Object.assign(pet, updates);
      this.detectedPets.set(petId, pet);
    }
  }
}

export const petRecognitionAI = new PetRecognitionAI();