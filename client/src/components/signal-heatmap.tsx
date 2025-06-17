import { useRef, useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Wifi, WifiOff, Activity, TrendingUp, TrendingDown, 
  Pause, Play, RotateCcw, Settings, Eye, EyeOff 
} from "lucide-react";
import type { Device } from "@shared/schema";

interface SignalHeatmapProps {
  devices: Device[];
  floorplan?: {
    width: number;
    height: number;
    scale: number;
    backgroundImage?: string;
  };
  className?: string;
  showControls?: boolean;
  realTimeUpdate?: boolean;
}

interface HeatmapPoint {
  x: number;
  y: number;
  strength: number;
  timestamp: Date;
  deviceId?: number;
  interpolated?: boolean;
}

interface SignalContour {
  level: number;
  color: string;
  opacity: number;
  points: { x: number; y: number }[];
}

export default function SignalHeatmap({
  devices = [],
  floorplan = { width: 800, height: 600, scale: 1 },
  className = "",
  showControls = true,
  realTimeUpdate = true
}: SignalHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  
  // Heatmap configuration
  const [heatmapIntensity, setHeatmapIntensity] = useState(0.9);
  const [interpolationRadius, setInterpolationRadius] = useState(100);
  const [showDeviceLabels, setShowDeviceLabels] = useState(true);
  const [showSignalContours, setShowSignalContours] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState(1.5);
  const [isAnimating, setIsAnimating] = useState(realTimeUpdate);
  
  // Signal data processing
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
  const [signalContours, setSignalContours] = useState<SignalContour[]>([]);
  const [animationFrame, setAnimationFrame] = useState(0);

  // Signal strength color mapping - Enhanced for better visibility
  const getSignalColor = useCallback((strength: number): { r: number; g: number; b: number; a: number } => {
    // Normalize signal strength from -100 to -20 dBm to 0-1 scale
    const normalized = Math.max(0, Math.min(1, (strength + 100) / 80));
    
    if (normalized >= 0.8) {
      // Excellent signal: Bright Green
      return { r: 0, g: 255, b: 0, a: heatmapIntensity };
    } else if (normalized >= 0.6) {
      // Good signal: Lime Green
      return { r: 128, g: 255, b: 0, a: heatmapIntensity };
    } else if (normalized >= 0.4) {
      // Fair signal: Bright Yellow
      return { r: 255, g: 255, b: 0, a: heatmapIntensity };
    } else if (normalized >= 0.2) {
      // Poor signal: Bright Orange
      return { r: 255, g: 128, b: 0, a: heatmapIntensity };
    } else {
      // Very poor signal: Bright Red
      return { r: 255, g: 0, b: 0, a: heatmapIntensity };
    }
  }, [heatmapIntensity]);

  // Calculate interpolated signal strength using inverse distance weighting
  const interpolateSignalStrength = useCallback((x: number, y: number, points: HeatmapPoint[]): number => {
    let totalWeight = 0;
    let weightedSum = 0;
    
    for (const point of points) {
      const distance = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2));
      if (distance < 1) return point.strength; // Very close, use exact value
      
      const weight = 1 / Math.pow(distance / interpolationRadius, 2);
      totalWeight += weight;
      weightedSum += point.strength * weight;
    }
    
    return totalWeight > 0 ? weightedSum / totalWeight : -100;
  }, [interpolationRadius]);

  // Generate heatmap data from device RSSI values
  const generateHeatmapData = useCallback(() => {
    const points: HeatmapPoint[] = [];
    
    // Add real device measurements
    devices.forEach(device => {
      if (device.x !== null && device.y !== null && device.rssi !== null) {
        points.push({
          x: device.x,
          y: device.y,
          strength: device.rssi,
          timestamp: new Date(),
          deviceId: device.id,
          interpolated: false
        });
      }
    });

    // Generate interpolated grid points for smooth visualization - Higher density for bolder effect
    const gridSize = 60;
    const stepX = floorplan.width / gridSize;
    const stepY = floorplan.height / gridSize;
    
    for (let x = 0; x <= floorplan.width; x += stepX) {
      for (let y = 0; y <= floorplan.height; y += stepY) {
        const interpolatedStrength = interpolateSignalStrength(x, y, points);
        if (interpolatedStrength > -100) {
          points.push({
            x,
            y,
            strength: interpolatedStrength,
            timestamp: new Date(),
            interpolated: true
          });
        }
      }
    }
    
    setHeatmapData(points);
  }, [devices, floorplan, interpolateSignalStrength]);

  // Generate signal contour lines - Enhanced for bolder visibility
  const generateSignalContours = useCallback(() => {
    const contours: SignalContour[] = [];
    const levels = [-80, -70, -60, -50, -40, -30]; // dBm levels
    
    levels.forEach((level, index) => {
      const color = index < 2 ? '#ff0000' : index < 4 ? '#ff8800' : '#00ff00';
      const opacity = 0.7 + (index * 0.05); // Higher opacity for bolder effect
      
      // Higher resolution contour generation for smoother lines
      const points: { x: number; y: number }[] = [];
      
      for (let x = 0; x < floorplan.width; x += 10) {
        for (let y = 0; y < floorplan.height; y += 10) {
          const strength = interpolateSignalStrength(x, y, heatmapData);
          if (Math.abs(strength - level) < 3) {
            points.push({ x, y });
          }
        }
      }
      
      if (points.length > 0) {
        contours.push({ level, color, opacity, points });
      }
    });
    
    setSignalContours(contours);
  }, [heatmapData, floorplan, interpolateSignalStrength]);

  // Render heatmap on canvas
  const renderHeatmap = useCallback(() => {
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!canvas || !overlayCanvas) return;

    const ctx = canvas.getContext('2d');
    const overlayCtx = overlayCanvas.getContext('2d');
    if (!ctx || !overlayCtx) return;

    // Set canvas dimensions
    canvas.width = floorplan.width;
    canvas.height = floorplan.height;
    overlayCanvas.width = floorplan.width;
    overlayCanvas.height = floorplan.height;

    // Clear canvases
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // Draw background image if available
    if (floorplan.backgroundImage) {
      const img = new Image();
      img.onload = () => {
        ctx.globalAlpha = 0.3;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0;
      };
      img.src = floorplan.backgroundImage;
    }

    // Render heatmap points
    heatmapData.forEach(point => {
      if (!point.interpolated) return; // Only render interpolated points for smooth heatmap
      
      const color = getSignalColor(point.strength);
      const gradient = ctx.createRadialGradient(
        point.x, point.y, 0,
        point.x, point.y, interpolationRadius * 0.8
      );
      
      gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`);
      gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(
        point.x - interpolationRadius,
        point.y - interpolationRadius,
        interpolationRadius * 2,
        interpolationRadius * 2
      );
    });

    // Draw signal contours if enabled
    if (showSignalContours) {
      signalContours.forEach(contour => {
        overlayCtx.strokeStyle = contour.color;
        overlayCtx.lineWidth = 2;
        overlayCtx.globalAlpha = contour.opacity;
        
        if (contour.points.length > 1) {
          overlayCtx.beginPath();
          overlayCtx.moveTo(contour.points[0].x, contour.points[0].y);
          contour.points.slice(1).forEach(point => {
            overlayCtx.lineTo(point.x, point.y);
          });
          overlayCtx.stroke();
        }
      });
      overlayCtx.globalAlpha = 1.0;
    }

    // Draw device indicators
    devices.forEach(device => {
      if (device.x === null || device.y === null) return;
      
      const color = getSignalColor(device.rssi || -100);
      
      // Device circle
      overlayCtx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`;
      overlayCtx.strokeStyle = '#ffffff';
      overlayCtx.lineWidth = 2;
      overlayCtx.beginPath();
      overlayCtx.arc(device.x, device.y, 8, 0, 2 * Math.PI);
      overlayCtx.fill();
      overlayCtx.stroke();
      
      // Signal strength indicator
      const signalBars = Math.ceil(((device.rssi || -100) + 100) / 20);
      for (let i = 0; i < 4; i++) {
        overlayCtx.fillStyle = i < signalBars ? '#ffffff' : 'rgba(255, 255, 255, 0.3)';
        overlayCtx.fillRect(
          device.x + 12 + (i * 3),
          device.y + 5 - (i * 2),
          2,
          i + 1
        );
      }
      
      // Device label
      if (showDeviceLabels) {
        overlayCtx.fillStyle = '#000000';
        overlayCtx.font = '12px Arial';
        overlayCtx.fillText(
          device.name,
          device.x + 20,
          device.y - 10
        );
        
        // RSSI value
        overlayCtx.fillStyle = '#666666';
        overlayCtx.font = '10px Arial';
        overlayCtx.fillText(
          `${device.rssi || -100} dBm`,
          device.x + 20,
          device.y + 5
        );
      }
    });
  }, [
    floorplan,
    heatmapData,
    signalContours,
    devices,
    showSignalContours,
    showDeviceLabels,
    getSignalColor,
    interpolationRadius
  ]);

  // Animation loop for real-time updates
  const animate = useCallback(() => {
    if (!isAnimating) return;
    
    setAnimationFrame(prev => prev + animationSpeed);
    renderHeatmap();
    
    animationRef.current = requestAnimationFrame(animate);
  }, [isAnimating, animationSpeed, renderHeatmap]);

  // Initialize and update heatmap data
  useEffect(() => {
    generateHeatmapData();
  }, [generateHeatmapData]);

  useEffect(() => {
    if (showSignalContours) {
      generateSignalContours();
    }
  }, [showSignalContours, generateSignalContours]);

  useEffect(() => {
    renderHeatmap();
  }, [renderHeatmap]);

  useEffect(() => {
    if (isAnimating) {
      animate();
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating, animate]);

  // Reset heatmap
  const handleReset = () => {
    setAnimationFrame(0);
    generateHeatmapData();
    renderHeatmap();
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wifi className="h-5 w-5 text-blue-600" />
            <CardTitle>Signal Strength Heatmap</CardTitle>
            <Badge variant="outline" className="text-xs">
              {devices.length} devices
            </Badge>
          </div>
          
          {showControls && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAnimating(!isAnimating)}
              >
                {isAnimating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {/* Heatmap Canvas */}
          <div className="relative border rounded-lg overflow-hidden bg-gray-50">
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
              style={{ mixBlendMode: 'multiply' }}
            />
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full"
            />
            <div className="relative w-full" style={{ paddingBottom: `${(floorplan.height / floorplan.width) * 100}%` }}>
            </div>
          </div>

          {/* Signal Strength Legend */}
          <div className="grid grid-cols-5 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500"></div>
              <span>Very Poor (-100 to -80 dBm)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-500"></div>
              <span>Poor (-80 to -70 dBm)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-500"></div>
              <span>Fair (-70 to -60 dBm)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-lime-500"></div>
              <span>Good (-60 to -50 dBm)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500"></div>
              <span>Excellent (-50+ dBm)</span>
            </div>
          </div>

          {/* Heatmap Controls */}
          {showControls && (
            <>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Heatmap Intensity</Label>
                    <Slider
                      value={[heatmapIntensity]}
                      onValueChange={(value) => setHeatmapIntensity(value[0])}
                      max={1}
                      min={0.1}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-500">{Math.round(heatmapIntensity * 100)}%</div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Interpolation Radius</Label>
                    <Slider
                      value={[interpolationRadius]}
                      onValueChange={(value) => setInterpolationRadius(value[0])}
                      max={200}
                      min={20}
                      step={10}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-500">{interpolationRadius}px</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="device-labels"
                      checked={showDeviceLabels}
                      onCheckedChange={setShowDeviceLabels}
                    />
                    <Label htmlFor="device-labels" className="text-sm">Show Device Labels</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="signal-contours"
                      checked={showSignalContours}
                      onCheckedChange={setShowSignalContours}
                    />
                    <Label htmlFor="signal-contours" className="text-sm">Show Signal Contours</Label>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Animation Speed</Label>
                    <Slider
                      value={[animationSpeed]}
                      onValueChange={(value) => setAnimationSpeed(value[0])}
                      max={2}
                      min={0.1}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-500">{animationSpeed}x</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}