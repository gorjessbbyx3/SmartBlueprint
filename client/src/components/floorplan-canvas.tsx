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
    <ErrorBoundary fallback={MappingErrorFallback}>
      <div className="canvas-responsive canvas-container swipe-area">
        {/* Mobile-optimized toolbar */}
        <div className={`absolute top-4 left-4 z-10 bg-white rounded-lg shadow-md p-2 flex ${isMobile ? 'flex-col space-y-1' : 'items-center space-x-2'}`}>
          <Button
            variant={selectedTool === "select" ? "default" : "outline"}
            size={isMobile ? "sm" : "sm"}
            onClick={() => setSelectedTool("select")}
            className="touch-friendly"
          >
            <Move className="w-4 h-4" />
          </Button>
          {!isMobile && (
            <>
              <Button
                variant={selectedTool === "draw" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTool("draw")}
              >
                ✏️
              </Button>
              <Button
                variant={selectedTool === "room" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTool("room")}
              >
                🏠
              </Button>
              <Button
                variant={selectedTool === "measure" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTool("measure")}
              >
                📏
              </Button>
            </>
          )}
        </div>

        {/* Enhanced zoom controls */}
        <div className={`absolute top-4 right-4 z-10 bg-white rounded-lg shadow-md p-2 flex ${isMobile ? 'flex-col space-y-1' : 'flex-col space-y-2'}`}>
          <Button size="sm" onClick={handleZoomIn} className="touch-friendly">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={handleZoomOut} className="touch-friendly">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={handleResetZoom} className="touch-friendly">
            <RotateCcw className="w-4 h-4" />
          </Button>
          {!isMobile && (
            <Button size="sm" onClick={() => setZoom(1.5)} className="touch-friendly">
              <Maximize2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Performance status indicator */}
        {isLoading && (
          <div className="absolute bottom-4 left-4 z-10 bg-white rounded-lg shadow-md p-2 flex items-center gap-2">
            <InlineLoading size="sm" />
            <span className="text-xs text-gray-600">Processing...</span>
          </div>
        )}

        {/* Optimized floorplan container */}
        <div 
          ref={canvasRef}
          className="w-full h-full relative overflow-hidden grid-pattern"
          style={{ 
            transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`,
            transformOrigin: 'top left',
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        >
          {/* Heatmap Layer with lazy loading */}
          {renderedHeatmap}

          {/* Optimized device rendering */}
          {renderedDevices}

          {/* Device count indicator for mobile */}
          {isMobile && (
            <div className="absolute bottom-4 right-4 bg-black/70 text-white rounded-lg px-3 py-1 text-sm">
              {devices.filter(d => d.isOnline).length}/{devices.length} online
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}