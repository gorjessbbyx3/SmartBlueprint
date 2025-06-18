package com.smartblueprint

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.net.wifi.WifiManager
import android.net.wifi.ScanResult
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import kotlinx.coroutines.delay
import java.text.SimpleDateFormat
import java.util.*

data class NetworkDevice(
    val macAddress: String,
    val ssid: String,
    val rssi: Int,
    val frequency: Int,
    val capabilities: String,
    val timestamp: Long = System.currentTimeMillis()
)

class SmartBlueprintActivity : ComponentActivity() {
    private lateinit var wifiManager: WifiManager
    private val devices = mutableStateListOf<NetworkDevice>()
    private val handler = Handler(Looper.getMainLooper())
    private var scanRunnable: Runnable? = null
    
    companion object {
        private const val PERMISSION_REQUEST_CODE = 1
        private val REQUIRED_PERMISSIONS = arrayOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
            Manifest.permission.ACCESS_WIFI_STATE,
            Manifest.permission.CHANGE_WIFI_STATE
        )
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        wifiManager = applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        
        if (checkPermissions()) {
            initializeApp()
        } else {
            requestPermissions()
        }
    }

    private fun checkPermissions(): Boolean {
        return REQUIRED_PERMISSIONS.all { permission ->
            ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED
        }
    }

    private fun requestPermissions() {
        ActivityCompat.requestPermissions(this, REQUIRED_PERMISSIONS, PERMISSION_REQUEST_CODE)
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        
        if (requestCode == PERMISSION_REQUEST_CODE) {
            if (grantResults.all { it == PackageManager.PERMISSION_GRANTED }) {
                initializeApp()
            } else {
                setContent {
                    PermissionErrorScreen()
                }
            }
        }
    }

    private fun initializeApp() {
        setContent {
            SmartBlueprintTheme {
                SmartBlueprintScreen(
                    devices = devices,
                    onStartScan = { startScanning() },
                    onStopScan = { stopScanning() }
                )
            }
        }
        
        startScanning()
    }

    private fun startScanning() {
        scanRunnable = object : Runnable {
            override fun run() {
                performWifiScan()
                handler.postDelayed(this, 5000)
            }
        }
        handler.post(scanRunnable!!)
    }

    private fun stopScanning() {
        scanRunnable?.let { handler.removeCallbacks(it) }
    }

    private fun performWifiScan() {
        try {
            val success = wifiManager.startScan()
            if (success) {
                val scanResults = wifiManager.scanResults
                updateDeviceList(scanResults)
            }
        } catch (e: SecurityException) {
            // Handle security exception
        }
    }

    private fun updateDeviceList(scanResults: List<ScanResult>) {
        val newDevices = scanResults.map { result ->
            NetworkDevice(
                macAddress = result.BSSID,
                ssid = result.SSID.takeIf { it.isNotEmpty() } ?: "Hidden Network",
                rssi = result.level,
                frequency = result.frequency,
                capabilities = result.capabilities
            )
        }
        
        devices.clear()
        devices.addAll(newDevices.distinctBy { it.macAddress })
    }

    override fun onDestroy() {
        super.onDestroy()
        stopScanning()
    }
}

@Composable
fun SmartBlueprintTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Color(0xFF3B82F6),
            secondary = Color(0xFF10B981),
            background = Color(0xFF1F2937),
            surface = Color(0xFF374151)
        ),
        content = content
    )
}

@Composable
fun SmartBlueprintScreen(
    devices: List<NetworkDevice>,
    onStartScan: () -> Unit,
    onStopScan: () -> Unit
) {
    var isScanning by remember { mutableStateOf(true) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text(
            text = "SmartBlueprint Pro",
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        
        Text(
            text = "Network Device Scanner",
            fontSize = 16.sp,
            color = Color.Gray,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF374151))
        ) {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Devices Found: ${devices.size}",
                        color = Color.White,
                        fontWeight = FontWeight.Medium
                    )
                    
                    Button(
                        onClick = {
                            isScanning = !isScanning
                            if (isScanning) onStartScan() else onStopScan()
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isScanning) Color.Red else Color.Green
                        )
                    ) {
                        Text(if (isScanning) "Stop Scan" else "Start Scan")
                    }
                }
            }
        }

        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(devices) { device ->
                DeviceCard(device = device)
            }
        }
    }
}

@Composable
fun DeviceCard(device: NetworkDevice) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF374151))
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = device.ssid,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    fontSize = 16.sp
                )
                
                SignalStrengthIndicator(rssi = device.rssi)
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = "MAC: ${device.macAddress}",
                color = Color.Gray,
                fontSize = 12.sp
            )
            
            Text(
                text = "Frequency: ${device.frequency} MHz",
                color = Color.Gray,
                fontSize = 12.sp
            )
            
            Text(
                text = "Signal: ${device.rssi} dBm",
                color = Color.Gray,
                fontSize = 12.sp
            )
            
            Text(
                text = "Security: ${getSecurityType(device.capabilities)}",
                color = Color.Gray,
                fontSize = 12.sp
            )
        }
    }
}

@Composable
fun SignalStrengthIndicator(rssi: Int) {
    val strength = when {
        rssi >= -50 -> "Excellent"
        rssi >= -60 -> "Good"
        rssi >= -70 -> "Fair"
        else -> "Poor"
    }
    
    val color = when {
        rssi >= -50 -> Color.Green
        rssi >= -60 -> Color.Yellow
        rssi >= -70 -> Color(0xFFFF9500)
        else -> Color.Red
    }
    
    Text(
        text = strength,
        color = color,
        fontWeight = FontWeight.Medium,
        fontSize = 12.sp
    )
}

@Composable
fun PermissionErrorScreen() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Permissions Required",
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = Color.Red
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Text(
            text = "SmartBlueprint Pro requires location and WiFi permissions to scan for network devices.",
            fontSize = 16.sp,
            color = Color.Gray
        )
    }
}

fun getSecurityType(capabilities: String): String {
    return when {
        capabilities.contains("WPA3") -> "WPA3"
        capabilities.contains("WPA2") -> "WPA2"
        capabilities.contains("WPA") -> "WPA"
        capabilities.contains("WEP") -> "WEP"
        else -> "Open"
    }
}