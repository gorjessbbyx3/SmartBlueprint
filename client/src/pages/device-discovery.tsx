import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
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
  Activity,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  UserPlus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft
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
  isTrusted?: boolean;
  assignedTo?: string;
  capabilities: {
    hasmDNS: boolean;
    hasUPnP: boolean;
    hasSSDP: boolean;
    hasHTTP: boolean;
    supportedServices: string[];
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

export default function DeviceManagementPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [trustDialogOpen, setTrustDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [deviceNickname, setDeviceNickname] = useState("");
  const [assignedResident, setAssignedResident] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch residents for assignment
  const { data: residents = [] } = useQuery<any[]>({
    queryKey: ['/api/security/residents'],
  });

  // Fetch trusted devices
  const { data: trustedDevices = [] } = useQuery<any[]>({
    queryKey: ['/api/security/resident-devices'],
  });

  // Fetch direct WiFi device discovery
  const { data: discoveryData } = useQuery<DiscoveryResult>({
    queryKey: ['/api/devices/discover-direct'],
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
        title: "Network Scan Complete",
        description: `Found ${data.discovery?.summary?.totalDiscovered || 0} devices on the network`,
      });
    },
    onError: (error) => {
      toast({
        title: "Scan Failed",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsScanning(false);
    }
  });

  // Trust device mutation
  const trustDeviceMutation = useMutation({
    mutationFn: async (deviceData: { mac: string; name: string; residentId?: number }) => {
      const response = await fetch('/api/security/resident-devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          macAddress: deviceData.mac,
          deviceName: deviceData.name,
          residentId: deviceData.residentId,
          deviceType: 'network_device',
          isPrimary: false
        })
      });
      if (!response.ok) throw new Error('Failed to trust device');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/security/resident-devices'] });
      toast({
        title: "Device Trusted",
        description: "This device is now registered as a trusted device.",
      });
      setTrustDialogOpen(false);
      setSelectedDevice(null);
      setDeviceNickname("");
      setAssignedResident("");
    },
    onError: (error) => {
      toast({
        title: "Failed to Trust Device",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Remove trusted device mutation
  const removeTrustMutation = useMutation({
    mutationFn: async (deviceId: number) => {
      const response = await fetch(`/api/security/resident-devices/${deviceId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to remove device');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/security/resident-devices'] });
      toast({
        title: "Device Removed",
        description: "This device is no longer trusted.",
      });
    }
  });

  const handleStartDiscovery = async () => {
    setIsScanning(true);
    discoveryMutation.mutate();
  };

  const handleTrustDevice = (device: any) => {
    setSelectedDevice(device);
    setDeviceNickname(device.name || device.hostname || '');
    setTrustDialogOpen(true);
  };

  const handleConfirmTrust = () => {
    if (selectedDevice) {
      trustDeviceMutation.mutate({
        mac: selectedDevice.mac || selectedDevice.addresses?.[0] || 'unknown',
        name: deviceNickname || selectedDevice.name,
        residentId: assignedResident ? parseInt(assignedResident) : undefined
      });
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    const IconComponent = deviceTypeIcons[deviceType as keyof typeof deviceTypeIcons] || Network;
    return <IconComponent className="h-5 w-5" />;
  };

  const getDeviceTypeColor = (deviceType: string) => {
    return deviceTypeColors[deviceType as keyof typeof deviceTypeColors] || deviceTypeColors.unknown;
  };

  // Check if a device MAC is trusted
  const isDeviceTrusted = (mac: string) => {
    return trustedDevices.some((td: any) => td.macAddress === mac);
  };

  const allDiscoveredDevices = [
    ...(discoveryData?.discovery.mdns.services || []).map(s => ({ ...s, protocol: 'mDNS' })),
    ...(discoveryData?.discovery.ssdp.devices || []).map(d => ({ ...d, protocol: 'SSDP' }))
  ];

  const unknownDevices = allDiscoveredDevices.filter(d => !isDeviceTrusted(d.mac || d.addresses?.[0]));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Security Dashboard
                </Button>
              </Link>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Shield className="h-6 w-6 text-blue-600" />
                  Device Trust Management
                </h1>
                <p className="text-sm text-muted-foreground">
                  Manage trusted devices to distinguish family members from intruders
                </p>
              </div>
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
              {isScanning ? 'Scanning Network...' : 'Scan for Devices'}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6 space-y-6">
        {/* Security Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trusted Devices</CardTitle>
              <ShieldCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {trustedDevices.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Registered household devices
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unknown Devices</CardTitle>
              <ShieldAlert className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {unknownDevices.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Require review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Residents</CardTitle>
              <UserPlus className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Array.isArray(residents) ? residents.length : 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Registered household members
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Network Scan</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {discoveryData?.discovery.summary.totalDiscovered || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Total discovered
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Alert for unknown devices */}
        {unknownDevices.length > 0 && (
          <Alert variant="default" className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Unknown Devices Detected</AlertTitle>
            <AlertDescription className="text-amber-700">
              {unknownDevices.length} device(s) on your network are not registered.
              Review them below and mark trusted devices to improve intrusion detection accuracy.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="trusted" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trusted" className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Trusted Devices ({trustedDevices.length})
            </TabsTrigger>
            <TabsTrigger value="unknown" className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              Unknown Devices ({unknownDevices.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              All Network Devices
            </TabsTrigger>
          </TabsList>

          {/* Trusted Devices Tab */}
          <TabsContent value="trusted" className="space-y-4">
            {trustedDevices.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="flex flex-col items-center gap-4">
                  <ShieldCheck className="h-12 w-12 text-gray-300" />
                  <div>
                    <h3 className="text-lg font-semibold">No Trusted Devices Yet</h3>
                    <p className="text-muted-foreground mt-2">
                      Scan your network and mark devices as trusted to help the system
                      distinguish family members from potential intruders.
                    </p>
                  </div>
                  <Button onClick={handleStartDiscovery} disabled={isScanning}>
                    <Scan className="h-4 w-4 mr-2" />
                    Scan Network
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trustedDevices.map((device: any) => (
                  <Card key={device.id} className="border-green-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <ShieldCheck className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{device.deviceName}</CardTitle>
                            <CardDescription className="text-xs font-mono">
                              {device.macAddress}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-800">Trusted</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Type:</span>
                          <span className="capitalize">{device.deviceType?.replace('_', ' ') || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Primary:</span>
                          <span>{device.isPrimary ? 'Yes' : 'No'}</span>
                        </div>
                        <Separator className="my-2" />
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => removeTrustMutation.mutate(device.id)}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Remove Trust
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Unknown Devices Tab */}
          <TabsContent value="unknown" className="space-y-4">
            {unknownDevices.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="flex flex-col items-center gap-4">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                  <div>
                    <h3 className="text-lg font-semibold">All Clear!</h3>
                    <p className="text-muted-foreground mt-2">
                      All discovered devices have been reviewed. Run a new scan to check for new devices.
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unknownDevices.map((device, index) => (
                  <Card key={`unknown-${index}`} className="border-amber-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-amber-100 rounded-lg">
                            {getDeviceIcon(device.deviceType || 'unknown')}
                          </div>
                          <div>
                            <CardTitle className="text-base">
                              {device.name || device.hostname || 'Unknown Device'}
                            </CardTitle>
                            <CardDescription className="text-xs font-mono">
                              {device.mac || device.addresses?.[0] || 'No MAC'}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline" className="border-amber-300 text-amber-700">
                          Unknown
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Protocol:</span>
                          <Badge variant="outline">{device.protocol}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Type:</span>
                          <span className={`px-2 py-1 rounded text-xs ${getDeviceTypeColor(device.deviceType || 'unknown')}`}>
                            {device.deviceType || 'unknown'}
                          </span>
                        </div>
                        {device.host && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Host:</span>
                            <span className="text-xs">{device.host}</span>
                          </div>
                        )}
                        <Separator className="my-2" />
                        <Button
                          className="w-full bg-green-600 hover:bg-green-700"
                          size="sm"
                          onClick={() => handleTrustDevice(device)}
                        >
                          <ShieldCheck className="h-4 w-4 mr-2" />
                          Mark as Trusted
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* All Devices Tab */}
          <TabsContent value="all" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing all {allDiscoveredDevices.length} discovered devices on your network
              </p>
              <Button variant="outline" size="sm" onClick={handleStartDiscovery} disabled={isScanning}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
                Rescan
              </Button>
            </div>

            {allDiscoveredDevices.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="flex flex-col items-center gap-4">
                  <Network className="h-12 w-12 text-gray-300" />
                  <div>
                    <h3 className="text-lg font-semibold">No Devices Found</h3>
                    <p className="text-muted-foreground mt-2">
                      Run a network scan to discover devices. In a cloud environment,
                      only limited discovery is available. Use the desktop agent for full network scanning.
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allDiscoveredDevices.map((device, index) => {
                  const isTrusted = isDeviceTrusted(device.mac || device.addresses?.[0]);
                  return (
                    <Card key={`all-${index}`} className={isTrusted ? 'border-green-200' : 'border-gray-200'}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getDeviceIcon(device.deviceType || 'unknown')}
                            <CardTitle className="text-base">
                              {device.name || device.hostname || 'Unknown Device'}
                            </CardTitle>
                          </div>
                          {isTrusted ? (
                            <Badge className="bg-green-100 text-green-800">
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              Trusted
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <ShieldAlert className="h-3 w-3 mr-1" />
                              Unknown
                            </Badge>
                          )}
                        </div>
                        <CardDescription>
                          {device.host || device.ip || 'No hostname'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Protocol:</span>
                          <Badge variant="outline">{device.protocol}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Type:</span>
                          <Badge className={getDeviceTypeColor(device.deviceType || 'unknown')}>
                            {device.deviceType || 'unknown'}
                          </Badge>
                        </div>
                        {device.addresses && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {device.addresses.slice(0, 2).map((addr: string, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {addr}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {!isTrusted && (
                          <>
                            <Separator className="my-2" />
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => handleTrustDevice(device)}
                            >
                              <ShieldCheck className="h-4 w-4 mr-2" />
                              Mark as Trusted
                            </Button>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* How it works section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              How Device Trust Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center p-4">
                <div className="p-3 bg-blue-100 rounded-full mb-3">
                  <Scan className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="font-semibold mb-2">1. Scan Network</h4>
                <p className="text-sm text-muted-foreground">
                  The system discovers all devices connected to your WiFi network using mDNS and SSDP protocols.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-4">
                <div className="p-3 bg-green-100 rounded-full mb-3">
                  <ShieldCheck className="h-6 w-6 text-green-600" />
                </div>
                <h4 className="font-semibold mb-2">2. Mark Trusted</h4>
                <p className="text-sm text-muted-foreground">
                  Register your family's devices (phones, laptops, tablets) so the system knows they belong.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-4">
                <div className="p-3 bg-red-100 rounded-full mb-3">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h4 className="font-semibold mb-2">3. Get Alerts</h4>
                <p className="text-sm text-muted-foreground">
                  When an unknown device appears while security is armed, you'll receive an intrusion alert.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trust Device Dialog */}
      <Dialog open={trustDialogOpen} onOpenChange={setTrustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-600" />
              Trust This Device
            </DialogTitle>
            <DialogDescription>
              Register this device as a trusted household device.
              It will no longer trigger intrusion alerts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Device Name</Label>
              <Input
                value={deviceNickname}
                onChange={(e) => setDeviceNickname(e.target.value)}
                placeholder="e.g., Dad's iPhone, Living Room TV"
              />
            </div>
            <div className="space-y-2">
              <Label>MAC Address</Label>
              <Input
                value={selectedDevice?.mac || selectedDevice?.addresses?.[0] || 'Unknown'}
                disabled
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Assign to Resident (Optional)</Label>
              <Select value={assignedResident} onValueChange={setAssignedResident}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a resident..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No specific owner</SelectItem>
                  {Array.isArray(residents) && residents.map((resident: any) => (
                    <SelectItem key={resident.id} value={resident.id.toString()}>
                      {resident.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrustDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmTrust}
              disabled={trustDeviceMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {trustDeviceMutation.isPending ? 'Saving...' : 'Trust Device'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
