import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Home, Plus, Trash2, Edit, Zap, MapPin } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Room {
  id: number;
  name: string;
  floorplanId: number;
  boundaries: string;
  roomType: string;
  detectedAutomatically: boolean;
  createdAt: string;
}

interface RoomManagementPanelProps {
  floorplanId: number;
  onClose: () => void;
  onRoomUpdate: () => void;
}

export default function RoomManagementPanel({ 
  floorplanId, 
  onClose, 
  onRoomUpdate 
}: RoomManagementPanelProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [newRoom, setNewRoom] = useState({
    name: "",
    roomType: "living_room",
    boundaries: ""
  });

  const roomTypes = [
    { value: "living_room", label: "Living Room" },
    { value: "bedroom", label: "Bedroom" },
    { value: "kitchen", label: "Kitchen" },
    { value: "bathroom", label: "Bathroom" },
    { value: "office", label: "Office" },
    { value: "dining_room", label: "Dining Room" },
    { value: "utility_room", label: "Utility Room" },
    { value: "garage", label: "Garage" }
  ];

  useEffect(() => {
    loadRooms();
  }, [floorplanId]);

  const loadRooms = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest(`/api/rooms?floorplanId=${floorplanId}`);
      setRooms(data);
    } catch (error) {
      console.error("Failed to load rooms:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const autoDetectRooms = async () => {
    setIsAutoDetecting(true);
    try {
      const result = await apiRequest("/api/rooms/auto-detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ floorplanId })
      });
      
      await loadRooms();
      onRoomUpdate();
      console.log("Auto-detected rooms:", result.message);
    } catch (error) {
      console.error("Auto-detection failed:", error);
    } finally {
      setIsAutoDetecting(false);
    }
  };

  const createRoom = async () => {
    if (!newRoom.name.trim()) return;

    try {
      await apiRequest("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newRoom,
          floorplanId,
          boundaries: newRoom.boundaries || JSON.stringify([
            { x: 100, y: 100 },
            { x: 200, y: 100 },
            { x: 200, y: 200 },
            { x: 100, y: 200 }
          ])
        })
      });

      setNewRoom({ name: "", roomType: "living_room", boundaries: "" });
      await loadRooms();
      onRoomUpdate();
    } catch (error) {
      console.error("Failed to create room:", error);
    }
  };

  const updateRoom = async (room: Room) => {
    try {
      await apiRequest(`/api/rooms/${room.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: room.name,
          roomType: room.roomType,
          boundaries: room.boundaries
        })
      });

      await loadRooms();
      onRoomUpdate();
      setEditingRoom(null);
    } catch (error) {
      console.error("Failed to update room:", error);
    }
  };

  const deleteRoom = async (roomId: number) => {
    try {
      await apiRequest(`/api/rooms/${roomId}`, {
        method: "DELETE"
      });

      await loadRooms();
      onRoomUpdate();
    } catch (error) {
      console.error("Failed to delete room:", error);
    }
  };

  const getRoomTypeLabel = (type: string) => {
    return roomTypes.find(rt => rt.value === type)?.label || type;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Home className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold">Room Management</h2>
            </div>
            <Button variant="ghost" onClick={onClose}>×</Button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            {/* Auto-Detection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Smart Room Detection
                </CardTitle>
                <CardDescription>
                  Use ML algorithms to automatically detect rooms based on device placement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={autoDetectRooms} 
                  disabled={isAutoDetecting}
                  className="flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  {isAutoDetecting ? "Detecting Rooms..." : "Auto-Detect Rooms"}
                </Button>
              </CardContent>
            </Card>

            {/* Create New Room */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add New Room
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="roomName">Room Name</Label>
                    <Input
                      id="roomName"
                      value={newRoom.name}
                      onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                      placeholder="Enter room name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="roomType">Room Type</Label>
                    <Select 
                      value={newRoom.roomType} 
                      onValueChange={(value) => setNewRoom({ ...newRoom, roomType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select room type" />
                      </SelectTrigger>
                      <SelectContent>
                        {roomTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={createRoom} disabled={!newRoom.name.trim()}>
                  Create Room
                </Button>
              </CardContent>
            </Card>

            {/* Existing Rooms */}
            <Card>
              <CardHeader>
                <CardTitle>Existing Rooms ({rooms.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-4">Loading rooms...</div>
                ) : rooms.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Home className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No rooms defined yet</p>
                    <p className="text-sm">Create rooms manually or use auto-detection</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rooms.map((room) => (
                      <div key={room.id} className="flex items-center justify-between p-3 border rounded-lg">
                        {editingRoom?.id === room.id ? (
                          <div className="flex-1 grid grid-cols-2 gap-2 mr-4">
                            <Input
                              value={editingRoom.name}
                              onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                            />
                            <Select 
                              value={editingRoom.roomType} 
                              onValueChange={(value) => setEditingRoom({ ...editingRoom, roomType: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {roomTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center gap-3">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{room.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {getRoomTypeLabel(room.roomType)}
                                {room.detectedAutomatically && (
                                  <Badge variant="secondary" className="ml-2 text-xs">
                                    Auto-detected
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          {editingRoom?.id === room.id ? (
                            <>
                              <Button 
                                size="sm" 
                                onClick={() => updateRoom(editingRoom)}
                              >
                                Save
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => setEditingRoom(null)}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => setEditingRoom(room)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => deleteRoom(room.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}