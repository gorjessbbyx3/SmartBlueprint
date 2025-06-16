package com.smartblueprint.pingapp

import android.Manifest
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.net.wifi.WifiManager
import android.os.Binder
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.gson.Gson
import kotlinx.coroutines.*
import org.java_websocket.client.WebSocketClient
import org.java_websocket.handshake.ServerHandshake
import java.net.URI
import java.text.SimpleDateFormat
import java.util.*
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine

// Data Models
data class PingResult(
    val host: String,
    val rtt: Long,
    val success: Boolean,
    val timestamp: Long,
    val packetLoss: Int = 0
)

data class NetworkInfo(
    val ssid: String,
    val bssid: String,
    val rssi: Int,
    val frequency: Int,
    val linkSpeed: Int,
    val networkId: Int
)

data class TelemetryData(
    val deviceId: String,
    val timestamp: Long,
    val location: Location?,
    val networkInfo: NetworkInfo?,
    val pingResults: List<PingResult>,
    val batteryLevel: Float?,
    val appVersion: String = "1.0.0"
)

// Main Activity
class MainActivity : ComponentActivity() {
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private var networkService: NetworkMonitorService? = null
    private var isServiceBound = false
    
    private val locationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val granted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                     permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        
        if (granted) {
            startNetworkMonitoring()
        }
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        
        setContent {
            SmartBlueprintTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    PingMonitorScreen()
                }
            }
        }
        
        checkPermissionsAndStart()
    }
    
    private fun checkPermissionsAndStart() {
        val requiredPermissions = arrayOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
            Manifest.permission.ACCESS_WIFI_STATE,
            Manifest.permission.ACCESS_NETWORK_STATE,
            Manifest.permission.INTERNET
        )
        
        val missingPermissions = requiredPermissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        
        if (missingPermissions.isNotEmpty()) {
            locationPermissionLauncher.launch(missingPermissions.toTypedArray())
        } else {
            startNetworkMonitoring()
        }
    }
    
    private fun startNetworkMonitoring() {
        val serviceIntent = Intent(this, NetworkMonitorService::class.java)
        startService(serviceIntent)
    }
}

// Ping Manager
class PingManager {
    private val coroutineScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    suspend fun performPing(host: String, timeout: Int = 3000): PingResult {
        return withContext(Dispatchers.IO) {
            try {
                val startTime = System.currentTimeMillis()
                val process = Runtime.getRuntime().exec(arrayOf("ping", "-c", "1", "-W", "${timeout/1000}", host))
                val exitCode = process.waitFor()
                val endTime = System.currentTimeMillis()
                
                val rtt = if (exitCode == 0) endTime - startTime else -1
                
                PingResult(
                    host = host,
                    rtt = rtt,
                    success = exitCode == 0,
                    timestamp = System.currentTimeMillis(),
                    packetLoss = if (exitCode == 0) 0 else 100
                )
            } catch (e: Exception) {
                Log.e("PingManager", "Ping failed: ${e.message}")
                PingResult(
                    host = host,
                    rtt = -1,
                    success = false,
                    timestamp = System.currentTimeMillis(),
                    packetLoss = 100
                )
            }
        }
    }
    
    suspend fun performMultiplePings(hosts: List<String>): List<PingResult> {
        return hosts.map { host ->
            async { performPing(host) }
        }.awaitAll()
    }
}

// Network Monitor Service
class NetworkMonitorService : Service() {
    private val binder = LocalBinder()
    private var isMonitoring = false
    private val pingManager = PingManager()
    private val handler = Handler(Looper.getMainLooper())
    private var webSocketClient: WebSocketClient? = null
    
    private val defaultPingTargets = listOf(
        "8.8.8.8",      // Google DNS
        "1.1.1.1",     // Cloudflare DNS
        "192.168.1.1", // Default Gateway
        "192.168.1.254" // Alternative Gateway
    )
    
    inner class LocalBinder : Binder() {
        fun getService(): NetworkMonitorService = this@NetworkMonitorService
    }
    
    override fun onBind(intent: Intent): IBinder = binder
    
    override fun onCreate() {
        super.onCreate()
        connectToSmartBlueprint()
    }
    
