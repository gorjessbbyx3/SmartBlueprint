import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Wifi, 
  Monitor, 
  Smartphone, 
  Printer, 
  Router, 
  Tv, 
  Speaker,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
  RefreshCw,
  Search,
  Filter,
  Eye,
  EyeOff,
  Zap,
  Signal
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface NetworkDevice {
  device_id: string;
  mac_address: string;
  ip_address: string;
  hostname: string;
  vendor: string;
  device_type: string;
  trust_level: 'trusted' | 'guest' | 'suspicious' | 'unknown';
  last_seen: string;
  signal_strength: number;
  connection_quality: number;
  performance_score: number;
  rssi_signature: number[];
  services: string[];
  capabilities: string[];
  is_online: boolean;
}

interface NetworkTopology {
  devices: NetworkDevice[];
  trust_summary: {
    trusted: number;
    guest: number;
    suspicious: number;
    unknown: number;
  };
  total_devices: number;
  last_updated: string;
}

const deviceIcons: Record<string, any> = {
  router: Router,
  computer: Monitor,
  mobile_device: Smartphone,
  printer: Printer,
  media_player: Tv,
  smart_home: Speaker,
  wifi_device: Wifi,
  unknown: Monitor
};

const trustColors: Record<string, string> = {
  trusted: 'bg-green-500',
  guest: 'bg-blue-500',
  suspicious: 'bg-red-500',
  unknown: 'bg-gray-500'
};

const trustIcons: Record<string, any> = {
  trusted: ShieldCheck,
  guest: Users,
  suspicious: ShieldAlert,
  unknown: Shield
};

