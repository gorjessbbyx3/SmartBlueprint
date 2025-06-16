import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Wifi, 
  Printer, 
  Gamepad2, 
  Tv, 
  Router, 
  Laptop, 
  Smartphone, 
  HardDrive,
  Speaker,
  Camera,
  Thermometer,
  Scan,
  RefreshCw,
  Network,
  Activity
} from "lucide-react";

interface DiscoveredDevice {
  name: string;
  ip: string;
  mac: string;
  vendor?: string;
  hostname?: string;
  deviceType: string;
  confidence: number;
  protocol: string;
  services: string[];
  isOnline: boolean;
  lastSeen: Date;
  capabilities: {
    hasmDNS: boolean;
    hasUPnP: boolean;
    hasSSDP: boolean;
    hasHTTP: boolean;
    supportedServices: string[];
  };
  classification?: {
    original: string;
    enhanced: string;
    confidence: number;
    matchedKeywords: string[];
  };
}

interface DiscoveryResult {
  success: boolean;
  discovery: {
    mdns: {
      count: number;
      services: any[];
    };
    ssdp: {
      count: number;
      devices: any[];
    };
    summary: {
      totalDiscovered: number;
      byProtocol: {
        mDNS: number;
        SSDP: number;
      };
    };
  };
}

const deviceTypeIcons = {
  printer: Printer,
  game_console: Gamepad2,
  smart_tv: Tv,
  router: Router,
  computer: Laptop,
  mobile_device: Smartphone,
  nas_storage: HardDrive,
  smart_speaker: Speaker,
  security_camera: Camera,
  thermostat: Thermometer,
  unknown: Network
};

const deviceTypeColors = {
  printer: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  game_console: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  smart_tv: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  router: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  computer: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  mobile_device: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
  nas_storage: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
  smart_speaker: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  security_camera: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  thermostat: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
  unknown: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300"
};

