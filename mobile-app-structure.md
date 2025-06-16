# SmartBlueprint Pro - Android Mobile Ping App

## Overview
Native Android application for real-time ping measurements and network analysis that integrates with the SmartBlueprint Pro platform.

## Core Features
- **Real-time Ping Measurements**: RTT measurement to multiple targets
- **WiFi Signal Analysis**: RSSI monitoring and network quality assessment
- **Location-based Analytics**: GPS positioning for spatial network mapping
- **Background Monitoring**: Continuous telemetry collection
- **WebSocket Integration**: Real-time data streaming to SmartBlueprint Pro
- **Trust Zone Management**: Network security classification
- **Battery Optimization**: Power-efficient scanning algorithms

## Technical Architecture

### Android Components
```
app/
├── src/main/java/com/smartblueprint/
│   ├── activities/
│   │   ├── MainActivity.kt
│   │   ├── SettingsActivity.kt
│   │   └── NetworkAnalysisActivity.kt
│   ├── services/
│   │   ├── PingService.kt
│   │   ├── NetworkMonitorService.kt
│   │   └── WebSocketService.kt
│   ├── models/
│   │   ├── PingResult.kt
│   │   ├── NetworkInfo.kt
│   │   └── DeviceConfig.kt
│   ├── network/
│   │   ├── PingManager.kt
│   │   ├── WebSocketClient.kt
│   │   └── ApiClient.kt
│   ├── utils/
│   │   ├── LocationHelper.kt
│   │   ├── NetworkUtils.kt
│   │   └── PermissionManager.kt
│   └── ui/
│       ├── fragments/
│       ├── adapters/
│       └── views/
├── src/main/res/
│   ├── layout/
│   ├── values/
│   └── drawable/
└── build.gradle
```

### Key Dependencies
```gradle
dependencies {
    implementation 'androidx.core:core-ktx:1.10.1'
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.9.0'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
    
    // WebSocket
    implementation 'org.java-websocket:Java-WebSocket:1.5.3'
    
    // JSON
    implementation 'com.google.code.gson:gson:2.10.1'
    
    // Location Services
    implementation 'com.google.android.gms:play-services-location:21.0.1'
    
    // Network
    implementation 'com.squareup.okhttp3:okhttp:4.11.0'
    
    // Background Work
    implementation 'androidx.work:work-runtime-ktx:2.8.1'
    
    // Charts (for network visualization)
    implementation 'com.github.PhilJay:MPAndroidChart:v3.1.0'
}
```

## Implementation Details

### 1. Ping Measurement Engine
```kotlin
class PingManager {
    private val executor = Executors.newCachedThreadPool()
    
    suspend fun performPing(host: String, timeout: Int = 5000): PingResult {
        return withContext(Dispatchers.IO) {
            val startTime = System.currentTimeMillis()
            val process = Runtime.getRuntime().exec("ping -c 1 -W $timeout $host")
            val exitCode = process.waitFor()
            val endTime = System.currentTimeMillis()
            
            PingResult(
                host = host,
                rtt = if (exitCode == 0) endTime - startTime else -1,
                success = exitCode == 0,
                timestamp = System.currentTimeMillis()
            )
        }
    }
}
```

### 2. WebSocket Integration
```kotlin
class WebSocketService : Service() {
    private var webSocketClient: WebSocketClient? = null
    
    private fun connectToServer() {
        val uri = URI("wss://your-domain.replit.app/ws/mobile")
        webSocketClient = object : WebSocketClient(uri) {
            override fun onOpen(handshake: ServerHandshake?) {
                Log.d("WebSocket", "Connected to SmartBlueprint Pro")
                registerDevice()
            }
            
            override fun onMessage(message: String?) {
                handleServerMessage(message)
            }
            
            override fun onClose(code: Int, reason: String?, remote: Boolean) {
                Log.d("WebSocket", "Connection closed: $reason")
                scheduleReconnect()
            }
        }
        webSocketClient?.connect()
    }
    
    private fun sendPingData(pingData: PingData) {
        val json = Gson().toJson(pingData)
        webSocketClient?.send(json)
    }
}
```

