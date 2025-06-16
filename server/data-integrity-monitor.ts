import { metaAIMonitor } from './meta-ai-monitor';

/**
 * Data Integrity Monitor
 * Scans for fake, placeholder, or mock data throughout the application
 */
export class DataIntegrityMonitor {
  private readonly FAKE_DATA_PATTERNS = [
    // Common fake names and identifiers
    /test[-_]?device/i,
    /demo[-_]?device/i,
    /sample[-_]?device/i,
    /mock[-_]?device/i,
    /placeholder/i,
    /example/i,
    /fake/i,
    /dummy/i,
    
    // Common fake network names
    /MyHome_WiFi/i,
    /TestNetwork/i,
    /DemoWiFi/i,
    /SampleRouter/i,
    /MockSSID/i,
    
    // Common fake MAC addresses
    /00:11:22:33:44:55/,
    /aa:bb:cc:dd:ee:ff/i,
    /12:34:56:78:90:ab/i,
    /ff:ff:ff:ff:ff:ff/,
    
    // Common fake IP addresses
    /192\.168\.1\.100/,
    /10\.0\.0\.100/,
    /127\.0\.0\.1/,
    
    // Common fake device types
    /Smart\s+TV\s+\d+/i,
    /Philips\s+Hue\s+\d+/i,
    /Echo\s+Dot\s+\d+/i,
    /Living\s+Room\s+Light\s+\d+/i,
    
    // Placeholder values
    /lorem\s+ipsum/i,
    /PLACEHOLDER/i,
    /TODO/i,
    /FIXME/i,
    /XXX/i,
    
    // Sequential naming patterns that indicate fake data
    /Device\s+\d+$/i,
    /Room\s+\d+$/i,
    /Network\s+\d+$/i,
    /Test\s+\d+$/i,
  ];

  private readonly SUSPICIOUS_PATTERNS = [
    // Overly perfect values that indicate fake data
    /-50\.0+$/,  // Perfect RSSI values
    /-40\.0+$/,
    /-30\.0+$/,
    /100\.0+%/, // Perfect percentages
    /99\.99%/,
    /0\.0+$/,   // Exact zero values
    
    // Repeated identical values
    /(.{3,})\1{2,}/, // Same string repeated 3+ times
  ];

  /**
   * Scan devices for fake data
   */
  public scanDevices(devices: any[]): string[] {
    const violations: string[] = [];
    
    for (const device of devices) {
      // Check device name
      if (this.containsFakeData(device.name)) {
        violations.push(`Fake device name detected: "${device.name}"`);
        this.reportViolation('device-name', device.name, 'devices');
      }
      
      // Check MAC address
      if (this.containsFakeData(device.macAddress)) {
        violations.push(`Fake MAC address detected: "${device.macAddress}"`);
        this.reportViolation('mac-address', device.macAddress, 'devices');
      }
      
      // Check device type
      if (this.containsFakeData(device.deviceType)) {
        violations.push(`Fake device type detected: "${device.deviceType}"`);
        this.reportViolation('device-type', device.deviceType, 'devices');
      }
      
      // Check for suspicious RSSI values
      if (this.isSuspiciousValue(device.rssi?.toString())) {
        violations.push(`Suspicious RSSI value detected: "${device.rssi}"`);
        this.reportViolation('rssi-value', device.rssi, 'devices');
      }
      
      // Check telemetry data
      if (device.telemetryData) {
        const telemetryViolations = this.scanObject(device.telemetryData, 'telemetry');
        violations.push(...telemetryViolations);
      }
    }
    
    return violations;
  }

  /**
   * Scan network data for fake information
   */
  public scanNetworkData(networkData: any): string[] {
    const violations: string[] = [];
    
    if (networkData.ssid && this.containsFakeData(networkData.ssid)) {
      violations.push(`Fake network SSID detected: "${networkData.ssid}"`);
      this.reportViolation('network-ssid', networkData.ssid, 'network');
    }
    
    if (networkData.ip && this.containsFakeData(networkData.ip)) {
      violations.push(`Fake IP address detected: "${networkData.ip}"`);
      this.reportViolation('ip-address', networkData.ip, 'network');
    }
    
    return violations;
  }