export default function NetworkTopologyPage() {
  const [selectedDevice, setSelectedDevice] = useState<NetworkDevice | null>(null);
  const [filterTrust, setFilterTrust] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showOffline, setShowOffline] = useState(false);
  const [showSignalStrength, setShowSignalStrength] = useState(true);
  const [gridSize, setGridSize] = useState([20]);
  const [searchTerm, setSearchTerm] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const queryClient = useQueryClient();

  // Fetch network topology
  const { data: topology, isLoading, error } = useQuery<NetworkTopology>({
    queryKey: ['/api/ml/network-topology'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Set device trust level mutation
  const setTrustMutation = useMutation({
    mutationFn: ({ deviceId, trustLevel }: { deviceId: string; trustLevel: string }) =>
      apiRequest(`/api/ml/device-trust?device_id=${deviceId}&trust_level=${trustLevel}`, 'POST', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ml/network-topology'] });
    }
  });

  // Filtered devices
  const filteredDevices = topology?.devices.filter(device => {
    if (filterTrust !== 'all' && device.trust_level !== filterTrust) return false;
    if (filterType !== 'all' && device.device_type !== filterType) return false;
    if (!showOffline && !device.is_online) return false;
    if (searchTerm && !device.hostname.toLowerCase().includes(searchTerm.toLowerCase()) 
        && !device.mac_address.toLowerCase().includes(searchTerm.toLowerCase())
        && !device.vendor.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  }) || [];

  // Draw network topology canvas
  useEffect(() => {
    if (!canvasRef.current || !filteredDevices.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid settings
    const grid = gridSize[0];
    const cellSize = Math.min(canvas.width / grid, canvas.height / grid);
    const padding = 20;

    // Draw grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    for (let i = 0; i <= grid; i++) {
      const x = padding + (i * cellSize);
      const y = padding + (i * cellSize);
      
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, canvas.height - padding);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(canvas.width - padding, y);
      ctx.stroke();
    }

    // Position devices
    filteredDevices.forEach((device, index) => {
      const col = index % grid;
      const row = Math.floor(index / grid);
      const x = padding + (col * cellSize) + (cellSize / 2);
      const y = padding + (row * cellSize) + (cellSize / 2);

      // Skip if outside canvas
      if (y > canvas.height - padding) return;

      // Device circle
      const radius = 15;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);

      // Color based on trust level
      const trustColor = {
        trusted: '#10b981',
        guest: '#3b82f6',
        suspicious: '#ef4444',
        unknown: '#6b7280'
      };
      ctx.fillStyle = trustColor[device.trust_level];
      ctx.fill();

      // Border based on online status
      ctx.strokeStyle = device.is_online ? '#000000' : '#d1d5db';
      ctx.lineWidth = device.is_online ? 2 : 1;
      ctx.stroke();

      // Signal strength indicator
      if (showSignalStrength && device.signal_strength) {
        const signalRadius = 25;
        const signalStrength = Math.abs(device.signal_strength);
        const signalAlpha = Math.max(0.1, Math.min(1, (100 - signalStrength) / 50));
        
        ctx.beginPath();
        ctx.arc(x, y, signalRadius, 0, 2 * Math.PI);
        ctx.strokeStyle = `rgba(34, 197, 94, ${signalAlpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Device label
      ctx.fillStyle = '#374151';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      const label = device.hostname !== 'unknown' ? device.hostname : device.vendor;
      const displayLabel = label.length > 10 ? label.substring(0, 10) + '...' : label;
      ctx.fillText(displayLabel, x, y + radius + 12);

      // Store device position for click detection
      (device as any).canvasX = x;
      (device as any).canvasY = y;
      (device as any).canvasRadius = radius;
    });

  }, [filteredDevices, gridSize, showSignalStrength]);

  // Handle canvas click
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Find clicked device
    const clickedDevice = filteredDevices.find(device => {
      const dx = x - (device as any).canvasX;
      const dy = y - (device as any).canvasY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= (device as any).canvasRadius;
    });

    if (clickedDevice) {
      setSelectedDevice(clickedDevice);
    }
  };

  // Get unique device types and trust levels for filters
  const deviceTypes = Array.from(new Set(topology?.devices.map(d => d.device_type) || []));
  const trustLevels = ['trusted', 'guest', 'suspicious', 'unknown'];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin" />
          <span className="ml-2">Scanning network...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            Failed to load network topology. Please check if the ML inference service is running.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Network Topology</h1>
          <p className="text-muted-foreground">
            Real-time network device mapping with trust levels and signal analysis
          </p>
        </div>
        <Button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/ml/network-topology'] })}
          variant="outline"
          size="sm"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Network Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topology?.total_devices || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <ShieldCheck className="w-4 h-4 mr-1 text-green-500" />
              Trusted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {topology?.trust_summary.trusted || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Users className="w-4 h-4 mr-1 text-blue-500" />
              Guest
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {topology?.trust_summary.guest || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <ShieldAlert className="w-4 h-4 mr-1 text-red-500" />
              Suspicious
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {topology?.trust_summary.suspicious || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Topology Visualization */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Network Map</CardTitle>
              <CardDescription>
                Interactive visualization of discovered devices with trust levels and signal strength
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Controls */}
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex items-center space-x-2">
                  <Search className="w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search devices..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  />
                </div>
                
                <Select value={filterTrust} onValueChange={setFilterTrust}>
                  <SelectTrigger className="w-32">
                    <Filter className="w-4 h-4 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Trust</SelectItem>
                    {trustLevels.map(level => (
                      <SelectItem key={level} value={level}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {deviceTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={showOffline}
                    onCheckedChange={setShowOffline}
                  />
                  <Label>Show Offline</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={showSignalStrength}
                    onCheckedChange={setShowSignalStrength}
                  />
                  <Label>Signal Rings</Label>
                </div>
              </div>

              <div className="flex items-center space-x-2 mb-4">
                <Label>Grid Size:</Label>
                <Slider
                  value={gridSize}
                  onValueChange={setGridSize}
                  min={5}
                  max={25}
                  step={1}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">{gridSize[0]}x{gridSize[0]}</span>
              </div>

              {/* Canvas */}
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="border rounded-lg cursor-pointer w-full"
                style={{ height: '500px' }}
                onClick={handleCanvasClick}
              />

              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <span>Trusted</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                  <span>Guest</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-red-500"></div>
                  <span>Suspicious</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-gray-500"></div>
                  <span>Unknown</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full border-2 border-green-400 bg-transparent"></div>
                  <span>Signal Strength</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Device Details */}
        <div className="space-y-4">
          {selectedDevice ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  {(() => {
                    const IconComponent = deviceIcons[selectedDevice.device_type] || Monitor;
                    return <IconComponent className="w-5 h-5 mr-2" />;
                  })()}
                  Device Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Hostname</Label>
                  <p className="text-sm">{selectedDevice.hostname}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">MAC Address</Label>
                  <p className="text-sm font-mono">{selectedDevice.mac_address}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">IP Address</Label>
                  <p className="text-sm">{selectedDevice.ip_address}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Vendor</Label>
                  <p className="text-sm">{selectedDevice.vendor}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Device Type</Label>
                  <p className="text-sm">{selectedDevice.device_type.replace('_', ' ')}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Trust Level</Label>
                  <div className="flex items-center space-x-2">
                    <Badge className={`${trustColors[selectedDevice.trust_level]} text-white`}>
                      {selectedDevice.trust_level}
                    </Badge>
                    <Select
                      value={selectedDevice.trust_level}
                      onValueChange={(value) => 
                        setTrustMutation.mutate({
                          deviceId: selectedDevice.device_id,
                          trustLevel: value
                        })
                      }
                    >
                      <SelectTrigger className="w-24 h-6">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {trustLevels.map(level => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge variant={selectedDevice.is_online ? "default" : "secondary"}>
                    {selectedDevice.is_online ? "Online" : "Offline"}
                  </Badge>
                </div>
                
                {selectedDevice.signal_strength && (
                  <div>
                    <Label className="text-sm font-medium">Signal Strength</Label>
                    <div className="flex items-center space-x-2">
                      <Signal className="w-4 h-4" />
                      <span className="text-sm">{selectedDevice.signal_strength} dBm</span>
                    </div>
                  </div>
                )}
                
                {selectedDevice.services.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Services</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedDevice.services.map((service, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <Label className="text-sm font-medium">Last Seen</Label>
                  <p className="text-sm">
                    {new Date(selectedDevice.last_seen).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <Monitor className="w-8 h-8 mx-auto mb-2" />
                  <p>Click a device on the network map to view details</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Device List */}
          <Card>
            <CardHeader>
              <CardTitle>Device List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredDevices.map((device) => {
                  const IconComponent = deviceIcons[device.device_type] || Monitor;
                  const TrustIcon = trustIcons[device.trust_level];
                  
                  return (
                    <div
                      key={device.device_id}
                      className={`flex items-center justify-between p-2 rounded border cursor-pointer hover:bg-gray-50 ${
                        selectedDevice?.device_id === device.device_id ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                      onClick={() => setSelectedDevice(device)}
                    >
                      <div className="flex items-center space-x-2">
                        <IconComponent className="w-4 h-4" />
                        <div>
                          <p className="text-sm font-medium">
                            {device.hostname !== 'unknown' ? device.hostname : device.vendor}
                          </p>
                          <p className="text-xs text-muted-foreground">{device.ip_address}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <TrustIcon className={`w-3 h-3 ${
                          device.trust_level === 'trusted' ? 'text-green-500' :
                          device.trust_level === 'guest' ? 'text-blue-500' :
                          device.trust_level === 'suspicious' ? 'text-red-500' :
                          'text-gray-500'
                        }`} />
                        <div className={`w-2 h-2 rounded-full ${
                          device.is_online ? 'bg-green-500' : 'bg-gray-300'
                        }`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}