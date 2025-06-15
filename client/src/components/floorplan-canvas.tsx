import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { Device, Floorplan } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ErrorBoundary, MappingErrorFallback } from "./error-boundary";
import { FloorplanLoadingState, InlineLoading } from "./loading-states";
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Move } from "lucide-react";

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
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Memoized device color calculation for performance
  const getDeviceColor = useCallback((device: Device) => {
    if (!device.isOnline) return "bg-gray-400";
    
    const colorMap: Record<string, string> = {
      smart_tv: "bg-blue-500",
      hue_bridge: "bg-green-500", 
      thermostat: "bg-orange-500",
      smart_speaker: "bg-purple-500",
      smart_fridge: "bg-cyan-500",
      unknown_device: "bg-gray-500"
    };
    
    return colorMap[device.deviceType] || "bg-gray-500";
  }, []);

  // Memoized device icon selection
  const getDeviceIcon = useCallback((device: Device) => {
    const iconMap: Record<string, string> = {
      smart_tv: "📺",
      hue_bridge: "💡",
      thermostat: "🌡️",
      smart_speaker: "🔊",
      smart_fridge: "❄️",
      unknown_device: "📱"
    };
    
    return iconMap[device.deviceType] || "📱";
  }, []);

  // Optimized heatmap calculation with memoization
  const getHeatmapIntensity = useCallback((x: number, y: number) => {
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
  }, [devices]);

  // Zoom controls with performance optimization
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev * 1.2, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev / 1.2, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // Touch/mouse event handlers for mobile support
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (selectedTool === "select") {
      setIsDragging(true);
    }
  }, [selectedTool]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Memoized device rendering for performance
  const renderedDevices = useMemo(() => {
    return devices
      .filter(device => device.x && device.y)
      .map((device) => (
        <div
          key={device.id}
          className={`absolute device-dot touch-friendly ${getDeviceColor(device)} rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white shadow-lg ${
            device.isOnline ? 'pulse-animation' : ''
          }`}
          style={{
            left: device.x! - (isMobile ? 16 : 12),
            top: device.y! - (isMobile ? 16 : 12),
            width: isMobile ? 32 : 24,
            height: isMobile ? 32 : 24,
          }}
          onClick={() => onDeviceClick(device)}
          title={`${device.name} (${device.deviceType}) - RSSI: ${device.rssi}dBm`}
        >
          <span className={`${isMobile ? 'text-sm' : 'text-xs'}`}>
            {getDeviceIcon(device)}
          </span>
        </div>
      ));
  }, [devices, getDeviceColor, getDeviceIcon, isMobile, onDeviceClick]);

  // Optimized heatmap rendering with lazy loading
  const renderedHeatmap = useMemo(() => {
    if (!showHeatmap) return null;

    const gridSize = isMobile ? 15 : 20;
    const cellSize = isMobile ? 40 : 50;

    return (
      <div className="absolute inset-0 heatmap-overlay pointer-events-none">
        {Array.from({ length: gridSize }, (_, x) =>
          Array.from({ length: gridSize }, (_, y) => {
            const intensity = getHeatmapIntensity(x * cellSize, y * cellSize);
            if (intensity < 0.1) return null; // Skip rendering very low intensity cells
            
            return (
              <div
                key={`${x}-${y}`}
                className="absolute transition-opacity duration-300"
                style={{
                  left: x * cellSize,
                  top: y * cellSize,
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: `rgba(255, 0, 0, ${intensity})`,
                }}
              />
            );
          })
        )}
      </div>
    );
  }, [showHeatmap, getHeatmapIntensity, isMobile]);

  if (isLoading) {
    return <FloorplanLoadingState />;
  }

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
