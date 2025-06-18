package com.smartblueprint

import android.content.Context
import android.net.wifi.WifiManager
import android.net.wifi.ScanResult
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import io.mockk.*
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class SmartBlueprintActivityTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private lateinit var mockWifiManager: WifiManager
    private lateinit var context: Context

    @Before
    fun setup() {
        context = ApplicationProvider.getApplicationContext()
        mockWifiManager = mockk(relaxed = true)
        
        // Mock successful scan
        every { mockWifiManager.startScan() } returns true
        every { mockWifiManager.scanResults } returns createMockScanResults()
    }

    @Test
    fun testInitialUIState() {
        composeTestRule.setContent {
            SmartBlueprintTheme {
                SmartBlueprintScreen(
                    devices = emptyList(),
                    onStartScan = { },
                    onStopScan = { }
                )
            }
        }

        composeTestRule.onNodeWithText("SmartBlueprint Pro").assertIsDisplayed()
        composeTestRule.onNodeWithText("Network Device Scanner").assertIsDisplayed()
        composeTestRule.onNodeWithText("Devices Found: 0").assertIsDisplayed()
    }

    @Test
    fun testScanButtonToggle() {
        var scanStarted = false
        var scanStopped = false

        composeTestRule.setContent {
            SmartBlueprintTheme {
                SmartBlueprintScreen(
                    devices = emptyList(),
                    onStartScan = { scanStarted = true },
                    onStopScan = { scanStopped = true }
                )
            }
        }

        // Initially should show "Stop" since scanning starts by default
        composeTestRule.onNodeWithText("Stop").assertIsDisplayed()
        
        // Click to stop scanning
        composeTestRule.onNodeWithText("Stop").performClick()
        assert(scanStopped)

        // Should now show "Scan"
        composeTestRule.onNodeWithText("Scan").assertIsDisplayed()
        
        // Click to start scanning
        composeTestRule.onNodeWithText("Scan").performClick()
        assert(scanStarted)
    }

    @Test
    fun testDeviceListDisplay() {
        val testDevices = listOf(
            NetworkDevice(
                macAddress = "aa:bb:cc:dd:ee:ff",
                ssid = "Test Router",
                rssi = -45,
                frequency = 2412,
                capabilities = "[WPA2-PSK-CCMP][ESS]"
            ),
            NetworkDevice(
                macAddress = "11:22:33:44:55:66",
                ssid = "Smart TV",
                rssi = -65,
                frequency = 5180,
                capabilities = "[WPA2-PSK-CCMP][ESS]"
            )
        )

        composeTestRule.setContent {
            SmartBlueprintTheme {
                SmartBlueprintScreen(
                    devices = testDevices,
                    onStartScan = { },
                    onStopScan = { }
                )
            }
        }

        composeTestRule.onNodeWithText("Devices Found: 2").assertIsDisplayed()
        composeTestRule.onNodeWithText("Test Router").assertIsDisplayed()
        composeTestRule.onNodeWithText("Smart TV").assertIsDisplayed()
        composeTestRule.onNodeWithText("MAC: aa:bb:cc:dd:ee:ff").assertIsDisplayed()
        composeTestRule.onNodeWithText("Signal: -45 dBm").assertIsDisplayed()
    }

    @Test
    fun testSignalStrengthIndicator() {
        composeTestRule.setContent {
            SmartBlueprintTheme {
                SignalStrengthIndicator(rssi = -45)
            }
        }

        composeTestRule.onNodeWithText("Excellent").assertIsDisplayed()

        composeTestRule.setContent {
            SmartBlueprintTheme {
                SignalStrengthIndicator(rssi = -75)
            }
        }

        composeTestRule.onNodeWithText("Poor").assertIsDisplayed()
    }

    @Test
    fun testSecurityTypeDetection() {
        assert(getSecurityType("[WPA3-SAE-CCMP][ESS]") == "WPA3")
        assert(getSecurityType("[WPA2-PSK-CCMP][ESS]") == "WPA2")
        assert(getSecurityType("[WPA-PSK-TKIP][ESS]") == "WPA")
        assert(getSecurityType("[WEP][ESS]") == "WEP")
        assert(getSecurityType("[ESS]") == "Open")
    }

    @Test
    fun testDeviceCardContent() {
        val device = NetworkDevice(
            macAddress = "aa:bb:cc:dd:ee:ff",
            ssid = "Test Network",
            rssi = -55,
            frequency = 2412,
            capabilities = "[WPA2-PSK-CCMP][ESS]"
        )

        composeTestRule.setContent {
            SmartBlueprintTheme {
                DeviceCard(device = device)
            }
        }

        composeTestRule.onNodeWithText("Test Network").assertIsDisplayed()
        composeTestRule.onNodeWithText("MAC: aa:bb:cc:dd:ee:ff").assertIsDisplayed()
        composeTestRule.onNodeWithText("Frequency: 2412 MHz").assertIsDisplayed()
        composeTestRule.onNodeWithText("Signal: -55 dBm").assertIsDisplayed()
        composeTestRule.onNodeWithText("Security: WPA2").assertIsDisplayed()
    }

    @Test
    fun testPermissionErrorScreen() {
        composeTestRule.setContent {
            SmartBlueprintTheme {
                PermissionErrorScreen()
            }
        }

        composeTestRule.onNodeWithText("Permissions Required").assertIsDisplayed()
        composeTestRule.onNodeWithText("SmartBlueprint Pro requires location and WiFi permissions to scan for network devices.").assertIsDisplayed()
    }

    private fun createMockScanResults(): List<ScanResult> {
        val scanResult1 = mockk<ScanResult>(relaxed = true)
        every { scanResult1.BSSID } returns "aa:bb:cc:dd:ee:ff"
        every { scanResult1.SSID } returns "Test Router"
        every { scanResult1.level } returns -45
        every { scanResult1.frequency } returns 2412
        every { scanResult1.capabilities } returns "[WPA2-PSK-CCMP][ESS]"

        val scanResult2 = mockk<ScanResult>(relaxed = true)
        every { scanResult2.BSSID } returns "11:22:33:44:55:66"
        every { scanResult2.SSID } returns "Smart TV"
        every { scanResult2.level } returns -65
        every { scanResult2.frequency } returns 5180
        every { scanResult2.capabilities } returns "[WPA2-PSK-CCMP][ESS]"

        return listOf(scanResult1, scanResult2)
    }
}