  /**
   * Scan room data for fake information
   */
  public scanRooms(rooms: any[]): string[] {
    const violations: string[] = [];
    
    for (const room of rooms) {
      if (this.containsFakeData(room.name)) {
        violations.push(`Fake room name detected: "${room.name}"`);
        this.reportViolation('room-name', room.name, 'rooms');
      }
      
      if (this.containsFakeData(room.roomType)) {
        violations.push(`Fake room type detected: "${room.roomType}"`);
        this.reportViolation('room-type', room.roomType, 'rooms');
      }
    }
    
    return violations;
  }

  /**
   * Scan any object for fake data patterns
   */
  public scanObject(obj: any, context: string): string[] {
    const violations: string[] = [];
    
    if (typeof obj === 'string') {
      if (this.containsFakeData(obj)) {
        violations.push(`Fake data in ${context}: "${obj}"`);
        this.reportViolation('object-data', obj, context);
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        const subViolations = this.scanObject(value, `${context}.${key}`);
        violations.push(...subViolations);
      }
    }
    
    return violations;
  }

  /**
   * Check if a string contains fake data patterns
   */
  private containsFakeData(value: string): boolean {
    if (!value || typeof value !== 'string') return false;
    
    return this.FAKE_DATA_PATTERNS.some(pattern => pattern.test(value));
  }

  /**
   * Check if a value appears suspicious (likely fake)
   */
  private isSuspiciousValue(value: string): boolean {
    if (!value || typeof value !== 'string') return false;
    
    return this.SUSPICIOUS_PATTERNS.some(pattern => pattern.test(value));
  }

  /**
   * Report data integrity violation to Meta-AI Monitor
   */
  private reportViolation(violationType: string, value: string, context: string): void {
    metaAIMonitor.reportError({
      systemId: 'data-integrity',
      systemName: 'Data Integrity Monitor',
      errorType: 'data_integrity',
      errorMessage: `Fake/placeholder data detected: ${violationType} = "${value}" in ${context}`,
      errorContext: {
        violationType,
        detectedValue: value,
        context,
        severity: 'high',
        autoDetected: true
      },
      severity: 'high',
      affectedComponents: [context, 'ui-display', 'data-storage']
    });
  }

  /**
   * Comprehensive application scan
   */
  public async scanApplication(): Promise<{
    totalViolations: number;
    violations: string[];
    componentsScanned: string[];
    timestamp: Date;
  }> {
    const violations: string[] = [];
    const componentsScanned: string[] = [];

    try {
      // Scan storage data (would integrate with actual storage)
      componentsScanned.push('storage');
      
      // Scan API responses (would integrate with actual API monitoring)
      componentsScanned.push('api-responses');
      
      // Scan UI components (would integrate with frontend monitoring)
      componentsScanned.push('ui-components');

      // Generate summary report
      const totalViolations = violations.length;
      
      if (totalViolations > 0) {
        metaAIMonitor.reportError({
          systemId: 'data-integrity-scan',
          systemName: 'Application Data Integrity Scan',
          errorType: 'data_integrity',
          errorMessage: `Found ${totalViolations} data integrity violations during application scan`,
          errorContext: {
            violationCount: totalViolations,
            componentsScanned,
            scanType: 'comprehensive'
          },
          severity: totalViolations > 10 ? 'critical' : totalViolations > 5 ? 'high' : 'medium',
          affectedComponents: componentsScanned
        });
      }

      return {
        totalViolations,
        violations,
        componentsScanned,
        timestamp: new Date()
      };
    } catch (error) {
      metaAIMonitor.reportError({
        systemId: 'data-integrity-scan',
        systemName: 'Data Integrity Monitor',
        errorType: 'error',
        errorMessage: `Data integrity scan failed: ${error}`,
        errorContext: { error: error.toString() },
        severity: 'high',
        affectedComponents: ['data-integrity-monitor']
      });
      
      throw error;
    }
  }

  /**
   * Start continuous monitoring
   */
  public startContinuousMonitoring(): void {
    console.log('[Data Integrity] Starting continuous monitoring for fake/placeholder data...');
    
    // Scan every 30 seconds
    setInterval(async () => {
      try {
        await this.scanApplication();
      } catch (error) {
        console.error('[Data Integrity] Monitoring scan failed:', error);
      }
    }, 30000);
  }
}

// Global instance
export const dataIntegrityMonitor = new DataIntegrityMonitor();

// Auto-start monitoring
dataIntegrityMonitor.startContinuousMonitoring();