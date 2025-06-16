import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

interface PingData {
  [host: string]: {
    rtt: number | null;
    alive: boolean;
    packetLoss: number;
    distance?: number;
  };
}

interface PingMeasurement {
  host: string;
  rtt: number;
  distance: number;
  timestamp: Date;
  status: 'success' | 'timeout' | 'error';
  packetLoss: number;
}

interface CalibrationStats {
  pointCount: number;
  averageRTT: number;
  averageDistance: number;
  coverage: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

interface PingConfiguration {
  processingOffset: number;
  speedOfLight: number;
  isCalibrating: boolean;
  calibrationPoints: number;
  isProbing: boolean;
}

export function PingMonitor() {
  const [pingData, setPingData] = useState<PingData>({});
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [isProbing, setIsProbing] = useState(false);
  const [calibrationStats, setCalibrationStats] = useState<CalibrationStats | null>(null);
  const [configuration, setConfiguration] = useState<PingConfiguration | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const { toast } = useToast();

  // WebSocket connection for real-time ping updates
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'ping_update') {
          setPingData(message.ping || {});
          setLastUpdate(new Date(message.timestamp));
        } else if (message.type === 'probe_results') {
          // Handle processed probe results
          console.log('Received probe results:', message);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onopen = () => {
      console.log('WebSocket connected for ping monitoring');
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    return () => ws.close();
  }, []);

  // Load initial status
  useEffect(() => {
    loadPingStatus();
  }, []);

  const loadPingStatus = async () => {
    try {
      const response = await fetch('/api/ping/status');
      const data = await response.json();
      
      if (data.success) {
        setConfiguration(data.configuration);
        setCalibrationStats(data.calibrationStats);
        setIsCalibrating(data.configuration.isCalibrating);
        setIsProbing(data.configuration.isProbing);
      }
    } catch (error) {
      console.error('Failed to load ping status:', error);
    }
  };

