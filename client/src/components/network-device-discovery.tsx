import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';
import { ScrollArea } from './ui/scroll-area';
import { 
  Wifi, 
  Search, 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  Router,
  Smartphone,
  Speaker,
  Lightbulb,
  Thermometer,
  Camera,
  Gamepad2,
  Tv,
  Home,
  Clock,
  MapPin
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface NetworkDevice {
  ip: string;
  mac: string;
  hostname?: string;
  vendor?: string;
  deviceType: string;
  deviceName: string;
  isOnline: boolean;
  lastSeen: Date;
  services: string[];
}

interface NetworkScanResult {
  devices: NetworkDevice[];
  networkInfo: {
    gateway: string;
    subnet: string;
    totalHosts: number;
  };
  scanDuration: number;
  privacy: {
    dataStaysLocal: boolean;
    noExternalTransmission: boolean;
  };
}

interface NetworkDeviceDiscoveryProps {
  onDevicesDiscovered?: (devices: NetworkDevice[]) => void;
}

const deviceIcons = {
  smart_tv: Tv,
  smart_speaker: Speaker,
  smart_light: Lightbulb,
  thermostat: Thermometer,
  security_camera: Camera,
  smart_plug: Home,
  router: Router,
  game_console: Gamepad2,
  streaming_device: Tv,
  smart_hub: Home,
  unknown_device: Smartphone
};

const deviceTypeNames = {
  smart_tv: 'Smart TV',
  smart_speaker: 'Smart Speaker',
  smart_light: 'Smart Light',
  thermostat: 'Thermostat',
  security_camera: 'Security Camera',
  smart_plug: 'Smart Plug',
  router: 'Router',
  game_console: 'Game Console',
  streaming_device: 'Streaming Device',
  smart_hub: 'Smart Hub',
  unknown_device: 'Unknown Device'
};

export function NetworkDeviceDiscovery({ onDevicesDiscovered }: NetworkDeviceDiscoveryProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userConsent, setUserConsent] = useState(false);
  const [scanIntensive, setScanIntensive] = useState(false);
  const [includeVendorLookup, setIncludeVendorLookup] = useState(true);
  const [scanResult, setScanResult] = useState<NetworkScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const networkScanMutation = useMutation({
    mutationFn: async (scanRequest: {
      userConsent: boolean;
      scanIntensive: boolean;
      includeVendorLookup: boolean;
    }) => {
      const response = await fetch('/api/network/scan', {
        method: 'POST',
        body: JSON.stringify(scanRequest),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Network scan failed: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setScanResult(data.scanResult);
      onDevicesDiscovered?.(data.scanResult.devices);
      
      toast({
        title: "Network Scan Complete",
        description: `Found ${data.scanResult.devices.length} devices on your network`,
      });
      
      // Refresh devices list
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      
      setIsScanning(false);
      setScanProgress(100);
    },
    onError: (error: any) => {
      console.error('Network scan failed:', error);
      toast({
        title: "Network Scan Failed",
        description: error.message || "Unable to scan network for devices",
        variant: "destructive"
      });
      setIsScanning(false);
      setScanProgress(0);
    }
  });

  const handleStartScan = async () => {
    if (!userConsent) {
      toast({
        title: "Consent Required",
        description: "Please agree to the privacy terms before starting the scan",
        variant: "destructive"
      });
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
    setScanResult(null);

    // Simulate progress during scan
    const progressInterval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 500);

    networkScanMutation.mutate({
      userConsent,
      scanIntensive,
      includeVendorLookup
    });
  };

  const handleAssignToRoom = (device: NetworkDevice) => {
    toast({
      title: "Device Assignment",
      description: `${device.deviceName} can be assigned to a room in the mapping view`,
    });
  };

  const getDeviceIcon = (deviceType: string) => {
    const IconComponent = deviceIcons[deviceType as keyof typeof deviceIcons] || Smartphone;
    return <IconComponent className="h-4 w-4" />;
  };

  const getDeviceTypeName = (deviceType: string) => {
    return deviceTypeNames[deviceType as keyof typeof deviceTypeNames] || 'Unknown Device';
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full h-auto p-4 flex items-center justify-start bg-blue-50 hover:bg-blue-100">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
              <Search className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium">Scan for Smart Devices</div>
              <div className="text-xs text-gray-500">Find TVs, speakers, lights & more</div>
            </div>
          </div>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Smart Device Discovery
          </DialogTitle>
          <DialogDescription>
            Automatically find smart devices connected to your Wi-Fi network
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Privacy Notice */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                Privacy & Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span>All scanning occurs locally on your home network</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span>No device or IP information is sent externally</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span>Data is used only for indoor mapping and optimization</span>
              </div>
            </CardContent>
          </Card>

          {/* Scan Options */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="consent" 
                checked={userConsent} 
                onCheckedChange={(checked) => setUserConsent(!!checked)}
              />
              <Label htmlFor="consent" className="text-sm">
                I consent to scanning my local network for smart devices
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="vendor-lookup" 
                checked={includeVendorLookup} 
                onCheckedChange={(checked) => setIncludeVendorLookup(!!checked)}
              />
              <Label htmlFor="vendor-lookup" className="text-sm">
                Include device manufacturer identification
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="intensive" 
                checked={scanIntensive} 
                onCheckedChange={(checked) => setScanIntensive(!!checked)}
              />
              <Label htmlFor="intensive" className="text-sm">
                Intensive scan (takes longer but finds more devices)
              </Label>
            </div>
          </div>

          {/* Scan Progress */}
          {isScanning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Scanning network...</span>
                <span>{Math.round(scanProgress)}%</span>
              </div>
              <Progress value={scanProgress} className="w-full" />
              <div className="text-xs text-gray-500 text-center">
                Looking for smart TVs, speakers, lights, thermostats, and other devices
              </div>
            </div>
          )}

          {/* Scan Results */}
          {scanResult && !isScanning && (
            <div className="space-y-4">
              <Separator />
              
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Discovered Devices</h3>
                <Badge variant="secondary">
                  {scanResult.devices.length} devices found
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-gray-50 p-2 rounded">
                  <div className="font-medium">Network</div>
                  <div className="text-gray-600">{scanResult.networkInfo.subnet}.0/24</div>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <div className="font-medium">Scan Time</div>
                  <div className="text-gray-600">{(scanResult.scanDuration / 1000).toFixed(1)}s</div>
                </div>
              </div>

              <ScrollArea className="h-64 w-full">
                <div className="space-y-2">
                  {scanResult.devices.map((device, index) => (
                    <Card key={`${device.ip}-${index}`} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                            {getDeviceIcon(device.deviceType)}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{device.deviceName}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-2">
                              <span>{device.ip}</span>
                              {device.vendor && (
                                <>
                                  <span>•</span>
                                  <span>{device.vendor}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {getDeviceTypeName(device.deviceType)}
                          </Badge>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleAssignToRoom(device)}
                            className="h-6 px-2 text-xs"
                          >
                            <MapPin className="h-3 w-3 mr-1" />
                            Assign
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>

              {scanResult.devices.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <div className="text-sm">No devices found</div>
                  <div className="text-xs">Try enabling intensive scan or check your network connection</div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            <Clock className="h-3 w-3 inline mr-1" />
            Typical scan takes 10-30 seconds
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Close
            </Button>
            <Button 
              onClick={handleStartScan} 
              disabled={!userConsent || isScanning}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isScanning ? (
                <>
                  <Search className="h-4 w-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Start Scan
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}