### 3. Background Service
```kotlin
class NetworkMonitorService : Service() {
    private val handler = Handler(Looper.getMainLooper())
    private val pingRunnable = object : Runnable {
        override fun run() {
            performNetworkScan()
            handler.postDelayed(this, 30000) // 30-second intervals
        }
    }
    
    private fun performNetworkScan() {
        CoroutineScope(Dispatchers.IO).launch {
            val location = getCurrentLocation()
            val wifiInfo = getWiFiInfo()
            val pingResults = performPingMeasurements()
            
            val telemetryData = TelemetryData(
                deviceId = getDeviceId(),
                timestamp = System.currentTimeMillis(),
                location = location,
                networkInfo = wifiInfo,
                pingResults = pingResults,
                batteryLevel = getBatteryLevel()
            )
            
            sendToServer(telemetryData)
        }
    }
}
```

### 4. Location Services
```kotlin
class LocationHelper(private val context: Context) {
    private val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)
    
    @SuppressLint("MissingPermission")
    suspend fun getCurrentLocation(): Location? {
        return suspendCoroutine { continuation ->
            fusedLocationClient.lastLocation
                .addOnSuccessListener { location ->
                    continuation.resume(location)
                }
                .addOnFailureListener { exception ->
                    continuation.resume(null)
                }
        }
    }
}
```

### 5. Network Analysis
```kotlin
class NetworkAnalyzer(private val context: Context) {
    fun getWiFiSignalStrength(): Int {
        val wifiManager = context.getSystemService(Context.WIFI_SERVICE) as WifiManager
        val wifiInfo = wifiManager.connectionInfo
        return wifiInfo.rssi
    }
    
    fun getNetworkInfo(): NetworkInfo {
        val wifiManager = context.getSystemService(Context.WIFI_SERVICE) as WifiManager
        val wifiInfo = wifiManager.connectionInfo
        
        return NetworkInfo(
            ssid = wifiInfo.ssid,
            bssid = wifiInfo.bssid,
            rssi = wifiInfo.rssi,
            frequency = wifiInfo.frequency,
            linkSpeed = wifiInfo.linkSpeed,
            networkId = wifiInfo.networkId
        )
    }
}
```

## User Interface

### Main Dashboard
- Real-time ping status indicators
- Network signal strength meter
- Current location display
- Connection status to SmartBlueprint Pro
- Data transmission statistics

### Settings Screen
- Server configuration (WebSocket URL)
- Ping targets configuration
- Scan interval settings
- Location permissions
- Battery optimization settings

### Network Analysis
- Historical ping data charts
- Signal strength trends
- Network quality assessment
- Trust zone status

## Permissions Required
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />
```

## Integration with SmartBlueprint Pro

### Data Flow
1. **Registration**: App registers with SmartBlueprint Pro server
2. **Configuration**: Receives ping targets and scan intervals
3. **Continuous Monitoring**: Performs background ping measurements
4. **Real-time Streaming**: Sends data via WebSocket
5. **Analytics**: Receives anomaly alerts and recommendations

### API Endpoints Used
- `POST /api/mobile/register` - Device registration
- `POST /api/mobile/ping` - Submit ping data
- `GET /api/mobile/devices` - Get device list
- `POST /api/mobile/trust` - Set trust levels
- `WebSocket /ws/mobile` - Real-time communication

## Security Features
- Device fingerprinting
- Encrypted data transmission
- Trust zone management
- Battery usage optimization
- Privacy-compliant location handling

## Development Roadmap
1. **Phase 1**: Core ping functionality and WebSocket integration
2. **Phase 2**: Location services and network analysis
3. **Phase 3**: Background monitoring and battery optimization
4. **Phase 4**: Advanced UI and data visualization
5. **Phase 5**: Trust management and security features

## Testing Strategy
- Unit tests for ping measurement accuracy
- Integration tests with SmartBlueprint Pro server
- Performance testing for battery usage
- Network simulation testing
- Location accuracy validation