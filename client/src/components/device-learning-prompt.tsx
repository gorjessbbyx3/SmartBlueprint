import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Smartphone,
  Users,
  HelpCircle,
  Check,
  X,
  Wifi,
  Brain,
  Home,
  UserPlus
} from "lucide-react";

interface UnidentifiedDevice {
  id: string;
  macAddress: string;
  name: string;
  deviceType: string;
  firstSeen: string;
  lastSeen: string;
  seenCount: number;
  signalStrength?: number;
  manufacturer?: string;
  isPromptPending: boolean;
  suggestedResident?: number;
  confidence?: number;
}

interface Resident {
  id: number;
  name: string;
  email?: string;
  role?: string;
}

interface ResidentPresence {
  residentId: number;
  residentName: string;
  isHome: boolean;
  deviceName?: string;
  lastSeen?: string;
  arrivedAt?: string;
}

export function DeviceLearningPrompt() {
  const queryClient = useQueryClient();
  const [selectedDevice, setSelectedDevice] = useState<UnidentifiedDevice | null>(null);
  const [selectedResident, setSelectedResident] = useState<string>("");
  const [customName, setCustomName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch home status
  const { data: homeStatus } = useQuery({
    queryKey: ["/api/learning/home-status"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch unidentified devices
  const { data: unidentifiedData } = useQuery({
    queryKey: ["/api/learning/unidentified"],
    refetchInterval: 15000,
  });

  // Fetch residents for selection
  const { data: residentsData } = useQuery({
    queryKey: ["/api/security/residents"],
  });

  // Mutation to identify device
  const identifyMutation = useMutation({
    mutationFn: async (data: { macAddress: string; residentId: number; customName?: string }) => {
      const response = await apiRequest("/api/learning/identify", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learning/unidentified"] });
      queryClient.invalidateQueries({ queryKey: ["/api/learning/home-status"] });
      setIsDialogOpen(false);
      setSelectedDevice(null);
      setSelectedResident("");
      setCustomName("");
    },
  });

  // Mutation to mark as non-resident
  const markNonResidentMutation = useMutation({
    mutationFn: async (data: { macAddress: string; category: string }) => {
      const response = await apiRequest("/api/learning/mark-non-resident", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learning/unidentified"] });
      setIsDialogOpen(false);
      setSelectedDevice(null);
    },
  });

  const pendingDevices: UnidentifiedDevice[] = unidentifiedData?.pendingPrompts || [];
  const residents: Resident[] = residentsData?.residents || [];
  const residentsAtHome: ResidentPresence[] = homeStatus?.residentsAtHome || [];
  const humanCount: number = homeStatus?.humanCount || 0;

  const handleIdentifyClick = (device: UnidentifiedDevice) => {
    setSelectedDevice(device);
    if (device.suggestedResident) {
      setSelectedResident(device.suggestedResident.toString());
    }
    setIsDialogOpen(true);
  };

  const handleConfirmIdentify = () => {
    if (!selectedDevice || !selectedResident) return;

    identifyMutation.mutate({
      macAddress: selectedDevice.macAddress,
      residentId: parseInt(selectedResident),
      customName: customName || undefined,
    });
  };

  const handleMarkNonResident = (category: string) => {
    if (!selectedDevice) return;

    markNonResidentMutation.mutate({
      macAddress: selectedDevice.macAddress,
      category,
    });
  };

  // Only show if there are pending prompts
  if (pendingDevices.length === 0 && humanCount === 0) {
    return null;
  }

  return (
    <>
      {/* Human Count Card */}
      <Card className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Home className="h-5 w-5 text-blue-600" />
            Home Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl font-bold text-blue-600">{humanCount}</div>
              <div className="text-sm text-gray-600">
                {humanCount === 1 ? "person" : "people"} at home
              </div>
            </div>
            <Users className="h-10 w-10 text-blue-400" />
          </div>

          {residentsAtHome.length > 0 && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="text-xs text-gray-500 mb-2">Currently home:</div>
              <div className="flex flex-wrap gap-2">
                {residentsAtHome.map((resident) => (
                  <Badge
                    key={resident.residentId}
                    variant="secondary"
                    className="bg-green-100 text-green-700"
                  >
                    {resident.residentName}
                    {resident.deviceName && (
                      <span className="text-xs ml-1 opacity-75">
                        ({resident.deviceName})
                      </span>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Device Identification Prompts */}
      {pendingDevices.length > 0 && (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-amber-600" />
              New Devices Detected
              <Badge variant="secondary" className="ml-2 bg-amber-200 text-amber-800">
                {pendingDevices.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              Help me learn who these devices belong to:
            </p>

            <div className="space-y-3">
              {pendingDevices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200"
                >
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-8 w-8 text-gray-400" />
                    <div>
                      <div className="font-medium">{device.name}</div>
                      <div className="text-xs text-gray-500">
                        {device.deviceType} | Seen {device.seenCount}x
                        {device.manufacturer && ` | ${device.manufacturer}`}
                      </div>
                      {device.suggestedResident && device.confidence && (
                        <div className="text-xs text-amber-600 mt-1">
                          AI suggests: {residents.find(r => r.id === device.suggestedResident)?.name}
                          ({Math.round(device.confidence * 100)}% confident)
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleIdentifyClick(device)}
                  >
                    <HelpCircle className="h-4 w-4 mr-1" />
                    Identify
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Identification Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Identify Device
            </DialogTitle>
            <DialogDescription>
              Who owns this device? This helps me track who's home.
            </DialogDescription>
          </DialogHeader>

          {selectedDevice && (
            <div className="space-y-4 py-4">
              {/* Device Info */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium">{selectedDevice.name}</div>
                <div className="text-sm text-gray-500">
                  {selectedDevice.deviceType}
                  {selectedDevice.manufacturer && ` by ${selectedDevice.manufacturer}`}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  MAC: {selectedDevice.macAddress}
                </div>
              </div>

              {/* Resident Selection */}
              <div className="space-y-2">
                <Label>This device belongs to:</Label>
                <Select
                  value={selectedResident}
                  onValueChange={setSelectedResident}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a resident" />
                  </SelectTrigger>
                  <SelectContent>
                    {residents.map((resident) => (
                      <SelectItem key={resident.id} value={resident.id.toString()}>
                        {resident.name}
                        {selectedDevice.suggestedResident === resident.id && (
                          <span className="ml-2 text-amber-600">(suggested)</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Name */}
              <div className="space-y-2">
                <Label>Device name (optional)</Label>
                <Input
                  placeholder={`e.g., ${residents.find(r => r.id.toString() === selectedResident)?.name || "Jane"}'s iPhone`}
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
              </div>

              {/* Non-resident options */}
              <div className="pt-2 border-t">
                <Label className="text-sm text-gray-500">Or mark as:</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMarkNonResident("visitor")}
                    disabled={markNonResidentMutation.isPending}
                  >
                    Visitor
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMarkNonResident("iot")}
                    disabled={markNonResidentMutation.isPending}
                  >
                    IoT Device
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMarkNonResident("ignore")}
                    disabled={markNonResidentMutation.isPending}
                  >
                    Ignore
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button
              onClick={handleConfirmIdentify}
              disabled={!selectedResident || identifyMutation.isPending}
            >
              <Check className="h-4 w-4 mr-1" />
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default DeviceLearningPrompt;
