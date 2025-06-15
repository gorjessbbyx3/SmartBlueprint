import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Device } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DeviceDetailsModalProps {
  device: Device;
  onClose: () => void;
  onUpdate: () => void;
}

export default function DeviceDetailsModal({
  device,
  onClose,
  onUpdate,
}: DeviceDetailsModalProps) {
  const [formData, setFormData] = useState({
    name: device.name,
    protocol: device.protocol,
    x: device.x || 0,
    y: device.y || 0,
  });
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/devices/${device.id}`, data),
    onSuccess: () => {
      toast({
        title: "Device updated",
        description: "Device configuration has been saved",
      });
      onUpdate();
      onClose();
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update device configuration",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Device Details</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Device Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rssi">RSSI</Label>
              <Input
                id="rssi"
                value={`${device.rssi} dBm`}
                readOnly
                className="mt-1 bg-gray-50"
              />
            </div>
            <div>
              <Label htmlFor="protocol">Protocol</Label>
              <Select value={formData.protocol} onValueChange={(value) => handleInputChange("protocol", value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wifi">Wi-Fi</SelectItem>
                  <SelectItem value="zigbee">Zigbee</SelectItem>
                  <SelectItem value="bluetooth">Bluetooth LE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="x">X Position</Label>
              <Input
                id="x"
                type="number"
                value={formData.x}
                onChange={(e) => handleInputChange("x", parseFloat(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="y">Y Position</Label>
              <Input
                id="y"
                type="number"
                value={formData.y}
                onChange={(e) => handleInputChange("y", parseFloat(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="mac">MAC Address</Label>
            <Input
              id="mac"
              value={device.macAddress}
              readOnly
              className="mt-1 bg-gray-50"
            />
          </div>

          {device.telemetryData && (
            <div>
              <Label>Telemetry Data</Label>
              <div className="mt-1 p-2 bg-gray-50 rounded text-sm">
                <pre>{JSON.stringify(device.telemetryData, null, 2)}</pre>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
