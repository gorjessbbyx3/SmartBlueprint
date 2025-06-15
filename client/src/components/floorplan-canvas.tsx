import { useRef, useEffect, useState } from "react";
import { Device, Floorplan } from "@shared/schema";
import { Button } from "@/components/ui/button";

interface FloorplanCanvasProps {
  devices: Device[];
  floorplan?: Floorplan;
  onDeviceClick: (device: Device) => void;
  showHeatmap: boolean;
}

export default function FloorplanCanvas({
  devices,
  floorplan,
  onDeviceClick,
  showHeatmap,
}: FloorplanCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedTool, setSelectedTool] = useState<"select" | "draw" | "room" | "measure">("select");
  const [zoom, setZoom] = useState(1);

  const getDeviceColor = (device: Device) => {
    if (!device.isOnline) return "bg-gray-400";
    
    switch (device.deviceType) {
      case "smart_tv":
        return "bg-blue-500";
      case "hue_bridge":
        return "bg-green-500";
      case "thermostat":
        return "bg-orange-500";
      case "smart_speaker":
        return "bg-purple-500";
      case "smart_fridge":
        return "bg-cyan-500";
      default:
        return "bg-gray-500";
    }
  };

  const getHeatmapIntensity = (x: number, y: number) => {
    let maxSignal = -100;
    
    devices.forEach(device => {
      if (device.x && device.y && device.isOnline) {
        const distance = Math.sqrt(Math.pow(x - device.x, 2) + Math.pow(y - device.y, 2));
        const estimatedRSSI = device.rssi - (distance * 0.1);
        maxSignal = Math.max(maxSignal, estimatedRSSI);
      }
    });
    
    if (maxSignal < -80) return 0;
    if (maxSignal > -40) return 0.6;
    
    return ((maxSignal + 80) / 40) * 0.6;
  };

  const renderHeatmap = () => {
    if (!showHeatmap) return null;
    
    const heatmapPoints = [];
    for (let x = 0; x < 800; x += 40) {
      for (let y = 0; y < 600; y += 40) {
        const intensity = getHeatmapIntensity(x, y);
        if (intensity > 0.1) {
          heatmapPoints.push(
            <div
              key={`${x}-${y}`}
              className="absolute rounded-full pointer-events-none"
              style={{
                left: x - 20,
                top: y - 20,
                width: 40,
                height: 40,
                backgroundColor: intensity > 0.4 ? '#10b981' : intensity > 0.25 ? '#f59e0b' : '#ef4444',
                opacity: intensity * 0.4,
              }}
            />
          );
        }
      }
    }
    
    return (
      <div className="absolute inset-0 pointer-events-none">
        {heatmapPoints}
      </div>
    );
  };

  return (
    <div className="relative w-full h-full">
      {/* Canvas Container */}
      <div
        ref={canvasRef}
        className="w-full h-full bg-white relative overflow-hidden"
        style={{
          backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
        }}
      >
        {/* Floorplan SVG */}
        {floorplan && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 600">
            {/* Room boundaries */}
            {floorplan.data?.rooms?.map((room: any, index: number) => (
              <g key={index}>
                <rect
                  x={room.x}
                  y={room.y}
                  width={room.width}
                  height={room.height}
                  fill="none"
                  stroke="#9CA3AF"
                  strokeWidth="3"
                />
                <text
                  x={room.x + room.width / 2}
                  y={room.y + room.height / 2}
                  textAnchor="middle"
                  className="text-sm fill-gray-500"
                  fontFamily="Inter"
                >
                  {room.name}
                </text>
              </g>
            ))}
            
            {/* Doors */}
            {floorplan.data?.doors?.map((door: any, index: number) => (
              <line
                key={index}
                x1={door.x1}
                y1={door.y1}
                x2={door.x2}
                y2={door.y2}
                stroke="#6B7280"
                strokeWidth="4"
              />
            ))}
            
            {/* Windows */}
            {floorplan.data?.windows?.map((window: any, index: number) => (
              <line
                key={index}
                x1={window.x1}
                y1={window.y1}
                x2={window.x2}
                y2={window.y2}
                stroke="#3B82F6"
                strokeWidth="3"
              />
            ))}
          </svg>
        )}

        {/* Heatmap Overlay */}
        {renderHeatmap()}

        {/* Device Markers */}
        {devices.map((device) => {
          if (!device.x || !device.y) return null;
          
          return (
            <div
              key={device.id}
              className="absolute cursor-pointer transform -translate-x-2 -translate-y-2 transition-transform hover:scale-125"
              style={{ left: device.x, top: device.y }}
              onClick={() => onDeviceClick(device)}
            >
              <div className={`w-4 h-4 ${getDeviceColor(device)} rounded-full border-2 border-white shadow-lg`}>
                {!device.isOnline && (
                  <div className="absolute inset-0 bg-gray-600 rounded-full opacity-50"></div>
                )}
              </div>
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity z-10">
                {device.name} ({device.rssi}dBm)
              </div>
            </div>
          );
        })}

        {/* Recommended Placement */}
        <div
          className="absolute cursor-pointer transform -translate-x-2 -translate-y-2 animate-pulse"
          style={{ left: 320, top: 340 }}
        >
          <div className="w-4 h-4 bg-purple-500 rounded-full border-2 border-white shadow-lg"></div>
          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
            <i className="fas fa-lightbulb mr-1"></i>
            Recommended: Wi-Fi Extender
          </div>
        </div>
      </div>

      {/* Tools Overlay */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg border border-gray-200 p-2">
        <div className="flex space-x-2">
          <Button
            variant={selectedTool === "select" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedTool("select")}
            className="p-2"
          >
            <i className="fas fa-mouse-pointer"></i>
          </Button>
          <Button
            variant={selectedTool === "draw" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedTool("draw")}
            className="p-2"
          >
            <i className="fas fa-pencil-alt"></i>
          </Button>
          <Button
            variant={selectedTool === "room" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedTool("room")}
            className="p-2"
          >
            <i className="fas fa-square"></i>
          </Button>
          <Button
            variant={selectedTool === "measure" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedTool("measure")}
            className="p-2"
          >
            <i className="fas fa-ruler"></i>
          </Button>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-2">
        <div className="flex flex-col space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(Math.min(2, zoom + 0.1))}
            className="p-2"
          >
            <i className="fas fa-plus"></i>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
            className="p-2"
          >
            <i className="fas fa-minus"></i>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(1)}
            className="p-2"
          >
            <i className="fas fa-expand"></i>
          </Button>
        </div>
      </div>
    </div>
  );
}
