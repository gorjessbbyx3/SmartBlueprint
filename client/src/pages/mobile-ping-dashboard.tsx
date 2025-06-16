import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Smartphone, 
  Wifi, 
  MapPin, 
  Battery, 
  Activity, 
  Signal, 
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Globe
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface MobileDevice {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  signalStrength: number;
  status: string;
  lastSeen: string;
  batteryLevel?: number;
  metadata: {
    mobile?: boolean;
    network_info?: {
      ssid: string;
      bssid: string;
      rssi: number;
      frequency: number;
    };
    ping_results?: {
      [target: string]: {
        rtt: number;
        success: boolean;
        packet_loss: number;
      };
    };
    app_version?: string;
  };
}

interface PingStatistics {
  totalDevices: number;
  activeDevices: number;
  averageLatency: number;
  successRate: number;
  anomalies: number;
}

interface NetworkZone {
  ssid: string;
  trust_level: string;
  device_count: number;
  location: { lat: number; lng: number };
}

export default function MobilePingDashboard() {
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(30000);

  // Fetch mobile devices
  const { data: devicesData } = useQuery({
    queryKey: ['/api/mobile/devices'],
    refetchInterval: refreshInterval
  });

  // Fetch network zones
  const { data: networkZonesData } = useQuery({
    queryKey: ['/api/mobile/network-zones'],
    refetchInterval: 60000
  });

  const mobileDevices: MobileDevice[] = devicesData?.devices || [];
  const networkZones = networkZonesData?.network_zones || {};

  // Calculate statistics
  const statistics: PingStatistics = React.useMemo(() => {
    const activeDevices = mobileDevices.filter(device => 
      device.status === 'online' && 
      new Date(device.lastSeen).getTime() > Date.now() - 300000 // 5 minutes
    );

    const allPingResults = mobileDevices.flatMap(device => 
      Object.values(device.metadata.ping_results || {})
    );

    const successfulPings = allPingResults.filter(result => result.success);
    const totalLatency = successfulPings.reduce((sum, result) => sum + result.rtt, 0);

    return {
      totalDevices: mobileDevices.length,
      activeDevices: activeDevices.length,
      averageLatency: successfulPings.length > 0 ? Math.round(totalLatency / successfulPings.length) : 0,
      successRate: allPingResults.length > 0 ? Math.round((successfulPings.length / allPingResults.length) * 100) : 0,
      anomalies: mobileDevices.filter(device => 
        (device.metadata.network_info?.rssi || 0) < -80 || 
        (device.batteryLevel || 100) < 20
      ).length
    };
  }, [mobileDevices]);

  const getSignalQuality = (rssi: number): { label: string; color: string; score: number } => {
    if (rssi >= -50) return { label: 'Excellent', color: 'text-green-600', score: 100 };
    if (rssi >= -60) return { label: 'Good', color: 'text-blue-600', score: 80 };
    if (rssi >= -70) return { label: 'Fair', color: 'text-yellow-600', score: 60 };
    if (rssi >= -80) return { label: 'Poor', color: 'text-orange-600', score: 40 };
    return { label: 'Very Poor', color: 'text-red-600', score: 20 };
  };

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString();
  };

  const getBatteryColor = (level: number): string => {
    if (level >= 60) return 'text-green-600';
    if (level >= 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Mobile Ping Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Real-time monitoring of mobile device network performance
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="flex items-center space-x-2"
          >
            <Activity className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Devices</p>
                <p className="text-2xl font-bold">{statistics.totalDevices}</p>
              </div>
              <Smartphone className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Now</p>
                <p className="text-2xl font-bold text-green-600">{statistics.activeDevices}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Latency</p>
                <p className="text-2xl font-bold">{statistics.averageLatency}ms</p>
              </div>
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-blue-600">{statistics.successRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Anomalies</p>
                <p className="text-2xl font-bold text-red-600">{statistics.anomalies}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="devices" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="devices">Mobile Devices</TabsTrigger>
          <TabsTrigger value="networks">Network Zones</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {mobileDevices.map((device) => {
              const networkInfo = device.metadata.network_info;
              const pingResults = device.metadata.ping_results || {};
              const signalQuality = getSignalQuality(networkInfo?.rssi || -50);
              const isActive = new Date(device.lastSeen).getTime() > Date.now() - 300000;

              return (
                <Card key={device.id} className={`${selectedDevice === device.id ? 'ring-2 ring-blue-500' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center space-x-2">
                        <Smartphone className="h-5 w-5" />
                        <span>{device.name}</span>
                      </CardTitle>
                      <Badge variant={isActive ? "default" : "secondary"}>
                        {isActive ? 'Active' : 'Offline'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Network Information */}
                    {networkInfo && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Wifi className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">Network</span>
                          </div>
                          <Badge variant="outline">{networkInfo.ssid}</Badge>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Signal className="h-4 w-4 text-gray-600" />
                            <span className="text-sm">Signal Strength</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm font-medium ${signalQuality.color}`}>
                              {signalQuality.label}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({networkInfo.rssi} dBm)
                            </span>
                          </div>
                        </div>
                        
                        <Progress value={signalQuality.score} className="h-2" />
                      </div>
                    )}

                    {/* Battery Level */}
                    {device.batteryLevel !== undefined && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Battery className={`h-4 w-4 ${getBatteryColor(device.batteryLevel)}`} />
                          <span className="text-sm">Battery</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm font-medium ${getBatteryColor(device.batteryLevel)}`}>
                            {device.batteryLevel.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Location */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Location</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {device.x.toFixed(4)}, {device.y.toFixed(4)}
                      </span>
                    </div>

                    {/* Ping Results */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Globe className="h-4 w-4 text-purple-600" />
                        <span className="font-medium text-sm">Ping Results</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {Object.entries(pingResults).map(([target, result]) => (
                          <div key={target} className="flex justify-between">
                            <span className="text-gray-600">{target}:</span>
                            <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                              {result.success ? `${result.rtt}ms` : 'Failed'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Last Seen */}
                    <div className="text-xs text-gray-500 border-t pt-2">
                      Last seen: {formatTimestamp(device.lastSeen)}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDevice(selectedDevice === device.id ? null : device.id)}
                      className="w-full"
                    >
                      {selectedDevice === device.id ? 'Deselect' : 'View Details'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {mobileDevices.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Smartphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Mobile Devices Found
                </h3>
                <p className="text-gray-500 mb-4">
                  Install the SmartBlueprint Pro mobile app to start monitoring device performance.
                </p>
                <Button variant="outline">
                  Download Mobile App
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="networks" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(networkZones).map(([zoneType, networks]: [string, any[]]) => (
              <Card key={zoneType}>
                <CardHeader>
                  <CardTitle className="capitalize flex items-center space-x-2">
                    <Wifi className="h-5 w-5" />
                    <span>{zoneType.replace('_', ' ')}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {networks.map((network, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{network.ssid}</div>
                          <div className="text-sm text-gray-500">
                            {network.device_count} device{network.device_count !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <Badge 
                          variant={
                            network.trust_level === 'trusted' ? 'default' : 
                            network.trust_level === 'guest' ? 'secondary' : 'outline'
                          }
                        >
                          {network.trust_level}
                        </Badge>
                      </div>
                    ))}
                    {networks.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No {zoneType.replace('_', ' ')} found
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Network Quality</span>
                    <span className="font-medium">
                      {statistics.successRate > 90 ? 'Excellent' : 
                       statistics.successRate > 70 ? 'Good' : 'Needs Attention'}
                    </span>
                  </div>
                  <Progress value={statistics.successRate} className="h-3" />
                  
                  <div className="flex justify-between items-center">
                    <span>Device Coverage</span>
                    <span className="font-medium">
                      {Math.round((statistics.activeDevices / Math.max(statistics.totalDevices, 1)) * 100)}%
                    </span>
                  </div>
                  <Progress 
                    value={(statistics.activeDevices / Math.max(statistics.totalDevices, 1)) * 100} 
                    className="h-3" 
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {statistics.anomalies === 0 ? (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        All mobile devices are operating within normal parameters.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {statistics.anomalies} device{statistics.anomalies !== 1 ? 's' : ''} 
                        {statistics.anomalies === 1 ? ' is' : ' are'} experiencing issues 
                        (weak signal or low battery).
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {statistics.totalDevices - statistics.anomalies}
                      </div>
                      <div className="text-sm text-gray-600">Healthy Devices</div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {statistics.anomalies}
                      </div>
                      <div className="text-sm text-gray-600">Need Attention</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Refresh Interval
                </label>
                <select 
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="w-full p-2 border rounded-md"
                >
                  <option value={10000}>10 seconds</option>
                  <option value={30000}>30 seconds</option>
                  <option value={60000}>1 minute</option>
                  <option value={300000}>5 minutes</option>
                </select>
              </div>
              
              <div className="flex space-x-2">
                <Button variant="outline">Export Data</Button>
                <Button variant="outline">Clear Cache</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}