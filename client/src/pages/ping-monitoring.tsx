import React from 'react';
import { PingMonitor } from '@/components/ping-monitor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PingMonitoringPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Active Ping/Latency Probing
          </h1>
          <p className="text-gray-600">
            RTT-based distance measurement for meter-level accuracy indoor positioning
          </p>
        </div>

        {/* System Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <i className="fas fa-ruler mr-2 text-blue-600"></i>
                Distance Formula
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="bg-blue-50 p-3 rounded-lg mb-2">
                  <code className="text-sm font-mono">
                    d ≈ ((RTT - t_proc) / 2) × c
                  </code>
                </div>
                <div className="text-xs text-gray-600">
                  <div>RTT: Round Trip Time (ms)</div>
                  <div>t_proc: Processing offset (5ms)</div>
                  <div>c: Speed of light (3×10⁸ m/s)</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <i className="fas fa-crosshairs mr-2 text-green-600"></i>
                Accuracy Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-1">
                  Meter-Level
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  Compared to tens of meters from RSSI alone
                </div>
                <div className="flex justify-center space-x-2 text-xs">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                    No Special Hardware
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <i className="fas fa-wifi mr-2 text-purple-600"></i>
                Compatibility
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-lg font-semibold text-purple-600 mb-2">
                  Any Access Point
                </div>
                <div className="space-y-1 text-xs text-gray-600">
                  <div>• Works with standard WiFi routers</div>
                  <div>• No 802.11mc required</div>
                  <div>• Standard ping protocol</div>
                  <div>• Fallback for drift correction</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Monitoring Interface */}
        <PingMonitor />

        {/* Technical Information */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <h4 className="font-semibold mb-1">1. RTT Measurement</h4>
                  <p className="text-gray-600">
                    Desktop agent sends ping packets to access points and measures round-trip time
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">2. Distance Calculation</h4>
                  <p className="text-gray-600">
                    Converts RTT to distance using speed of light, accounting for processing delays
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">3. Location Fusion</h4>
                  <p className="text-gray-600">
                    Combines with CSI fingerprinting and WiFi signal mapping for enhanced accuracy
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Calibration Process</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <h4 className="font-semibold mb-1">1. Waypoint Collection</h4>
                  <p className="text-gray-600">
                    Walk to known positions and record RTT + CSI measurements
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">2. Feature Vector Creation</h4>
                  <p className="text-gray-600">
                    Combine CSI features, RTT values, and ping distances for ML training
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">3. Live Positioning</h4>
                  <p className="text-gray-600">
                    Real-time location estimation with weighted fusion of multiple signals
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Usage Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div>
                <h4 className="font-semibold mb-2 flex items-center">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs mr-2">1</span>
                  Start Desktop Agent
                </h4>
                <div className="ml-8 space-y-1 text-gray-600">
                  <p>Run the ping agent on your local machine:</p>
                  <code className="block bg-gray-100 p-2 rounded text-xs">
                    node desktop-agent-ping.js
                  </code>
                  <p>Connects via WebSocket for live measurements</p>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2 flex items-center">
                  <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs mr-2">2</span>
                  Run Calibration
                </h4>
                <div className="ml-8 space-y-1 text-gray-600">
                  <p>Click "Start Calibration" above</p>
                  <p>Walk to known positions and add calibration points</p>
                  <p>Complete calibration for training data</p>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2 flex items-center">
                  <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs mr-2">3</span>
                  Enable Live Tracking
                </h4>
                <div className="ml-8 space-y-1 text-gray-600">
                  <p>Start live probing for continuous monitoring</p>
                  <p>View real-time distance measurements</p>
                  <p>Integrate with WiFi mapping system</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}