export default function DeviceDiscoveryPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<DiscoveredDevice | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch direct WiFi device discovery
  const { data: discoveryData, isLoading: isLoadingDiscovery } = useQuery<DiscoveryResult>({
    queryKey: ['/api/devices/discover-direct'],
    enabled: false // Only run when manually triggered
  });

  // Fetch mDNS services
  const { data: mdnsData, isLoading: isLoadingMDNS } = useQuery({
    queryKey: ['/api/telemetry/mdns-discovery'],
    enabled: false
  });

  // Fetch SSDP devices
  const { data: ssdpData, isLoading: isLoadingSSSDP } = useQuery({
    queryKey: ['/api/telemetry/ssdp-discovery'],
    enabled: false
  });

  // Device discovery mutation
  const discoveryMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/devices/discover-direct');
      if (!response.ok) throw new Error('Discovery failed');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/devices/discover-direct'], data);
      toast({
        title: "Discovery Complete",
        description: `Found ${data.discovery?.summary?.totalDiscovered || 0} devices on the network`,
      });
    },
    onError: (error) => {
      toast({
        title: "Discovery Failed",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsScanning(false);
    }
  });

  // Device classification mutation
  const classifyMutation = useMutation({
    mutationFn: async (devices: any[]) => {
      const response = await fetch('/api/devices/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devices })
      });
      if (!response.ok) throw new Error('Classification failed');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Classification Complete",
        description: `Classified ${data.summary?.classified || 0} devices`,
      });
    }
  });

  const handleStartDiscovery = async () => {
    setIsScanning(true);
    discoveryMutation.mutate();
  };

  const handleRefreshMDNS = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/telemetry/mdns-discovery'] });
    queryClient.refetchQueries({ queryKey: ['/api/telemetry/mdns-discovery'] });
  };

  const handleRefreshSSSDP = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/telemetry/ssdp-discovery'] });
    queryClient.refetchQueries({ queryKey: ['/api/telemetry/ssdp-discovery'] });
  };

  const getDeviceIcon = (deviceType: string) => {
    const IconComponent = deviceTypeIcons[deviceType as keyof typeof deviceTypeIcons] || Network;
    return <IconComponent className="h-5 w-5" />;
  };

  const getDeviceTypeColor = (deviceType: string) => {
    return deviceTypeColors[deviceType as keyof typeof deviceTypeColors] || deviceTypeColors.unknown;
  };

  const formatConfidence = (confidence: number) => {
    return `${(confidence * 100).toFixed(1)}%`;
  };

  const renderDeviceCard = (device: any, protocol: string) => (
    <Card key={`${protocol}-${device.name || device.st}`} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getDeviceIcon(device.deviceType || 'unknown')}
            <CardTitle className="text-lg">{device.name || device.st || 'Unknown Device'}</CardTitle>
          </div>
          <Badge className={getDeviceTypeColor(device.deviceType || 'unknown')}>
            {device.deviceType || 'unknown'}
          </Badge>
        </div>
        <CardDescription>
          {device.host || device.server || device.ip || 'No hostname'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Protocol:</span>
            <Badge variant="outline" className="ml-2">{protocol}</Badge>
          </div>
          <div>
            <span className="font-medium">Port:</span>
            <span className="ml-2">{device.port || 'N/A'}</span>
          </div>
        </div>
        
        {device.addresses && (
          <div className="text-sm">
            <span className="font-medium">Addresses:</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {device.addresses.map((addr: string, idx: number) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {addr}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {device.classification && (
          <div className="text-sm">
            <span className="font-medium">Classification Confidence:</span>
            <div className="mt-1">
              <Progress value={device.classification.confidence * 100} className="h-2" />
              <span className="text-xs text-muted-foreground">
                {formatConfidence(device.classification.confidence)}
              </span>
            </div>
          </div>
        )}

        {device.type && (
          <div className="text-sm">
            <span className="font-medium">Service Type:</span>
            <span className="ml-2 font-mono text-xs">{device.type}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Direct WiFi Device Discovery</h1>
          <p className="text-muted-foreground mt-2">
            Discover and monitor all WiFi devices including printers, game systems, and network equipment
          </p>
        </div>
        <Button 
          onClick={handleStartDiscovery} 
          disabled={isScanning || discoveryMutation.isPending}
          className="flex items-center gap-2"
        >
          {isScanning || discoveryMutation.isPending ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Scan className="h-4 w-4" />
          )}
          {isScanning ? 'Scanning...' : 'Start Discovery'}
        </Button>
      </div>

      {discoveryData && (
        <Alert>
          <Activity className="h-4 w-4" />
          <AlertDescription>
            Discovery complete: Found {discoveryData.discovery.summary.totalDiscovered} devices 
            ({discoveryData.discovery.summary.byProtocol.mDNS} mDNS, {discoveryData.discovery.summary.byProtocol.SSDP} SSDP)
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="mdns">mDNS Devices</TabsTrigger>
          <TabsTrigger value="ssdp">SSDP Devices</TabsTrigger>
          <TabsTrigger value="telemetry">Telemetry</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Discovered</CardTitle>
                <Network className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {discoveryData?.discovery.summary.totalDiscovered || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  All network protocols
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">mDNS Services</CardTitle>
                <Wifi className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {discoveryData?.discovery.mdns.count || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Bonjour/Zeroconf devices
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">SSDP Devices</CardTitle>
                <Router className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {discoveryData?.discovery.ssdp.count || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  UPnP devices
                </p>
              </CardContent>
            </Card>
          </div>

          {discoveryData && discoveryData.discovery.summary.totalDiscovered === 0 && (
            <Alert>
              <Network className="h-4 w-4" />
              <AlertDescription>
                No devices discovered yet. This is normal in cloud environments. In a real local network, 
                the desktop agent would discover printers, game consoles, smart TVs, and other WiFi devices.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="mdns" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">mDNS Services</h3>
            <Button variant="outline" size="sm" onClick={handleRefreshMDNS}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {discoveryData?.discovery.mdns.services.map((service, index) => 
              renderDeviceCard(service, 'mDNS')
            )}
          </div>

          {(!discoveryData?.discovery.mdns.services.length) && (
            <div className="text-center py-8 text-muted-foreground">
              No mDNS services discovered. Run discovery to find devices like printers, 
              AirPlay devices, and file sharing services.
            </div>
          )}
        </TabsContent>

        <TabsContent value="ssdp" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">SSDP Devices</h3>
            <Button variant="outline" size="sm" onClick={handleRefreshSSSDP}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {discoveryData?.discovery.ssdp.devices.map((device, index) => 
              renderDeviceCard(device, 'SSDP')
            )}
          </div>

          {(!discoveryData?.discovery.ssdp.devices.length) && (
            <div className="text-center py-8 text-muted-foreground">
              No SSDP devices discovered. Run discovery to find UPnP devices like 
              media servers, routers, and smart TVs.
            </div>
          )}
        </TabsContent>

        <TabsContent value="telemetry" className="space-y-4">
          <h3 className="text-lg font-semibold">Device Telemetry & Classification</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Device Type Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(deviceTypeIcons).map(([type, Icon]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span className="capitalize">{type.replace('_', ' ')}</span>
                      </div>
                      <Badge variant="outline">0</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Protocol Coverage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>mDNS (Bonjour)</span>
                    <Badge variant="outline">
                      {discoveryData?.discovery.mdns.count || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>SSDP (UPnP)</span>
                    <Badge variant="outline">
                      {discoveryData?.discovery.ssdp.count || 0}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between font-medium">
                    <span>Total Coverage</span>
                    <Badge>
                      {discoveryData?.discovery.summary.totalDiscovered || 0}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}