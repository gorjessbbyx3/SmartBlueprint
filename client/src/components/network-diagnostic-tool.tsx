import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  Stop, 
  RefreshCw, 
  Wifi, 
  Network, 
  Shield, 
  CheckCircle, 
  AlertTriangle,
  XCircle,
  Monitor,
  Router,
  Smartphone,
  Tv,
  Speaker,
  Info
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface NetworkScanResult {
  deviceCount: number;
  scanning: boolean;
  lastScan: string;
  devices: NetworkDevice[];
  scanMethods: ScanMethod[];
  networkInfo: NetworkInfo;
}

interface NetworkDevice {
  ip: string;
  macAddress: string;
  deviceType: string;
  vendor: string;
  protocol: string;
  rssi: number;
  isOnline: boolean;
  lastSeen: string;
  ports: number[];
}

interface ScanMethod {
  name: string;
  status: 'active' | 'inactive' | 'error';
  devicesFound: number;
  description: string;
  requiresAgent: boolean;
}

interface NetworkInfo {
  localIP: string;
  subnet: string;
  gateway: string;
  dnsServers: string[];
  interfaceName: string;
}

export function NetworkDiagnosticTool() {
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const queryClient = useQueryClient();

  const { data: scanResults, refetch } = useQuery<NetworkScanResult>({
    queryKey: ['/api/network/diagnostic-scan'],
    refetchInterval: scanning ? 2000 : false,
  });

  const startScanMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/network/start-diagnostic-scan', {
        method: 'POST',
      });
      return response.json();
    },
    onSuccess: () => {
      setScanning(true);
      setScanProgress(0);
      queryClient.invalidateQueries({ queryKey: ['/api/network/diagnostic-scan'] });
    },
  });

  const stopScanMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/network/stop-diagnostic-scan', {
        method: 'POST',
      });
      return response.json();
    },
    onSuccess: () => {
      setScanning(false);
      setScanProgress(0);
    },
  });

  useEffect(() => {
    if (scanning && scanResults?.scanning) {
      const interval = setInterval(() => {
        setScanProgress(prev => Math.min(prev + 1, 100));
      }, 100);

      return () => clearInterval(interval);
    } else if (scanResults && !scanResults.scanning && scanning) {
      setScanning(false);
      setScanProgress(100);
    }
  }, [scanning, scanResults]);

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'router':
      case 'gateway':
        return <Router className="h-4 w-4" />;
      case 'smartphone':
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'smart_tv':
      case 'tv':
        return <Tv className="h-4 w-4" />;
      case 'speaker':
      case 'smart_speaker':
        return <Speaker className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getMethodStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'inactive':
        return <XCircle className="h-4 w-4 text-gray-400" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  // Mock data for demonstration - real implementation would use actual network scanning
  const mockScanResults: NetworkScanResult = {
    deviceCount: 0,
    scanning: false,
    lastScan: 'No scan performed',
    devices: [],
    scanMethods: [
      {
        name: 'ARP Table Scan',
        status: 'inactive',
        devicesFound: 0,
        description: 'Scans the local ARP table for connected devices',
        requiresAgent: true
      },
      {
        name: 'ICMP Ping Sweep',
        status: 'inactive',
        devicesFound: 0,
        description: 'Pings all IPs in the local subnet to find active devices',
        requiresAgent: true
      },
      {
        name: 'mDNS Discovery',
        status: 'inactive',
        devicesFound: 0,
        description: 'Discovers devices advertising via multicast DNS',
        requiresAgent: true
      },
      {
        name: 'SSDP Discovery',
        status: 'inactive',
        devicesFound: 0,
        description: 'Finds UPnP devices using Simple Service Discovery Protocol',
        requiresAgent: true
      },
      {
        name: 'Port Scanning',
        status: 'inactive',
        devicesFound: 0,
        description: 'Scans common ports to identify device types',
        requiresAgent: true
      }
    ],
    networkInfo: {
      localIP: 'Unknown',
      subnet: 'Unknown',
      gateway: 'Unknown',
      dnsServers: [],
      interfaceName: 'Unknown'
    }
  };

  const results = scanResults || mockScanResults;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Network className="h-5 w-5 mr-2" />
              Network Diagnostic Tool
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={() => startScanMutation.mutate()}
                disabled={scanning || startScanMutation.isPending}
                size="sm"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Scan
              </Button>
              {scanning && (
                <Button
                  onClick={() => stopScanMutation.mutate()}
                  variant="outline"
                  size="sm"
                >
                  <Stop className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              )}
              <Button onClick={() => refetch()} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Comprehensive network scanning to discover and analyze devices on your local network
          </CardDescription>
        </CardHeader>
        <CardContent>
          {scanning && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Scanning Progress</span>
                <span className="text-sm text-muted-foreground">{scanProgress}%</span>
              </div>
              <Progress value={scanProgress} className="w-full" />
            </div>
          )}

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="devices">Devices</TabsTrigger>
              <TabsTrigger value="methods">Scan Methods</TabsTrigger>
              <TabsTrigger value="network">Network Info</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center">
                      <Wifi className="h-4 w-4 mr-2 text-blue-600" />
                      Devices Found
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{results.deviceCount}</div>
                    <p className="text-sm text-muted-foreground">
                      Last scan: {results.lastScan}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center">
                      <Shield className="h-4 w-4 mr-2 text-green-600" />
                      Scan Methods
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {results.scanMethods.filter(m => m.status === 'active').length}/
                      {results.scanMethods.length}
                    </div>
                    <p className="text-sm text-muted-foreground">Active methods</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center">
                      <Network className="h-4 w-4 mr-2 text-purple-600" />
                      Network Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {results.networkInfo.localIP !== 'Unknown' ? 'Connected' : 'Unknown'}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      IP: {results.networkInfo.localIP}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {results.devices.length === 0 && (
                <Alert className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No devices detected. Network scanning requires the desktop agent to access 
                    local network interfaces and perform ARP/ping scans that browsers cannot execute.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="devices">
              <div className="space-y-4">
                {results.devices.length > 0 ? (
                  results.devices.map((device, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {getDeviceIcon(device.deviceType)}
                            <div>
                              <div className="font-medium">{device.ip}</div>
                              <div className="text-sm text-muted-foreground">
                                {device.vendor} • {device.deviceType}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={device.isOnline ? 'default' : 'secondary'}>
                              {device.isOnline ? 'Online' : 'Offline'}
                            </Badge>
                            <div className="text-sm text-muted-foreground">
                              RSSI: {device.rssi}dBm
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          MAC: {device.macAddress} • Last seen: {device.lastSeen}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Monitor className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No Devices Found</h3>
                    <p className="text-muted-foreground mb-4">
                      Start a network scan to discover devices on your local network.
                    </p>
                    <Button onClick={() => startScanMutation.mutate()} disabled={scanning}>
                      <Play className="h-4 w-4 mr-2" />
                      Start Network Scan
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="methods">
              <div className="space-y-4">
                {results.scanMethods.map((method, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getMethodStatusIcon(method.status)}
                          <div>
                            <div className="font-medium">{method.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {method.description}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={method.status === 'active' ? 'default' : 'secondary'}>
                            {method.status}
                          </Badge>
                          <div className="text-sm text-muted-foreground">
                            {method.devicesFound} devices
                          </div>
                        </div>
                      </div>
                      {method.requiresAgent && method.status !== 'active' && (
                        <div className="mt-2 text-xs text-amber-600">
                          Requires desktop agent for system-level network access
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="network">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Network Interface Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Local IP Address</label>
                      <div className="text-sm text-muted-foreground">{results.networkInfo.localIP}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Subnet</label>
                      <div className="text-sm text-muted-foreground">{results.networkInfo.subnet}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Gateway</label>
                      <div className="text-sm text-muted-foreground">{results.networkInfo.gateway}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Interface</label>
                      <div className="text-sm text-muted-foreground">{results.networkInfo.interfaceName}</div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">DNS Servers</label>
                    <div className="text-sm text-muted-foreground">
                      {results.networkInfo.dnsServers.length > 0 
                        ? results.networkInfo.dnsServers.join(', ')
                        : 'Unknown'
                      }
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}