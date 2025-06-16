import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

interface PingMeasurement {
  host: string;
  rtt: number;
  distance: number;
  timestamp: Date;
  status: 'success' | 'timeout' | 'error';
  packetLoss: number;
}

interface CalibrationPoint {
  x: number;
  y: number;
  rttValues: number[];
  pingDistances: number[];
  timestamp: Date;
}

interface PingStats {
  totalMeasurements: number;
  averageRTT: number;
  averageDistance: number;
  successRate: number;
  calibrationPoints: number;
}

export function PingMonitor() {
  const [isConnected, setIsConnected] = useState(false);
  const [measurements, setMeasurements] = useState<PingMeasurement[]>([]);
  const [calibrationMode, setCalibrationMode] = useState(false);
  const [stats, setStats] = useState<PingStats>({
    totalMeasurements: 0,
    averageRTT: 0,
    averageDistance: 0,
    successRate: 100,
    calibrationPoints: 0
  });
  const [liveProbing, setLiveProbing] = useState(false);
  const [agentStatus, setAgentStatus] = useState<'disconnected' | 'connected' | 'measuring'>('disconnected');

  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setIsConnected(true);
      console.log('Ping monitor WebSocket connected');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'ping_measurement') {
          const newMeasurement: PingMeasurement = {
            host: data.host,
            rtt: data.rtt,
            distance: data.distance,
            timestamp: new Date(data.timestamp),
            status: data.status,
            packetLoss: data.packetLoss || 0
          };
          
          setMeasurements(prev => [newMeasurement, ...prev.slice(0, 19)]); // Keep last 20
          updateStats(newMeasurement);
        } else if (data.type === 'agent_status') {
          setAgentStatus(data.status);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      console.log('Ping monitor WebSocket disconnected');
    };

    return () => socket.close();
  }, []);

  const updateStats = (newMeasurement: PingMeasurement) => {
    setStats(prev => {
      const total = prev.totalMeasurements + 1;
      const avgRTT = (prev.averageRTT * prev.totalMeasurements + newMeasurement.rtt) / total;
      const avgDistance = (prev.averageDistance * prev.totalMeasurements + newMeasurement.distance) / total;
      const successCount = measurements.filter(m => m.status === 'success').length + (newMeasurement.status === 'success' ? 1 : 0);
      const successRate = (successCount / total) * 100;

      return {
        ...prev,
        totalMeasurements: total,
        averageRTT: avgRTT,
        averageDistance: avgDistance,
        successRate: successRate
      };
    });
  };

  const startPingMeasurement = async () => {
    try {
      const response = await fetch('/api/ping/measure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hosts: ['192.168.1.1', '192.168.1.254', '192.168.0.1', '10.0.0.1'],
          trials: 5
        })
      });

      const data = await response.json();
      if (data.success) {
        console.log('Ping measurement started');
      }
    } catch (error) {
      console.error('Failed to start ping measurement:', error);
    }
  };

  const startCalibration = async () => {
    try {
      const response = await fetch('/api/ping/calibration/start', {
        method: 'POST'
      });

      const data = await response.json();
      if (data.success) {
        setCalibrationMode(true);
        console.log('Calibration mode started');
      }
    } catch (error) {
      console.error('Failed to start calibration:', error);
    }
  };

  const addCalibrationPoint = async () => {
    const x = prompt('Enter X coordinate (meters):');
    const y = prompt('Enter Y coordinate (meters):');
    
    if (x && y) {
      try {
        const response = await fetch('/api/ping/calibration/add-point', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            x: parseFloat(x),
            y: parseFloat(y)
          })
        });

        const data = await response.json();
        if (data.success) {
          setStats(prev => ({ ...prev, calibrationPoints: prev.calibrationPoints + 1 }));
          console.log('Calibration point added');
        }
      } catch (error) {
        console.error('Failed to add calibration point:', error);
      }
    }
  };

  const completeCalibration = async () => {
    try {
      const response = await fetch('/api/ping/calibration/complete', {
        method: 'POST'
      });

      const data = await response.json();
      if (data.success) {
        setCalibrationMode(false);
        console.log('Calibration completed');
      }
    } catch (error) {
      console.error('Failed to complete calibration:', error);
    }
  };

  const startLiveProbing = async () => {
    try {
      const response = await fetch('/api/ping/live/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hosts: ['192.168.1.1', '192.168.1.254', '192.168.0.1'],
          intervalMs: 30000
        })
      });

      const data = await response.json();
      if (data.success) {
        setLiveProbing(true);
        console.log('Live probing started');
      }
    } catch (error) {
      console.error('Failed to start live probing:', error);
    }
  };

  const stopLiveProbing = async () => {
    try {
      const response = await fetch('/api/ping/live/stop', {
        method: 'POST'
      });

      const data = await response.json();
      if (data.success) {
        setLiveProbing(false);
        console.log('Live probing stopped');
      }
    } catch (error) {
      console.error('Failed to stop live probing:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'timeout': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getAgentStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'measuring': return 'text-blue-600';
      case 'disconnected': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status & Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Connection Status
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">WebSocket:</span>
                <Badge variant={isConnected ? "default" : "destructive"}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Desktop Agent:</span>
                <Badge variant="outline" className={getAgentStatusColor(agentStatus)}>
                  {agentStatus.charAt(0).toUpperCase() + agentStatus.slice(1)}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Live Probing:</span>
                <Badge variant={liveProbing ? "default" : "secondary"}>
                  {liveProbing ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Measurement Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button 
                onClick={startPingMeasurement} 
                className="w-full"
                disabled={!isConnected}
              >
                <i className="fas fa-play mr-2"></i>
                Single Measurement
              </Button>
              
              <div className="flex space-x-2">
                <Button 
                  onClick={liveProbing ? stopLiveProbing : startLiveProbing}
                  variant={liveProbing ? "destructive" : "default"}
                  className="flex-1"
                  disabled={!isConnected}
                >
                  {liveProbing ? (
                    <>
                      <i className="fas fa-stop mr-2"></i>
                      Stop Live Probing
                    </>
                  ) : (
                    <>
                      <i className="fas fa-broadcast-tower mr-2"></i>
                      Start Live Probing
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistics Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle>Real-time Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalMeasurements}</div>
              <div className="text-sm text-gray-600">Total Measurements</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.averageRTT.toFixed(1)}ms</div>
              <div className="text-sm text-gray-600">Average RTT</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.averageDistance.toFixed(1)}m</div>
              <div className="text-sm text-gray-600">Average Distance</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.successRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calibration Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Calibration System
            {calibrationMode && (
              <Badge variant="default" className="bg-blue-600">
                Calibration Active
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Calibration Points:</span>
              <Badge variant="outline">{stats.calibrationPoints}</Badge>
            </div>
            
            <div className="flex space-x-2">
              {!calibrationMode ? (
                <Button onClick={startCalibration} className="flex-1">
                  <i className="fas fa-map-marker-alt mr-2"></i>
                  Start Calibration
                </Button>
              ) : (
                <>
                  <Button onClick={addCalibrationPoint} variant="outline" className="flex-1">
                    <i className="fas fa-plus mr-2"></i>
                    Add Point
                  </Button>
                  <Button onClick={completeCalibration} variant="default" className="flex-1">
                    <i className="fas fa-check mr-2"></i>
                    Complete
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Measurements */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Measurements</CardTitle>
        </CardHeader>
        <CardContent>
          {measurements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <i className="fas fa-signal text-4xl mb-4 opacity-50"></i>
              <p>No measurements yet. Start a measurement to see results.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {measurements.slice(0, 10).map((measurement, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(measurement.status)}`}></div>
                    <div>
                      <div className="font-medium text-sm">{measurement.host}</div>
                      <div className="text-xs text-gray-500">
                        {measurement.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{measurement.rtt.toFixed(1)}ms</div>
                    <div className="text-xs text-gray-500">{measurement.distance.toFixed(1)}m</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Information */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Processing Offset:</span>
              <span className="font-medium">5ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Speed of Light:</span>
              <span className="font-medium">3×10⁸ m/s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Default Targets:</span>
              <span className="font-medium">192.168.1.1, 192.168.1.254, 192.168.0.1</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Measurement Trials:</span>
              <span className="font-medium">5 per host</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PingMonitor;