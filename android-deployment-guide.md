# SmartBlueprint Pro - Android Mobile Ping App Deployment Guide

## Quick Start

### Prerequisites
- Android Studio Arctic Fox or later
- Android SDK 24+ (Android 7.0)
- Kotlin 1.8+
- Active SmartBlueprint Pro server instance

### Installation Steps

1. **Create New Android Project**
   ```bash
   # In Android Studio
   File → New → New Project
   Choose "Empty Compose Activity"
   Package name: com.smartblueprint.pingapp
   ```

2. **Replace Project Files**
   - Copy `SmartBlueprintPingApp.kt` to `app/src/main/java/com/smartblueprint/pingapp/`
   - Replace `AndroidManifest.xml` in `app/src/main/`
   - Replace `build.gradle` in `app/`

3. **Configure Server Connection**
   ```kotlin
   // In SmartBlueprintPingApp.kt, update server URL:
   private val serverUrl = "wss://YOUR_REPLIT_DOMAIN.replit.dev/ws/mobile"
   ```

4. **Build and Install**
   ```bash
   ./gradlew assembleDebug
   adb install app/build/outputs/apk/debug/app-debug.apk
   ```

## Key Features

### Real-time Ping Monitoring
- **Continuous Measurements**: 30-second intervals to multiple targets
- **Target Hosts**: Google DNS (8.8.8.8), Cloudflare (1.1.1.1), Local Gateway
- **Latency Tracking**: RTT measurement with packet loss detection
- **Background Operation**: Service continues when app is backgrounded

### SmartBlueprint Pro Integration
- **WebSocket Connection**: Real-time data streaming to dashboard
- **Device Registration**: Automatic registration with unique device ID
- **Telemetry Upload**: Location, network info, and ping results
- **Status Monitoring**: Connection health and data transmission stats

### Location-Based Analytics
- **GPS Positioning**: Accurate location for spatial network mapping
- **Network Context**: WiFi SSID, BSSID, signal strength (RSSI)
- **Movement Tracking**: Continuous location updates for mobility analysis
- **Battery Optimization**: Power-efficient location services

## App Architecture

### Core Components
```
MainActivity - Main UI and permission handling
NetworkMonitorService - Background ping monitoring
PingManager - Ping execution and result processing
WebSocketClient - Real-time server communication
LocationHelper - GPS and network location services
```

### Data Flow
1. **App Launch** → Permission requests → Service start
2. **Service Start** → WebSocket connection → Device registration
3. **Monitoring Loop** → Location + Network info → Ping execution
4. **Data Collection** → Telemetry packaging → Server transmission
5. **UI Updates** → Real-time statistics → Connection status

## Security & Privacy

### Data Protection
- **Device ID**: Uses Android secure ID (non-PII)
- **Location Data**: Optional collection with user consent
- **Network Info**: Local network details only (no external traffic)
- **Encrypted Transport**: WebSocket over TLS/SSL

### Permissions Required
```xml
ACCESS_FINE_LOCATION    - GPS positioning for network mapping
ACCESS_WIFI_STATE      - WiFi network information
INTERNET               - Server communication
FOREGROUND_SERVICE     - Background monitoring
```

## Testing & Validation

### Unit Testing
```bash
# Run unit tests
./gradlew test

# Test coverage report
./gradlew jacocoTestReport
```

### Integration Testing
```bash
# Test with SmartBlueprint Pro server
./gradlew connectedAndroidTest
```

### Performance Testing
- **Battery Usage**: Monitor with Android Battery Historian
- **Network Efficiency**: Track data usage in Settings
- **Memory Leaks**: Use Android Studio Memory Profiler

## Production Deployment

### APK Build
```bash
# Debug build
./gradlew assembleDebug

# Release build (signed)
./gradlew assembleRelease
```

### Play Store Preparation
1. **App Signing**: Configure keystore in `build.gradle`
2. **Privacy Policy**: Required for location permissions
3. **App Description**: Focus on network monitoring capabilities
4. **Screenshots**: Show ping monitoring and statistics

### Server Configuration
```javascript
// Update CORS settings for mobile app
app.use(cors({
  origin: ['https://your-domain.com', 'android-app://com.smartblueprint.pingapp'],
  credentials: true
}));
```

## Configuration Options

### App Settings
```kotlin
// Default ping targets (customizable)
val pingTargets = listOf(
    "8.8.8.8",      // Google DNS
    "1.1.1.1",     // Cloudflare DNS
    "192.168.1.1"  // Local gateway
)

// Monitoring intervals
val pingInterval = 30000L  // 30 seconds
val locationUpdateInterval = 60000L  // 1 minute
```

### Server Integration
```javascript
// Register new mobile ping endpoint
app.post('/api/mobile/ping', async (req, res) => {
  const { device_id, ping_results, location, network_info } = req.body;
  
  // Process mobile ping data
  await processMobilePingData({
    deviceId: device_id,
    timestamp: Date.now(),
    pingResults: ping_results,
    location: location,
    networkInfo: network_info
  });
  
  res.json({ status: 'success' });
});
```

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   ```
   Solution: Check server URL and network connectivity
   Verify: Server CORS settings allow mobile app origin
   ```

2. **Location Permission Denied**
   ```
   Solution: Request permissions in Activity onCreate
   Check: Android 6.0+ runtime permissions granted
   ```

3. **Ping Command Not Found**
   ```
   Solution: Use Java-based ping implementation
   Alternative: OkHttp with timeout measurement
   ```

4. **Background Service Killed**
   ```
   Solution: Request battery optimization exemption
   Implementation: Foreground service with notification
   ```

### Debug Logging
```kotlin
// Enable debug logging
Log.d("SmartBlueprint", "Ping result: $result")
Log.d("WebSocket", "Connection status: $status")
Log.d("Location", "Current position: $lat, $lng")
```

## Performance Optimization

### Battery Efficiency
- **Adaptive Intervals**: Increase ping interval when stationary
- **WiFi-Only Mode**: Disable cellular ping measurements
- **Sleep Mode**: Pause monitoring during device sleep

### Network Optimization
- **Batch Uploads**: Collect multiple ping results before transmission
- **Compression**: Use GZIP for large telemetry payloads
- **Retry Logic**: Exponential backoff for failed connections

## Future Enhancements

### Planned Features
- **Custom Ping Targets**: User-configurable server list
- **Historical Charts**: Local storage with data visualization
- **Network Diagnostics**: Traceroute and DNS lookup tools
- **Geofencing**: Location-based monitoring rules
- **Mesh Networking**: Peer-to-peer ping coordination

### Integration Roadmap
- **SmartBlueprint API**: Full REST API integration
- **Machine Learning**: On-device anomaly detection
- **Cloud Sync**: Offline data synchronization
- **Multi-Device**: Cross-device ping coordination