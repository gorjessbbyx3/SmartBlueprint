import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Lightbulb, Thermometer, Volume2, Power, Settings, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

interface PlatformDevice {
  platformDeviceId: string;
  name: string;
  type: string;
  capabilities: any;
  state: any;
}

interface PlatformIntegration {
  id: number;
  platform: string;
  isActive: boolean;
}

const DEVICE_ICONS = {
  light: Lightbulb,
  thermostat: Thermometer,
  speaker: Volume2,
  switch: Power,
};

export default function DeviceControl() {
  const { toast } = useToast();
  const [selectedDevice, setSelectedDevice] = useState<PlatformDevice | null>(null);

  // Fetch platform integrations
  const { data: integrationsData } = useQuery({
    queryKey: ['/api/platforms/integrations'],
    select: (data: any) => data.integrations || []
  });

  // Fetch devices for all active platforms
  const { data: allDevices = [], refetch: refetchDevices } = useQuery({
    queryKey: ['/api/platforms/all-devices'],
    queryFn: async () => {
      if (!integrationsData) return [];
      
      const devicePromises = integrationsData
        .filter((integration: PlatformIntegration) => integration.isActive)
        .map(async (integration: PlatformIntegration) => {
          const response = await fetch(`/api/platforms/${integration.platform}/devices`);
          const result = await response.json();
          return result.success ? result.devices.map((device: PlatformDevice) => ({
            ...device,
            platform: integration.platform
          })) : [];
        });
      
      const deviceArrays = await Promise.all(devicePromises);
      return deviceArrays.flat();
    },
    enabled: !!integrationsData
  });

  // Device control mutation
  const controlDeviceMutation = useMutation({
    mutationFn: async ({ platform, deviceId, command }: { 
      platform: string; 
      deviceId: string; 
      command: any; 
    }) => {
      const response = await fetch(`/api/platforms/${platform}/devices/${deviceId}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command)
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast({
          title: "Device Controlled",
          description: data.message || "Device updated successfully",
        });
        refetchDevices();
      } else {
        toast({
          title: "Control Failed",
          description: data.error || "Failed to control device",
          variant: "destructive",
        });
      }
    }
  });

  const handleDeviceControl = (device: PlatformDevice, command: any) => {
    controlDeviceMutation.mutate({
      platform: (device as any).platform,
      deviceId: device.platformDeviceId,
      command
    });
  };

  const renderDeviceControls = (device: PlatformDevice) => {
    const DeviceIcon = DEVICE_ICONS[device.type as keyof typeof DEVICE_ICONS] || Settings;
    
    return (
      <Card key={device.platformDeviceId} className="relative">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DeviceIcon className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{device.name}</CardTitle>
            </div>
            <Badge variant={device.state?.on ? "default" : "secondary"}>
              {device.state?.on ? "On" : "Off"}
            </Badge>
          </div>
          <CardDescription>
            {device.type.charAt(0).toUpperCase() + device.type.slice(1)} • Platform: {(device as any).platform}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Power Control */}
          {device.capabilities?.power !== false && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Power</span>
              <Switch
                checked={device.state?.on || false}
                onCheckedChange={(checked) => 
                  handleDeviceControl(device, { on: checked })
                }
                disabled={controlDeviceMutation.isPending}
              />
            </div>
          )}

          {/* Brightness Control */}
          {device.capabilities?.brightness && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Brightness</span>
                <span className="text-sm text-muted-foreground">
                  {device.state?.brightness || 0}%
                </span>
              </div>
              <Slider
                value={[device.state?.brightness || 0]}
                onValueChange={([value]) => 
                  handleDeviceControl(device, { brightness: value })
                }
                max={100}
                step={1}
                className="w-full"
                disabled={controlDeviceMutation.isPending}
              />
            </div>
          )}

          {/* Temperature Control */}
          {device.capabilities?.temperature && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Temperature</span>
                <span className="text-sm text-muted-foreground">
                  {device.state?.temperature || 20}°C
                </span>
              </div>
              <Slider
                value={[device.state?.temperature || 20]}
                onValueChange={([value]) => 
                  handleDeviceControl(device, { temperature: value })
                }
                min={15}
                max={30}
                step={0.5}
                className="w-full"
                disabled={controlDeviceMutation.isPending}
              />
            </div>
          )}

          {/* Volume Control */}
          {device.capabilities?.volume && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Volume</span>
                <span className="text-sm text-muted-foreground">
                  {device.state?.volume || 0}%
                </span>
              </div>
              <Slider
                value={[device.state?.volume || 0]}
                onValueChange={([value]) => 
                  handleDeviceControl(device, { volume: value })
                }
                max={100}
                step={1}
                className="w-full"
                disabled={controlDeviceMutation.isPending}
              />
            </div>
          )}

          {/* Color Control */}
          {device.capabilities?.color && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Color</span>
              <div className="flex space-x-2">
                {['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#ffffff'].map((color) => (
                  <button
                    key={color}
                    className="w-8 h-8 rounded-full border-2 border-gray-300 hover:border-gray-500"
                    style={{ backgroundColor: color }}
                    onClick={() => handleDeviceControl(device, { color })}
                    disabled={controlDeviceMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-4 mb-2">
            <Link href="/">
              <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Dashboard</span>
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Device Control</h1>
          <p className="text-muted-foreground">
            Control your connected smart home devices in real-time
          </p>
        </div>
      </div>

      {allDevices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Settings className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Devices Found</h3>
            <p className="text-muted-foreground text-center mb-4">
              Connect to smart home platforms to control your devices
            </p>
            <Link href="/platform-integrations">
              <Button>Connect Platforms</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allDevices.map(renderDeviceControls)}
        </div>
      )}
    </div>
  );
}