    private fun connectToSmartBlueprint() {
        try {
            // Connect to SmartBlueprint Pro WebSocket
            val serverUrl = "wss://5cbbb67f-9f6e-48e5-89b5-2dd91a9599aa-00-t1y5408kqw4n.kirk.replit.dev/ws/mobile"
            val uri = URI(serverUrl)
            
            webSocketClient = object : WebSocketClient(uri) {
                override fun onOpen(handshake: ServerHandshake?) {
                    Log.d("WebSocket", "Connected to SmartBlueprint Pro")
                    registerDevice()
                }
                
                override fun onMessage(message: String?) {
                    Log.d("WebSocket", "Received: $message")
                }
                
                override fun onClose(code: Int, reason: String?, remote: Boolean) {
                    Log.d("WebSocket", "Connection closed: $reason")
                    // Schedule reconnection
                    handler.postDelayed({ connectToSmartBlueprint() }, 5000)
                }
                
                override fun onError(ex: Exception?) {
                    Log.e("WebSocket", "Connection error: ${ex?.message}")
                }
            }
            
            webSocketClient?.connect()
        } catch (e: Exception) {
            Log.e("NetworkService", "Failed to connect: ${e.message}")
        }
    }
    
    private fun registerDevice() {
        val deviceId = android.provider.Settings.Secure.getString(
            contentResolver,
            android.provider.Settings.Secure.ANDROID_ID
        )
        
        val registration = mapOf(
            "type" to "mobile_register",
            "device_id" to deviceId,
            "device_type" to "android",
            "app_version" to "1.0.0",
            "timestamp" to System.currentTimeMillis()
        )
        
        val json = Gson().toJson(registration)
        webSocketClient?.send(json)
    }
    
    fun startMonitoring() {
        if (isMonitoring) return
        
        isMonitoring = true
        performContinuousMonitoring()
    }
    
    fun stopMonitoring() {
        isMonitoring = false
    }
    
    private fun performContinuousMonitoring() {
        if (!isMonitoring) return
        
        CoroutineScope(Dispatchers.IO).launch {
            try {
                // Get current location
                val location = getCurrentLocation()
                
                // Get network info
                val networkInfo = getNetworkInfo()
                
                // Perform ping measurements
                val pingResults = pingManager.performMultiplePings(defaultPingTargets)
                
                // Create telemetry data
                val deviceId = android.provider.Settings.Secure.getString(
                    contentResolver,
                    android.provider.Settings.Secure.ANDROID_ID
                )
                
                val telemetryData = TelemetryData(
                    deviceId = deviceId,
                    timestamp = System.currentTimeMillis(),
                    location = location,
                    networkInfo = networkInfo,
                    pingResults = pingResults,
                    batteryLevel = getBatteryLevel()
                )
                
                // Send to SmartBlueprint Pro
                sendTelemetryData(telemetryData)
                
                Log.d("NetworkService", "Ping cycle completed: ${pingResults.size} results")
                
            } catch (e: Exception) {
                Log.e("NetworkService", "Monitoring cycle failed: ${e.message}")
            }
            
            // Schedule next cycle (30 seconds)
            handler.postDelayed({ performContinuousMonitoring() }, 30000)
        }
    }
    
    private suspend fun getCurrentLocation(): Location? {
        return try {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) 
                == PackageManager.PERMISSION_GRANTED) {
                
                val fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
                suspendCoroutine { continuation ->
                    fusedLocationClient.lastLocation
                        .addOnSuccessListener { location ->
                            continuation.resume(location)
                        }
                        .addOnFailureListener {
                            continuation.resume(null)
                        }
                }
            } else null
        } catch (e: Exception) {
            Log.e("NetworkService", "Failed to get location: ${e.message}")
            null
        }
    }
    
    private fun getNetworkInfo(): NetworkInfo? {
        return try {
            val wifiManager = applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            val wifiInfo = wifiManager.connectionInfo
            
            NetworkInfo(
                ssid = wifiInfo.ssid ?: "Unknown",
                bssid = wifiInfo.bssid ?: "Unknown",
                rssi = wifiInfo.rssi,
                frequency = wifiInfo.frequency,
                linkSpeed = wifiInfo.linkSpeed,
                networkId = wifiInfo.networkId
            )
        } catch (e: Exception) {
            Log.e("NetworkService", "Failed to get network info: ${e.message}")
            null
        }
    }
    
    private fun getBatteryLevel(): Float {
        return try {
            val batteryManager = getSystemService(Context.BATTERY_SERVICE) as android.os.BatteryManager
            batteryManager.getIntProperty(android.os.BatteryManager.BATTERY_PROPERTY_CAPACITY).toFloat()
        } catch (e: Exception) {
            Log.e("NetworkService", "Failed to get battery level: ${e.message}")
            -1f
        }
    }
    
    private fun sendTelemetryData(data: TelemetryData) {
        try {
            val message = mapOf(
                "type" to "mobile_ping",
                "device_id" to data.deviceId,
                "timestamp" to data.timestamp,
                "location" to if (data.location != null) mapOf(
                    "latitude" to data.location.latitude,
                    "longitude" to data.location.longitude,
                    "accuracy" to data.location.accuracy
                ) else null,
                "network_info" to data.networkInfo?.let { mapOf(
                    "ssid" to it.ssid,
                    "bssid" to it.bssid,
                    "rssi" to it.rssi,
                    "frequency" to it.frequency
                ) },
                "ping_results" to data.pingResults.associate { 
                    it.host to mapOf(
                        "rtt" to it.rtt,
                        "success" to it.success,
                        "packet_loss" to it.packetLoss
                    )
                },
                "battery_level" to data.batteryLevel,
                "app_version" to data.appVersion
            )
            
            val json = Gson().toJson(message)
            webSocketClient?.send(json)
            
            Log.d("NetworkService", "Telemetry data sent successfully")
            
        } catch (e: Exception) {
            Log.e("NetworkService", "Failed to send telemetry: ${e.message}")
        }
    }
    
    fun isMonitoring(): Boolean = isMonitoring
    
    fun getConnectionStatus(): String {
        return when {
            webSocketClient?.isOpen == true -> "Connected"
            webSocketClient?.isConnecting == true -> "Connecting"
            else -> "Disconnected"
        }
    }
}

