#!/usr/bin/env node

/**
 * SmartBlueprint Pro - Mobile Ping Integration Test Suite
 * Comprehensive testing of Android mobile app API integration
 */

const WebSocket = require('ws');
const fetch = require('node-fetch');

const SERVER_URL = 'http://localhost:5000';
const WS_URL = 'ws://localhost:5000/ws';

class MobilePingTester {
  constructor() {
    this.testResults = [];
    this.mobileDevices = [
      {
        device_id: 'android_test_001',
        device_type: 'android',
        device_model: 'Samsung Galaxy S23',
        os_version: 'Android 14',
        app_version: '1.0.0'
      },
      {
        device_id: 'android_test_002', 
        device_type: 'android',
        device_model: 'Google Pixel 7',
        os_version: 'Android 13',
        app_version: '1.0.0'
      },
      {
        device_id: 'iphone_test_001',
        device_type: 'ios',
        device_model: 'iPhone 14 Pro',
        os_version: 'iOS 16.5',
        app_version: '1.0.0'
      }
    ];
  }

  async runAllTests() {
    console.log('🧪 SmartBlueprint Pro Mobile Ping Integration Test Suite');
    console.log('=====================================================');
    
    try {
      await this.testDeviceRegistration();
      await this.testPingDataSubmission();
      await this.testMobileDeviceRetrieval();
      await this.testNetworkZones();
      await this.testDeviceConfiguration();
      await this.testWebSocketIntegration();
      await this.testAnomalyDetection();
      
      this.printResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
    }
  }

  async testDeviceRegistration() {
    console.log('\n📱 Testing Mobile Device Registration...');
    
    for (const device of this.mobileDevices) {
      try {
        const response = await fetch(`${SERVER_URL}/api/mobile/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(device)
        });
        
        const result = await response.json();
        
        if (response.ok && result.status === 'success') {
          this.logTest('Device Registration', `${device.device_id}`, '✅ PASS');
          console.log(`   ✓ ${device.device_model} registered successfully`);
        } else {
          this.logTest('Device Registration', `${device.device_id}`, '❌ FAIL');
          console.log(`   ✗ ${device.device_model} registration failed:`, result.error);
        }
      } catch (error) {
        this.logTest('Device Registration', `${device.device_id}`, '❌ ERROR');
        console.log(`   ✗ ${device.device_model} registration error:`, error.message);
      }
    }
  }

  async testPingDataSubmission() {
    console.log('\n🌐 Testing Ping Data Submission...');
    
    const testPingData = {
      device_id: 'android_test_001',
      timestamp: new Date().toISOString(),
      location: {
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 10.5
      },
      network_info: {
        ssid: 'TestNetwork_5G',
        bssid: '00:11:22:33:44:55',
        rssi: -65,
        frequency: 5180,
        linkSpeed: 866
      },
      ping_results: {
        '8.8.8.8': { rtt: 45, success: true, packet_loss: 0 },
        '1.1.1.1': { rtt: 52, success: true, packet_loss: 0 },
        '192.168.1.1': { rtt: 8, success: true, packet_loss: 0 },
        '192.168.1.254': { rtt: 12, success: true, packet_loss: 0 }
      },
      battery_level: 85.5,
      app_version: '1.0.0'
    };

    try {
      const response = await fetch(`${SERVER_URL}/api/mobile/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPingData)
      });
      
      const result = await response.json();
      
      if (response.ok && result.status === 'success') {
        this.logTest('Ping Data Submission', 'Standard Data', '✅ PASS');
        console.log('   ✓ Ping data processed successfully');
        console.log(`   ✓ Signal quality score: ${result.signal_quality?.overall_score || 'N/A'}`);
        console.log(`   ✓ Anomalies detected: ${result.anomaly_detected ? 'Yes' : 'No'}`);
      } else {
        this.logTest('Ping Data Submission', 'Standard Data', '❌ FAIL');
        console.log('   ✗ Ping data submission failed:', result.error);
      }
    } catch (error) {
      this.logTest('Ping Data Submission', 'Standard Data', '❌ ERROR');
      console.log('   ✗ Ping data submission error:', error.message);
    }