  const measurePing = async () => {
    try {
      const hosts = ['192.168.1.1', '192.168.1.254', '192.168.0.1', '10.0.0.1'];
      
      const response = await fetch('/api/ping/measure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hosts, trials: 5 })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Convert measurements to ping data format
        const newPingData: PingData = {};
        data.measurements.forEach((measurement: PingMeasurement) => {
          newPingData[measurement.host] = {
            rtt: measurement.rtt,
            alive: measurement.status === 'success',
            packetLoss: measurement.packetLoss,
            distance: measurement.distance
          };
        });
        
        setPingData(newPingData);
        setLastUpdate(new Date());
        
        toast({
          title: "Ping Measurement Complete",
          description: `Measured ${data.measurements.length} hosts successfully`
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Ping Measurement Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    }
  };

  const startCalibration = async () => {
    try {
      const response = await fetch('/api/ping/calibration/start', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsCalibrating(true);
        toast({
          title: "Calibration Started",
          description: "Ready to collect calibration points"
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Calibration Start Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    }
  };

  const addCalibrationPoint = async (x: number, y: number) => {
    try {
      const response = await fetch('/api/ping/calibration/point', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          x, y,
          csiFeatures: [], // Would be populated with actual CSI data
          rttValues: Object.values(pingData).map(p => p.rtt || 0),
          pingDistances: Object.values(pingData).map(p => p.distance || 0)
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        loadPingStatus(); // Refresh stats
        toast({
          title: "Calibration Point Added",
          description: `Position (${x}, ${y}) recorded`
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Failed to Add Point",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    }
  };

  const completeCalibration = async () => {
    try {
      const response = await fetch('/api/ping/calibration/complete', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsCalibrating(false);
        setCalibrationStats(data.stats);
        toast({
          title: "Calibration Complete",
          description: `Collected ${data.calibrationData.length} calibration points`
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Calibration Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    }
  };

  const startLiveProbing = async () => {
    try {
      const hosts = ['192.168.1.1', '192.168.1.254', '192.168.0.1'];
      
      const response = await fetch('/api/ping/probing/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hosts, intervalMs: 30000 })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsProbing(true);
        toast({
          title: "Live Probing Started",
          description: "Continuous ping monitoring active"
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Failed to Start Probing",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    }
  };

  const stopLiveProbing = async () => {
    try {
      const response = await fetch('/api/ping/probing/stop', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsProbing(false);
        toast({
          title: "Live Probing Stopped",
          description: "Continuous monitoring disabled"
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Failed to Stop Probing",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    }
  };

  const getSignalQuality = (rtt: number | null) => {
    if (!rtt) return { color: 'bg-gray-500', label: 'No Signal', percentage: 0 };
    if (rtt < 10) return { color: 'bg-green-500', label: 'Excellent', percentage: 100 };
    if (rtt < 50) return { color: 'bg-yellow-500', label: 'Good', percentage: 75 };
    if (rtt < 100) return { color: 'bg-orange-500', label: 'Fair', percentage: 50 };
    return { color: 'bg-red-500', label: 'Poor', percentage: 25 };
  };

  const formatDistance = (distance: number | undefined) => {
    if (!distance) return 'N/A';
    if (distance < 1) return `${Math.round(distance * 100)}cm`;
    return `${distance.toFixed(1)}m`;
  };

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <i className="fas fa-satellite-dish mr-2 text-primary"></i>
            Active Ping/Latency Probing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {Object.keys(pingData).length}
              </div>
              <div className="text-sm text-gray-600">Active Targets</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Object.values(pingData).filter(p => p.alive).length}
              </div>
              <div className="text-sm text-gray-600">Reachable</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {configuration?.calibrationPoints || 0}
              </div>
              <div className="text-sm text-gray-600">Cal. Points</div>
            </div>
            <div className="text-center">
              <Badge variant={isProbing ? "default" : "secondary"}>
                {isProbing ? "Live Probing" : "Idle"}
              </Badge>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button onClick={measurePing} size="sm">
              <i className="fas fa-play mr-2"></i>
              Measure Now
            </Button>
            
            {!isCalibrating ? (
              <Button onClick={startCalibration} variant="outline" size="sm">
                <i className="fas fa-calibration mr-2"></i>
                Start Calibration
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button 
                  onClick={() => addCalibrationPoint(Math.random() * 10, Math.random() * 10)} 
                  variant="outline" 
                  size="sm"
                >
                  Add Point
                </Button>
                <Button onClick={completeCalibration} variant="outline" size="sm">
                  Complete
                </Button>
              </div>
            )}
            
            {!isProbing ? (
              <Button onClick={startLiveProbing} variant="outline" size="sm">
                <i className="fas fa-play-circle mr-2"></i>
                Start Live Probing
              </Button>
            ) : (
              <Button onClick={stopLiveProbing} variant="outline" size="sm">
                <i className="fas fa-stop-circle mr-2"></i>
                Stop Probing
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ping Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>RTT Measurements</span>
            {lastUpdate && (
              <span className="text-sm text-gray-500">
                Last: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(pingData).map(([host, data]) => {
              const quality = getSignalQuality(data.rtt);
              return (
                <div key={host} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${quality.color}`}></div>
                    <div>
                      <div className="font-medium">{host}</div>
                      <div className="text-sm text-gray-600">{quality.label}</div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-mono text-sm">
                      {data.rtt ? `${data.rtt.toFixed(1)}ms` : 'Timeout'}
                    </div>
                    <div className="text-xs text-gray-600">
                      {formatDistance(data.distance)}
                    </div>
                  </div>
                  
                  <div className="w-20">
                    <Progress value={quality.percentage} className="h-2" />
                  </div>
                </div>
              );
            })}
            
            {Object.keys(pingData).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <i className="fas fa-satellite-dish text-4xl mb-2"></i>
                <div>No ping data available</div>
                <div className="text-sm">Click "Measure Now" to start</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Calibration Stats */}
      {calibrationStats && calibrationStats.pointCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Calibration Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-xl font-bold">{calibrationStats.pointCount}</div>
                <div className="text-sm text-gray-600">Points Collected</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold">
                  {calibrationStats.averageRTT.toFixed(1)}ms
                </div>
                <div className="text-sm text-gray-600">Avg RTT</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold">
                  {calibrationStats.averageDistance.toFixed(1)}m
                </div>
                <div className="text-sm text-gray-600">Avg Distance</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold">
                  {(calibrationStats.coverage.maxX - calibrationStats.coverage.minX).toFixed(1)}m
                </div>
                <div className="text-sm text-gray-600">Coverage Area</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}