// Compose UI
@Composable
fun SmartBlueprintTheme(content: @Composable () -> Unit) {
    MaterialTheme(content = content)
}

@Composable
fun PingMonitorScreen() {
    var isMonitoring by remember { mutableStateOf(false) }
    var connectionStatus by remember { mutableStateOf("Disconnected") }
    var pingResults by remember { mutableStateOf(listOf<PingResult>()) }
    
    val context = LocalContext.current
    
    LaunchedEffect(Unit) {
        // Simulate periodic updates
        while (true) {
            delay(5000)
            // Update connection status and ping results from service
        }
    }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Header
        Card {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Text(
                    text = "SmartBlueprint Pro",
                    style = MaterialTheme.typography.headlineMedium
                )
                Text(
                    text = "Mobile Ping Monitor",
                    style = MaterialTheme.typography.bodyLarge
                )
            }
        }
        
        // Status Card
        Card {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Text(
                    text = "Status",
                    style = MaterialTheme.typography.titleMedium
                )
                Spacer(modifier = Modifier.height(8.dp))
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Monitoring:")
                    Text(if (isMonitoring) "Active" else "Stopped")
                }
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Server:")
                    Text(connectionStatus)
                }
            }
        }
        
        // Control Button
        Button(
            onClick = {
                isMonitoring = !isMonitoring
                // Start/stop service
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(if (isMonitoring) "Stop Monitoring" else "Start Monitoring")
        }
        
        // Statistics Card
        Card {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Text(
                    text = "Statistics",
                    style = MaterialTheme.typography.titleMedium
                )
                Spacer(modifier = Modifier.height(8.dp))
                
                val successRate = if (pingResults.isNotEmpty()) {
                    (pingResults.count { it.success } * 100) / pingResults.size
                } else 0
                
                val avgLatency = pingResults.filter { it.success }.map { it.rtt }.average()
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Success Rate:")
                    Text("$successRate%")
                }
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Avg Latency:")
                    Text(if (avgLatency.isNaN()) "N/A" else "${avgLatency.toInt()}ms")
                }
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Total Pings:")
                    Text("${pingResults.size}")
                }
            }
        }
        
        // Recent Results
        Card {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Text(
                    text = "Recent Ping Results",
                    style = MaterialTheme.typography.titleMedium
                )
                Spacer(modifier = Modifier.height(8.dp))
                
                LazyColumn(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    items(pingResults.take(10)) { result ->
                        PingResultItem(result)
                    }
                }
            }
        }
    }
}

@Composable
fun PingResultItem(result: PingResult) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column {
            Text(
                text = result.host,
                style = MaterialTheme.typography.bodyMedium
            )
            Text(
                text = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
                    .format(Date(result.timestamp)),
                style = MaterialTheme.typography.bodySmall
            )
        }
        
        Text(
            text = if (result.success) "${result.rtt}ms" else "Failed",
            color = if (result.success) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
        )
    }
}