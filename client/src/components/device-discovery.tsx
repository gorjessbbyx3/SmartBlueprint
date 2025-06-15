import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function DeviceDiscovery() {
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<any[]>([]);
  const { toast } = useToast();

  const scanMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/devices/scan"),
    onMutate: () => {
      setIsScanning(true);
      setDiscoveredDevices([]);
    },
    onSuccess: async (response) => {
      const data = await response.json();
      setDiscoveredDevices(data.devices || []);
      toast({
        title: "Device scan completed",
        description: `Found ${data.devices?.length || 0} new devices`,
      });
    },
    onError: (error) => {
      toast({
        title: "Scan failed",
        description: "Failed to scan for devices",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsScanning(false);
    },
  });

  const handleScan = () => {
    scanMutation.mutate();
  };

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
          <i className="fas fa-satellite-dish mr-2 text-primary"></i>
          Device Discovery
        </h3>
        <div className="space-y-3">
          <Button
            className="w-full bg-green-600 hover:bg-green-700"
            onClick={handleScan}
            disabled={isScanning}
          >
            <i className={`fas ${isScanning ? 'fa-spinner fa-spin' : 'fa-search'} mr-2`}></i>
            {isScanning ? "Scanning..." : "Scan Network"}
          </Button>
          
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Protocols:</span>
            <div className="flex space-x-1">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">Wi-Fi</Badge>
              <Badge variant="secondary" className="bg-green-100 text-green-800">Zigbee</Badge>
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">BLE</Badge>
            </div>
          </div>
          
          <div className="text-xs text-gray-500">
            <div className="flex items-center justify-between">
              <span>New Devices Found:</span>
              <span className="font-semibold text-gray-900">{discoveredDevices.length}</span>
            </div>
          </div>

          {discoveredDevices.length > 0 && (
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {discoveredDevices.map((device, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200">
                  <div>
                    <p className="text-xs font-medium text-gray-900">{device.name}</p>
                    <p className="text-xs text-gray-500">{device.macAddress}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-gray-900">{device.rssi} dBm</p>
                    <Badge variant="outline" className="text-xs">New</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
