import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { 
  MapPin, 
  Smartphone,
  Speaker,
  Lightbulb,
  Thermometer,
  Camera,
  Gamepad2,
  Tv,
  Home,
  Router,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Device } from '@shared/schema';

interface Room {
  id: number;
  name: string;
  type: string;
  deviceCount?: number;
}

interface DeviceRoomAssignmentProps {
  isOpen: boolean;
  onClose: () => void;
  devices: Device[];
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

const roomTypes = {
  living_room: 'Living Room',
  bedroom: 'Bedroom',
  kitchen: 'Kitchen',
  bathroom: 'Bathroom',
  office: 'Office',
  hallway: 'Hallway',
  dining_room: 'Dining Room',
  garage: 'Garage',
  basement: 'Basement',
  attic: 'Attic'
};

export function DeviceRoomAssignment({ isOpen, onClose, devices }: DeviceRoomAssignmentProps) {
  const [assignments, setAssignments] = useState<{ [deviceId: number]: number }>({});
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomType, setNewRoomType] = useState('');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get available rooms
  const { data: rooms = [] } = useQuery({
    queryKey: ['/api/rooms'],
    queryFn: async () => {
      const response = await fetch('/api/rooms');
      if (!response.ok) throw new Error('Failed to fetch rooms');
      return response.json();
    }
  });

  // Create new room mutation
  const createRoomMutation = useMutation({
    mutationFn: async (roomData: { name: string; type: string }) => {
      return apiRequest('/api/rooms', {
        method: 'POST',
        body: JSON.stringify(roomData),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      setNewRoomName('');
      setNewRoomType('');
      toast({
        title: "Room Created",
        description: "New room added successfully"
      });
    }
  });

  // Assign devices to rooms mutation
  const assignDevicesMutation = useMutation({
    mutationFn: async (deviceAssignments: { deviceId: number; roomId: number }[]) => {
      const promises = deviceAssignments.map(assignment => 
        apiRequest(`/api/devices/${assignment.deviceId}`, {
          method: 'PATCH',
          body: JSON.stringify({ roomId: assignment.roomId }),
          headers: { 'Content-Type': 'application/json' }
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      toast({
        title: "Devices Assigned",
        description: `Successfully assigned ${Object.keys(assignments).length} devices to rooms`
      });
      onClose();
    }
  });

  const handleRoomAssignment = (deviceId: number, roomId: number) => {
    setAssignments(prev => ({
      ...prev,
      [deviceId]: roomId
    }));
  };

  const handleCreateRoom = () => {
    if (newRoomName && newRoomType) {
      createRoomMutation.mutate({
        name: newRoomName,
        type: newRoomType
      });
    }
  };

  const handleSaveAssignments = () => {
    const deviceAssignments = Object.entries(assignments).map(([deviceId, roomId]) => ({
      deviceId: parseInt(deviceId),
      roomId
    }));

    if (deviceAssignments.length > 0) {
      assignDevicesMutation.mutate(deviceAssignments);
    } else {
      toast({
        title: "No Assignments",
        description: "Please assign at least one device to a room",
        variant: "destructive"
      });
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    const IconComponent = deviceIcons[deviceType as keyof typeof deviceIcons] || Smartphone;
    return <IconComponent className="h-4 w-4" />;
  };

  const getRoomName = (roomId: number) => {
    const room = rooms.find((r: Room) => r.id === roomId);
    return room ? room.name : 'Unknown Room';
  };

  const unassignedDevices = devices.filter(device => !device.roomId);
  const assignedDevicesCount = Object.keys(assignments).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Assign Devices to Rooms
          </DialogTitle>
          <DialogDescription>
            Organize your smart devices by assigning them to specific rooms for better management and control
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Devices List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Discovered Devices</h3>
              <Badge variant="secondary">
                {unassignedDevices.length} unassigned
              </Badge>
            </div>

            <ScrollArea className="h-96">
              <div className="space-y-3">
                {unassignedDevices.map((device) => (
                  <Card key={device.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                          {getDeviceIcon(device.deviceType)}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{device.name}</div>
                          <div className="text-xs text-gray-500">
                            {device.deviceType.replace('_', ' ')} • {device.macAddress.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {assignments[device.id] && (
                          <Badge variant="outline" className="text-xs">
                            <ArrowRight className="h-3 w-3 mr-1" />
                            {getRoomName(assignments[device.id])}
                          </Badge>
                        )}
                        
                        <Select
                          value={assignments[device.id]?.toString() || ''}
                          onValueChange={(value) => handleRoomAssignment(device.id, parseInt(value))}
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue placeholder="Select room" />
                          </SelectTrigger>
                          <SelectContent>
                            {rooms.map((room: Room) => (
                              <SelectItem key={room.id} value={room.id.toString()}>
                                {room.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>
                ))}

                {unassignedDevices.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                    <div className="text-sm">All devices are assigned to rooms</div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Rooms Management */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Available Rooms</h3>
            
            {/* Create New Room */}
            <Card className="p-3 border-dashed">
              <div className="space-y-3">
                <Label htmlFor="room-name" className="text-xs">Create New Room</Label>
                <input
                  id="room-name"
                  placeholder="Room name"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full px-2 py-1 text-xs border rounded"
                />
                <Select value={newRoomType} onValueChange={setNewRoomType}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Room type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(roomTypes).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  size="sm" 
                  onClick={handleCreateRoom}
                  disabled={!newRoomName || !newRoomType || createRoomMutation.isPending}
                  className="w-full h-6 text-xs"
                >
                  {createRoomMutation.isPending ? 'Creating...' : 'Create Room'}
                </Button>
              </div>
            </Card>

            <Separator />

            {/* Existing Rooms */}
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {rooms.map((room: Room) => (
                  <Card key={room.id} className="p-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-medium">{room.name}</div>
                        <div className="text-xs text-gray-500">
                          {roomTypes[room.type as keyof typeof roomTypes] || room.type}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {Object.values(assignments).filter(roomId => roomId === room.id).length} devices
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {assignedDevicesCount} of {unassignedDevices.length} devices assigned
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveAssignments}
              disabled={assignedDevicesCount === 0 || assignDevicesMutation.isPending}
            >
              {assignDevicesMutation.isPending ? 'Saving...' : `Save Assignments (${assignedDevicesCount})`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}