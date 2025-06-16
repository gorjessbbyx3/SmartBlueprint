import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Lightbulb, Thermometer, Volume2, Wifi, CheckCircle, AlertCircle, Plus, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface Platform {
  id: string;
  name: string;
  icon: string;
  description?: string;
}

interface PlatformIntegration {
  id: number;
  platform: string;
  isActive: boolean;
  lastSync: string;
  bridgeIp?: string;
}

interface PlatformDevice {
  platformDeviceId: string;
  name: string;
  type: string;
  capabilities: any;
  state: any;
}

const PLATFORM_ICONS = {
  'philips_hue': Lightbulb,
  'nest': Thermometer,
  'alexa': Volume2
};

const PLATFORM_DESCRIPTIONS = {
  'philips_hue': 'Connect your Philips Hue smart lights for intelligent lighting control and energy optimization.',
  'nest': 'Integrate Nest thermostats and sensors for advanced climate monitoring and control.',
  'alexa': 'Connect Alexa-enabled devices for voice control and smart home automation.'
};

export default function PlatformIntegrations() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [credentials, setCredentials] = useState({
    bridgeIp: '',
    clientId: '',
    clientSecret: '',
    authCode: ''
  });
  const { toast } = useToast();

  // Fetch supported platforms
  const { data: platformsData } = useQuery({
    queryKey: ['/api/platforms/supported'],
    select: (data: any) => data.platforms || []
  });

  // Fetch current integrations
  const { data: integrationsData, refetch: refetchIntegrations } = useQuery({
    queryKey: ['/api/platforms/integrations'],
    select: (data: any) => data.integrations || []
  });

  // Platform authentication mutation
  const authenticateMutation = useMutation({
    mutationFn: async ({ platform, credentials }: { platform: string; credentials: any }) => {
      return await apiRequest(`/api/platforms/${platform}/authenticate`, credentials);
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Platform Connected",
          description: `Successfully connected to ${selectedPlatform?.name}`,
        });
        setAuthDialogOpen(false);
        setCredentials({ bridgeIp: '', clientId: '', clientSecret: '', authCode: '' });
        refetchIntegrations();
        queryClient.invalidateQueries({ queryKey: ['/api/platforms'] });
      } else {
        toast({
          title: "Connection Failed",
          description: data.error || "Failed to connect platform",
          variant: "destructive"
        });
      }
    },
    onError: () => {
      toast({
        title: "Connection Error",
        description: "Network error occurred during platform connection",
        variant: "destructive"
      });
    }
  });

  // Device discovery mutation
  const discoverDevicesMutation = useMutation({
    mutationFn: async (platform: string) => {
      const response = await fetch(`/api/platforms/${platform}/devices`);
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Devices Discovered",
          description: `Found ${data.devices?.length || 0} devices`,
        });
      }
    }
  });

  // Platform disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async (platform: string) => {
      const response = await fetch(`/api/platforms/${platform}/disconnect`, {
        method: 'DELETE'
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Platform Disconnected",
        description: "Platform has been disconnected successfully",
      });
      refetchIntegrations();
    }
  });

  const handleConnect = (platform: Platform) => {
    setSelectedPlatform(platform);
    setAuthDialogOpen(true);
  };

  const handleAuthenticate = () => {
    if (!selectedPlatform) return;

    let authCredentials: any = {};
    
    if (selectedPlatform.id === 'philips_hue') {
      authCredentials = { bridgeIp: credentials.bridgeIp };
    } else if (selectedPlatform.id === 'nest' || selectedPlatform.id === 'alexa') {
      authCredentials = {
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        authCode: credentials.authCode
      };
    }

    authenticateMutation.mutate({
      platform: selectedPlatform.id,
      credentials: authCredentials
    });
  };

  const handleDiscoverDevices = (platform: string) => {
    discoverDevicesMutation.mutate(platform);
  };

  const handleDisconnect = (platform: string) => {
    disconnectMutation.mutate(platform);
  };

  const getIntegrationStatus = (platformId: string): PlatformIntegration | undefined => {
    return integrationsData?.find((integration: PlatformIntegration) => 
      integration.platform === platformId
    );
  };

  const renderAuthForm = () => {
    if (!selectedPlatform) return null;

    if (selectedPlatform.id === 'philips_hue') {
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="bridgeIp">Bridge IP Address (optional)</Label>
            <Input
              id="bridgeIp"
              placeholder="192.168.1.100"
              value={credentials.bridgeIp}
              onChange={(e) => setCredentials(prev => ({ ...prev, bridgeIp: e.target.value }))}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Leave empty for automatic discovery. Press the bridge button before connecting.
            </p>
          </div>
        </div>
      );
    }

    if (selectedPlatform.id === 'nest' || selectedPlatform.id === 'alexa') {
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="clientId">Client ID</Label>
            <Input
              id="clientId"
              value={credentials.clientId}
              onChange={(e) => setCredentials(prev => ({ ...prev, clientId: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="clientSecret">Client Secret</Label>
            <Input
              id="clientSecret"
              type="password"
              value={credentials.clientSecret}
              onChange={(e) => setCredentials(prev => ({ ...prev, clientSecret: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="authCode">Authorization Code</Label>
            <Input
              id="authCode"
              value={credentials.authCode}
              onChange={(e) => setCredentials(prev => ({ ...prev, authCode: e.target.value }))}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Get this from the {selectedPlatform.name} developer console
            </p>
          </div>
        </div>
      );
    }

    return null;
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
          <h1 className="text-3xl font-bold">Smart Home Platform Integrations</h1>
          <p className="text-muted-foreground">
            Connect your smart home platforms for unified device management and optimization
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {platformsData?.map((platform: Platform) => {
          const IconComponent = PLATFORM_ICONS[platform.id as keyof typeof PLATFORM_ICONS];
          const integration = getIntegrationStatus(platform.id);
          const isConnected = !!integration?.isActive;

          return (
            <Card key={platform.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {IconComponent && <IconComponent className="h-8 w-8 text-primary" />}
                    <div>
                      <CardTitle className="text-lg">{platform.name}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        {isConnected ? (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Connected
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Not Connected
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <CardDescription>
                  {PLATFORM_DESCRIPTIONS[platform.id as keyof typeof PLATFORM_DESCRIPTIONS]}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {isConnected && integration && (
                    <div className="text-sm text-muted-foreground space-y-1">
                      {integration.bridgeIp && (
                        <div className="flex items-center space-x-2">
                          <Wifi className="h-4 w-4" />
                          <span>Bridge IP: {integration.bridgeIp}</span>
                        </div>
                      )}
                      <div>Last sync: {new Date(integration.lastSync).toLocaleString()}</div>
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    {isConnected ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDiscoverDevices(platform.id)}
                          disabled={discoverDevicesMutation.isPending}
                        >
                          {discoverDevicesMutation.isPending ? 'Discovering...' : 'Discover Devices'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDisconnect(platform.id)}
                          disabled={disconnectMutation.isPending}
                        >
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleConnect(platform)}
                        disabled={authenticateMutation.isPending}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Connect Platform
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Authentication Dialog */}
      <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect {selectedPlatform?.name}</DialogTitle>
            <DialogDescription>
              Enter your credentials to connect this platform to SmartBlueprint Pro
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {renderAuthForm()}
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setAuthDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAuthenticate}
              disabled={authenticateMutation.isPending}
            >
              {authenticateMutation.isPending ? 'Connecting...' : 'Connect'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Connected Platforms Summary */}
      {integrationsData && integrationsData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Connected Platforms</CardTitle>
            <CardDescription>
              Manage your connected smart home platforms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {integrationsData.map((integration: PlatformIntegration) => (
                <div key={integration.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`h-3 w-3 rounded-full ${integration.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <div className="font-medium capitalize">
                        {integration.platform.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Last sync: {new Date(integration.lastSync).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDiscoverDevices(integration.platform)}
                  >
                    Sync Devices
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}