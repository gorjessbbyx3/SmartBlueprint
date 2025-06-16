import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Activity, 
  Zap, 
  AlertTriangle,
  TrendingUp,
  Map,
  Clock,
  Filter
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface DeviceNode {
  id: string;
  name: string;
  type: string;
  position: { x: number; y: number };
  signalStrength: number;
  anomalyScore: number;
  connections: string[];
  lastSeen: string;
  trustLevel: string;
}

interface AnomalyRegion {
  center: [number, number];
  radius: number;
  severity: string;
  confidence: number;
  affectedDevices: string[];
  timestamp: string;
}

interface HistoricalFrame {
  timestamp: string;
  devices: DeviceNode[];
  anomalies: AnomalyRegion[];
  signalHeatmap: number[][];
}

export default function AdvancedAnalyticsPage() {
  const [deviceGraph, setDeviceGraph] = useState<DeviceNode[]>([]);
  const [anomalyRegions, setAnomalyRegions] = useState<AnomalyRegion[]>([]);
  const [signalHeatmap, setSignalHeatmap] = useState<number[][]>([]);
  const [historicalData, setHistoricalData] = useState<HistoricalFrame[]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState([1]);
  const [showAnomalyOverlay, setShowAnomalyOverlay] = useState(true);
  const [showSignalSmoothing, setShowSignalSmoothing] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState([24]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Real-time WebSocket connection for live updates
  useEffect(() => {
    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/analytics`;
      
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('Advanced Analytics WebSocket connected');
      };
      
      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleRealtimeUpdate(data);
      };
      
      wsRef.current.onclose = () => {
        console.log('Advanced Analytics WebSocket disconnected, reconnecting...');
        setTimeout(connectWebSocket, 5000);
      };
    };
    
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Fetch advanced analytics data
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['/api/advanced-analytics', selectedTimeRange[0]],
    queryFn: () => apiRequest(`/api/advanced-analytics?hours=${selectedTimeRange[0]}`),
    refetchInterval: 30000
  });

  // Handle real-time updates from WebSocket
  const handleRealtimeUpdate = (data: any) => {
    switch (data.type) {
      case 'device_update':
        updateDeviceInGraph(data.device);
        break;
      case 'anomaly_detected':
        addAnomalyRegion(data.anomaly);
        break;
      case 'signal_update':
        updateSignalHeatmap(data.heatmap);
        break;
      case 'device_graph_sync':
        setDeviceGraph(data.devices);
        break;
    }
  };

  const updateDeviceInGraph = (updatedDevice: DeviceNode) => {
    setDeviceGraph(prev => 
      prev.map(device => 
        device.id === updatedDevice.id ? updatedDevice : device
      )
    );
  };

  const addAnomalyRegion = (anomaly: AnomalyRegion) => {
    setAnomalyRegions(prev => [...prev, anomaly]);
    
    // Remove old anomalies after 10 minutes
    setTimeout(() => {
      setAnomalyRegions(current => 
        current.filter(a => a.timestamp !== anomaly.timestamp)
      );
    }, 600000);
  };

  const updateSignalHeatmap = (newHeatmap: number[][]) => {
    setSignalHeatmap(newHeatmap);
  };

  // Historical playback controls
  useEffect(() => {
    if (isPlaying && historicalData.length > 0) {
      const interval = setInterval(() => {
        setCurrentFrame(prev => {
          const next = prev + 1;
          if (next >= historicalData.length) {
            setIsPlaying(false);
            return prev;
          }
          return next;
        });
      }, 1000 / playbackSpeed[0]);
      
      return () => clearInterval(interval);
    }
  }, [isPlaying, playbackSpeed, historicalData.length]);

  // Load historical data when time range changes
  useEffect(() => {
    if (analyticsData?.historical_frames) {
      setHistoricalData(analyticsData.historical_frames);
      setCurrentFrame(0);
    }
  }, [analyticsData]);

  // Canvas drawing for device graph and heatmap
  useEffect(() => {
    drawVisualization();
  }, [deviceGraph, anomalyRegions, signalHeatmap, currentFrame, showAnomalyOverlay, showSignalSmoothing]);

  const drawVisualization = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw signal heatmap if enabled
    if (showSignalSmoothing && signalHeatmap.length > 0) {
      drawSignalHeatmap(ctx, canvas.width, canvas.height);
    }
    
    // Draw anomaly overlays if enabled
    if (showAnomalyOverlay) {
      drawAnomalyOverlays(ctx, canvas.width, canvas.height);
    }
    
    // Draw device graph
    drawDeviceGraph(ctx, canvas.width, canvas.height);
    
    // Draw connections between devices
    drawDeviceConnections(ctx, canvas.width, canvas.height);
  };

  const drawSignalHeatmap = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (signalHeatmap.length === 0) return;
    
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const heatmapX = Math.floor((x / width) * signalHeatmap[0].length);
        const heatmapY = Math.floor((y / height) * signalHeatmap.length);
        
        const signalValue = signalHeatmap[heatmapY]?.[heatmapX] || 0;
        const intensity = Math.max(0, Math.min(1, (signalValue + 100) / 70)); // Normalize -100 to -30 dBm
        
        const pixelIndex = (y * width + x) * 4;
        
        // Color mapping: blue (weak) to green (strong)
        data[pixelIndex] = Math.floor(255 * (1 - intensity));     // Red
        data[pixelIndex + 1] = Math.floor(255 * intensity);       // Green
        data[pixelIndex + 2] = Math.floor(100 * intensity);       // Blue
        data[pixelIndex + 3] = 80; // Alpha (transparency)
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  };

  const drawAnomalyOverlays = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    anomalyRegions.forEach(anomaly => {
      const x = (anomaly.center[0] / 100) * width;
      const y = (anomaly.center[1] / 100) * height;
      const radius = (anomaly.radius / 100) * Math.min(width, height);
      
      // Pulsing effect for high severity anomalies
      const pulse = anomaly.severity === 'high' 
        ? Math.sin(Date.now() / 500) * 0.2 + 0.8 
        : 1;
      
      ctx.beginPath();
      ctx.arc(x, y, radius * pulse, 0, 2 * Math.PI);
      
      // Color based on severity
      const colors = {
        'high': 'rgba(239, 68, 68, 0.3)',
        'medium': 'rgba(245, 158, 11, 0.3)',
        'low': 'rgba(59, 130, 246, 0.3)'
      };
      
      ctx.fillStyle = colors[anomaly.severity as keyof typeof colors] || colors.low;
      ctx.fill();
      
      // Border
      ctx.strokeStyle = colors[anomaly.severity as keyof typeof colors]?.replace('0.3', '0.8') || 'rgba(59, 130, 246, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Confidence indicator
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${Math.round(anomaly.confidence * 100)}%`,
        x,
        y + 4
      );
    });
  };

  const drawDeviceGraph = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const currentDevices = historicalData[currentFrame]?.devices || deviceGraph;
    
    currentDevices.forEach(device => {
      const x = (device.position.x / 100) * width;
      const y = (device.position.y / 100) * height;
      
      // Device circle size based on signal strength
      const baseRadius = 12;
      const signalRadius = baseRadius + (device.signalStrength + 100) / 10;
      
      // Device circle
      ctx.beginPath();
      ctx.arc(x, y, signalRadius, 0, 2 * Math.PI);
      
      // Color based on trust level and anomaly score
      let fillColor = '#3b82f6'; // Default blue
      if (device.trustLevel === 'trusted') fillColor = '#10b981';
      else if (device.trustLevel === 'suspicious') fillColor = '#ef4444';
      else if (device.trustLevel === 'guest') fillColor = '#8b5cf6';
      
      // Add red tint for anomalies
      if (device.anomalyScore > 0.5) {
        fillColor = '#ef4444';
      }
      
      ctx.fillStyle = fillColor;
      ctx.fill();
      
      // Border indicating signal quality
      ctx.strokeStyle = device.signalStrength > -50 ? '#10b981' : 
                       device.signalStrength > -70 ? '#f59e0b' : '#ef4444';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Anomaly indicator
      if (device.anomalyScore > 0.3) {
        ctx.beginPath();
        ctx.arc(x + signalRadius - 5, y - signalRadius + 5, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        
        // Warning icon
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('!', x + signalRadius - 5, y - signalRadius + 8);
      }
      
      // Device label
      ctx.fillStyle = '#374151';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      const label = device.name.length > 12 ? device.name.substring(0, 12) + '...' : device.name;
      ctx.fillText(label, x, y + signalRadius + 15);
    });
  };

  const drawDeviceConnections = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const currentDevices = historicalData[currentFrame]?.devices || deviceGraph;
    
    currentDevices.forEach(device => {
      const x1 = (device.position.x / 100) * width;
      const y1 = (device.position.y / 100) * height;
      
      device.connections.forEach(connectedId => {
        const connectedDevice = currentDevices.find(d => d.id === connectedId);
        if (connectedDevice) {
          const x2 = (connectedDevice.position.x / 100) * width;
          const y2 = (connectedDevice.position.y / 100) * height;
          
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = 'rgba(107, 114, 128, 0.3)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });
    });
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const skipToFrame = (frame: number) => {
    setCurrentFrame(Math.max(0, Math.min(frame, historicalData.length - 1)));
  };

  const exportAnalytics = async () => {
    try {
      const response = await apiRequest('/api/advanced-analytics/export', {
        method: 'POST',
        body: JSON.stringify({
          timeRange: selectedTimeRange[0],
          includeHeatmap: true,
          includeAnomalies: true,
          includeTrajectories: true
        })
      });
      
      // Create download link
      const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <Activity className="w-8 h-8 animate-spin" />
          <span className="ml-2">Loading advanced analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advanced Signal Analytics</h1>
          <p className="text-muted-foreground">
            Real-time signal processing with anomaly detection and historical playback
          </p>
        </div>
        <Button onClick={exportAnalytics} variant="outline" size="sm">
          Export Analytics
        </Button>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Analysis Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Time Range (hours)</Label>
              <Slider
                value={selectedTimeRange}
                onValueChange={setSelectedTimeRange}
                min={1}
                max={168}
                step={1}
                className="w-full"
              />
              <span className="text-sm text-muted-foreground">{selectedTimeRange[0]}h</span>
            </div>
            
            <div className="space-y-2">
              <Label>Playback Speed</Label>
              <Slider
                value={playbackSpeed}
                onValueChange={setPlaybackSpeed}
                min={0.1}
                max={5}
                step={0.1}
                className="w-full"
              />
              <span className="text-sm text-muted-foreground">{playbackSpeed[0]}x</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={showSignalSmoothing}
                onCheckedChange={setShowSignalSmoothing}
              />
              <Label>Signal Smoothing</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={showAnomalyOverlay}
                onCheckedChange={setShowAnomalyOverlay}
              />
              <Label>Anomaly Overlay</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Visualization */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Map className="w-5 h-5 mr-2" />
                  Device Graph & Signal Analysis
                </span>
                <Badge variant="outline">
                  {historicalData.length > 0 ? 'Historical' : 'Live'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="border rounded-lg w-full"
                style={{ height: '500px' }}
              />
              
              {/* Historical Playback Controls */}
              {historicalData.length > 0 && (
                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-center space-x-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => skipToFrame(0)}
                    >
                      <SkipBack className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={togglePlayback}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => skipToFrame(historicalData.length - 1)}
                    >
                      <SkipForward className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Timeline Position</Label>
                    <Slider
                      value={[currentFrame]}
                      onValueChange={([value]) => setCurrentFrame(value)}
                      min={0}
                      max={historicalData.length - 1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>
                        {historicalData[currentFrame]?.timestamp ? 
                          new Date(historicalData[currentFrame].timestamp).toLocaleString() :
                          'No data'
                        }
                      </span>
                      <span>{currentFrame + 1} / {historicalData.length}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Analytics Sidebar */}
        <div className="space-y-4">
          {/* Device Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Device Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Total Devices</span>
                <Badge variant="secondary">{deviceGraph.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Anomalies</span>
                <Badge variant={anomalyRegions.length > 0 ? "destructive" : "secondary"}>
                  {anomalyRegions.length}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">High Risk</span>
                <Badge variant="destructive">
                  {deviceGraph.filter(d => d.anomalyScore > 0.7).length}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Signal Quality</span>
                <Badge variant="outline">
                  {Math.round(deviceGraph.reduce((sum, d) => sum + Math.max(0, (d.signalStrength + 100) / 70), 0) / Math.max(1, deviceGraph.length) * 100)}%
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Active Anomalies */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1" />
                Active Anomalies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {anomalyRegions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No anomalies detected</p>
              ) : (
                anomalyRegions.map((anomaly, index) => (
                  <Alert key={index} className="p-2">
                    <AlertTriangle className="h-3 w-3" />
                    <AlertDescription className="text-xs">
                      <div className="flex justify-between items-center">
                        <span className="capitalize">{anomaly.severity}</span>
                        <Badge variant={
                          anomaly.severity === 'high' ? 'destructive' :
                          anomaly.severity === 'medium' ? 'default' : 'secondary'
                        } className="text-xs">
                          {Math.round(anomaly.confidence * 100)}%
                        </Badge>
                      </div>
                      <p className="text-xs mt-1">
                        {anomaly.affectedDevices.length} devices affected
                      </p>
                    </AlertDescription>
                  </Alert>
                ))
              )}
            </CardContent>
          </Card>

          {/* Real-time Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                Real-time Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Signal Processing</span>
                  <Badge variant="outline" className="text-xs">Active</Badge>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Anomaly Detection</span>
                  <Badge variant="outline" className="text-xs">
                    {showAnomalyOverlay ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Triangulation</span>
                  <Badge variant="outline" className="text-xs">Multi-point</Badge>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Data Source</span>
                  <Badge variant="outline" className="text-xs">
                    {historicalData.length > 0 ? 'Historical' : 'Live'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Playback Info */}
          {historicalData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  Playback Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Total Frames</span>
                  <span>{historicalData.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Current Frame</span>
                  <span>{currentFrame + 1}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Speed</span>
                  <span>{playbackSpeed[0]}x</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Status</span>
                  <Badge variant={isPlaying ? "default" : "secondary"} className="text-xs">
                    {isPlaying ? 'Playing' : 'Paused'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}