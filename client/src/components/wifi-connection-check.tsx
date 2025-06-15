import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WifiOff, Wifi, AlertTriangle, Play, CheckCircle } from "lucide-react";

interface WiFiConnectionCheckProps {
  onStartMapping: () => void;
  devices: any[];
}

export default function WiFiConnectionCheck({ onStartMapping, devices }: WiFiConnectionCheckProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [networkInfo, setNetworkInfo] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Check WiFi connection status
  const checkWiFiConnection = async () => {
    setIsChecking(true);
    try {
      // Check if we have network connectivity
      const online = navigator.onLine;
      
      // Check if we have detected any network devices (gateway)
      const hasGateway = devices.some(device => 
        device.macAddress?.includes('02:00:31:128') || 
        device.name?.toLowerCase().includes('gateway') ||
        device.name?.toLowerCase().includes('router')
      );

      // Simple network info detection
      const connectionType = (navigator as any).connection?.effectiveType || 'unknown';
      
      setIsConnected(online && hasGateway);
      setNetworkInfo({
        online,
        hasGateway,
        connectionType,
        deviceCount: devices.length
      });

      // Show popup if no WiFi detected
      if (!online || !hasGateway) {
        setShowDialog(true);
      }
    } catch (error) {
      console.error('WiFi check failed:', error);
      setIsConnected(false);
      setShowDialog(true);
    } finally {
      setIsChecking(false);
    }
  };

  // Monitor network changes
  useEffect(() => {
    const handleOnline = () => checkWiFiConnection();
    const handleOffline = () => {
      setIsConnected(false);
      setShowDialog(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [devices]);

  // Initial check when component mounts or devices change
  useEffect(() => {
    if (devices.length > 0) {
      checkWiFiConnection();
    }
  }, [devices]);

  const handleStartMapping = () => {
    if (isConnected) {
      onStartMapping();
    } else {
      checkWiFiConnection();
    }
  };

  const handleRetryConnection = () => {
    setShowDialog(false);
    checkWiFiConnection();
  };

  const handleContinueOffline = () => {
    setShowDialog(false);
    onStartMapping();
  };

  return (
    <>
      {/* Start Mapping Button */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Network Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Connection Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isConnected === null ? (
                  <Badge variant="outline">Checking...</Badge>
                ) : isConnected ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <Badge variant="default" className="bg-green-600">WiFi Connected</Badge>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-red-600" />
                    <Badge variant="destructive">No WiFi Detected</Badge>
                  </>
                )}
              </div>
              
              {networkInfo && (
                <div className="text-sm text-gray-500">
                  {networkInfo.deviceCount} device{networkInfo.deviceCount !== 1 ? 's' : ''} found
                </div>
              )}
            </div>

            {/* Network Details */}
            {networkInfo && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Online:</span>
                  <Badge variant={networkInfo.online ? "default" : "destructive"}>
                    {networkInfo.online ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Gateway:</span>
                  <Badge variant={networkInfo.hasGateway ? "default" : "destructive"}>
                    {networkInfo.hasGateway ? "Detected" : "Not Found"}
                  </Badge>
                </div>
              </div>
            )}

            {/* Start Button */}
            <Button 
              onClick={handleStartMapping}
              disabled={isChecking}
              className="w-full"
              size="lg"
            >
              <Play className="h-4 w-4 mr-2" />
              {isChecking ? "Checking Connection..." : "Start Smart Home Mapping"}
            </Button>

            {!isConnected && !isChecking && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Limited WiFi connectivity detected. Some features may not work properly.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* WiFi Not Detected Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <WifiOff className="h-5 w-5 text-red-600" />
              WiFi Not Detected
            </DialogTitle>
            <DialogDescription>
              SmartBlueprint Pro requires an active WiFi connection to scan and map your smart home devices.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Connection Issues Detected:</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  {!networkInfo?.online && <li>• No internet connection</li>}
                  {!networkInfo?.hasGateway && <li>• Network gateway not found</li>}
                  {networkInfo?.deviceCount === 0 && <li>• No network devices detected</li>}
                </ul>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h4 className="font-medium">Please check:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• WiFi is enabled on your device</li>
                <li>• You're connected to your home network</li>
                <li>• Your router is powered on and working</li>
                <li>• Network permissions are allowed</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleRetryConnection} className="flex-1">
                <Wifi className="h-4 w-4 mr-2" />
                Retry Connection
              </Button>
              <Button variant="outline" onClick={handleContinueOffline} className="flex-1">
                Continue Offline
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}