    // Test anomalous data
    const anomalousData = {
      ...testPingData,
      device_id: 'android_test_002',
      network_info: {
        ...testPingData.network_info,
        rssi: -95  // Very weak signal
      },
      ping_results: {
        '8.8.8.8': { rtt: 850, success: true, packet_loss: 0 },  // High latency
        '1.1.1.1': { rtt: -1, success: false, packet_loss: 100 },  // Failed
        '192.168.1.1': { rtt: 15, success: true, packet_loss: 0 }
      },
      battery_level: 8.2  // Low battery
    };

    try {
      const response = await fetch(`${SERVER_URL}/api/mobile/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(anomalousData)
      });
      
      const result = await response.json();
      
      if (response.ok && result.anomaly_detected) {
        this.logTest('Ping Data Submission', 'Anomalous Data', '✅ PASS');
        console.log('   ✓ Anomalies correctly detected');
        console.log(`   ✓ Anomaly count: ${result.anomalies?.length || 0}`);
      } else {
        this.logTest('Ping Data Submission', 'Anomalous Data', '❌ FAIL');
        console.log('   ✗ Anomalies not detected properly');
      }
    } catch (error) {
      this.logTest('Ping Data Submission', 'Anomalous Data', '❌ ERROR');
      console.log('   ✗ Anomalous data submission error:', error.message);
    }
  }

  async testMobileDeviceRetrieval() {
    console.log('\n📋 Testing Mobile Device Retrieval...');
    
    try {
      const response = await fetch(`${SERVER_URL}/api/mobile/devices`);
      const result = await response.json();
      
      if (response.ok && result.success) {
        this.logTest('Device Retrieval', 'All Devices', '✅ PASS');
        console.log(`   ✓ Retrieved ${result.devices?.length || 0} mobile devices`);
        console.log(`   ✓ Total device count: ${result.count || 0}`);
      } else {
        this.logTest('Device Retrieval', 'All Devices', '❌ FAIL');
        console.log('   ✗ Device retrieval failed:', result.error);
      }
    } catch (error) {
      this.logTest('Device Retrieval', 'All Devices', '❌ ERROR');
      console.log('   ✗ Device retrieval error:', error.message);
    }
  }

  async testNetworkZones() {
    console.log('\n🏠 Testing Network Trust Zones...');
    
    try {
      const response = await fetch(`${SERVER_URL}/api/mobile/network-zones`);
      const result = await response.json();
      
      if (response.ok && result.success) {
        this.logTest('Network Zones', 'Trust Zones', '✅ PASS');
        console.log(`   ✓ Network zones retrieved successfully`);
        console.log(`   ✓ Total zones: ${result.total_zones || 0}`);
      } else {
        this.logTest('Network Zones', 'Trust Zones', '❌ FAIL');
        console.log('   ✗ Network zones retrieval failed:', result.error);
      }
    } catch (error) {
      this.logTest('Network Zones', 'Trust Zones', '❌ ERROR');
      console.log('   ✗ Network zones error:', error.message);
    }
  }

  async testDeviceConfiguration() {
    console.log('\n⚙️ Testing Device Configuration...');
    
    const configData = {
      device_id: 'android_test_001',
      config: {
        ping_interval: 15000,
        ping_targets: ['8.8.8.8', '1.1.1.1', '9.9.9.9'],
        location_updates: true,
        battery_optimization: true
      }
    };

    try {
      const response = await fetch(`${SERVER_URL}/api/mobile/configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configData)
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        this.logTest('Device Configuration', 'Config Update', '✅ PASS');
        console.log('   ✓ Device configuration updated successfully');
        console.log(`   ✓ Ping interval: ${result.config?.ping_interval}ms`);
      } else {
        this.logTest('Device Configuration', 'Config Update', '❌ FAIL');
        console.log('   ✗ Device configuration failed:', result.error);
      }
    } catch (error) {
      this.logTest('Device Configuration', 'Config Update', '❌ ERROR');
      console.log('   ✗ Device configuration error:', error.message);
    }
  }

  async testWebSocketIntegration() {
    console.log('\n🔌 Testing WebSocket Integration...');
    
    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(WS_URL);
        let messageReceived = false;
        
        ws.on('open', () => {
          console.log('   ✓ WebSocket connection established');
          
          // Send mobile registration message
          const message = {
            type: 'mobile_register',
            device_id: 'websocket_test_001',
            device_type: 'android',
            timestamp: new Date().toISOString()
          };
          
          ws.send(JSON.stringify(message));
        });
        
        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            console.log('   ✓ WebSocket message received:', message.type);
            messageReceived = true;
          } catch (e) {
            console.log('   ✓ WebSocket data received (non-JSON)');
          }
        });
        
        ws.on('error', (error) => {
          this.logTest('WebSocket Integration', 'Connection', '❌ ERROR');
          console.log('   ✗ WebSocket error:', error.message);
          resolve();
        });
        
        // Close connection after 3 seconds
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            this.logTest('WebSocket Integration', 'Connection', '✅ PASS');
            console.log('   ✓ WebSocket integration working');
          } else {
            this.logTest('WebSocket Integration', 'Connection', '❌ FAIL');
            console.log('   ✗ WebSocket connection failed');
          }
          ws.close();
          resolve();
        }, 3000);
        
      } catch (error) {
        this.logTest('WebSocket Integration', 'Connection', '❌ ERROR');
        console.log('   ✗ WebSocket integration error:', error.message);
        resolve();
      }
    });
  }

  async testAnomalyDetection() {
    console.log('\n🚨 Testing Anomaly Detection System...');
    
    // Test multiple anomaly scenarios
    const anomalyScenarios = [
      {
        name: 'Weak Signal',
        data: {
          device_id: 'anomaly_test_001',
          network_info: { rssi: -95 },
          ping_results: { '8.8.8.8': { rtt: 50, success: true, packet_loss: 0 } },
          battery_level: 80
        }
      },
      {
        name: 'High Latency',
        data: {
          device_id: 'anomaly_test_002',
          network_info: { rssi: -60 },
          ping_results: { '8.8.8.8': { rtt: 1200, success: true, packet_loss: 0 } },
          battery_level: 70
        }
      },
      {
        name: 'Low Battery',
        data: {
          device_id: 'anomaly_test_003',
          network_info: { rssi: -55 },
          ping_results: { '8.8.8.8': { rtt: 45, success: true, packet_loss: 0 } },
          battery_level: 5
        }
      }
    ];

    for (const scenario of anomalyScenarios) {
      try {
        const response = await fetch(`${SERVER_URL}/api/mobile/ping`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...scenario.data,
            timestamp: new Date().toISOString(),
            app_version: '1.0.0'
          })
        });
        
        const result = await response.json();
        
        if (response.ok && result.anomaly_detected) {
          this.logTest('Anomaly Detection', scenario.name, '✅ PASS');
          console.log(`   ✓ ${scenario.name} anomaly detected correctly`);
        } else {
          this.logTest('Anomaly Detection', scenario.name, '❌ FAIL');
          console.log(`   ✗ ${scenario.name} anomaly not detected`);
        }
      } catch (error) {
        this.logTest('Anomaly Detection', scenario.name, '❌ ERROR');
        console.log(`   ✗ ${scenario.name} test error:`, error.message);
      }
    }
  }

  logTest(category, test, result) {
    this.testResults.push({ category, test, result });
  }

  printResults() {
    console.log('\n📊 Test Results Summary');
    console.log('=======================');
    
    const groupedResults = this.testResults.reduce((acc, result) => {
      if (!acc[result.category]) acc[result.category] = [];
      acc[result.category].push(result);
      return acc;
    }, {});

    let totalTests = 0;
    let passedTests = 0;

    Object.entries(groupedResults).forEach(([category, tests]) => {
      console.log(`\n${category}:`);
      tests.forEach(test => {
        console.log(`  ${test.test}: ${test.result}`);
        totalTests++;
        if (test.result === '✅ PASS') passedTests++;
      });
    });

    console.log('\n' + '='.repeat(50));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 All tests passed! Mobile ping integration is working correctly.');
    } else {
      console.log('\n⚠️ Some tests failed. Please check the issues above.');
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new MobilePingTester();
  tester.runAllTests().catch(console.error);
}

module.exports = MobilePingTester;