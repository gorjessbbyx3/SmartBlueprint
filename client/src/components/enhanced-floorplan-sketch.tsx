import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAIActions } from "@/hooks/use-ai-actions";
import { 
  Pen, Square, Circle, Move, Eraser, Undo, Redo, 
  ZoomIn, ZoomOut, RotateCcw, Grid3X3, Ruler, 
  Save, Download, Upload, Settings, HelpCircle,
  MousePointer, RectangleHorizontal, Home, DoorOpen,
  Wifi, MapPin, Router, Check
} from "lucide-react";

interface Point {
  x: number;
  y: number;
}

interface DrawingElement {
  id: string;
  type: 'wall' | 'room' | 'door' | 'window' | 'line' | 'rectangle' | 'circle' | 'router' | 'location';
  points: Point[];
  style: {
    color: string;
    width: number;
    fill?: string;
    opacity?: number;
  };
  label?: string;
}

interface SketchToolsProps {
  onSave: (elements: DrawingElement[]) => void;
  onLoad?: (elements: DrawingElement[]) => void;
  initialElements?: DrawingElement[];
  backgroundImage?: string;
}

export default function EnhancedFloorplanSketch({ onSave, onLoad, initialElements = [], backgroundImage }: SketchToolsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const backgroundImageDimensions = useRef<{ width: number; height: number } | null>(null);
  const { toast } = useToast();
  const { createAIHandler, executeAIAction } = useAIActions();
  
  // Drawing state
  const [tool, setTool] = useState<'select' | 'pen' | 'wall' | 'room' | 'door' | 'window' | 'rectangle' | 'circle' | 'eraser' | 'router' | 'location'>('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [elements, setElements] = useState<DrawingElement[]>(initialElements);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  
  // Canvas state
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize] = useState(20);
  const [backgroundImageElement, setBackgroundImageElement] = useState<HTMLImageElement | null>(null);
  
  // Track reference points placement
  const [hasRouterPlaced, setHasRouterPlaced] = useState(false);
  const [hasLocationPlaced, setHasLocationPlaced] = useState(false);
  
  // Room type selection state
  const [selectedRoomType, setSelectedRoomType] = useState<string | null>(null);
  const [roomTypeStyles, setRoomTypeStyles] = useState<Record<string, any>>({
    'Living Room': { color: '#3b82f6', width: 2, fill: 'rgba(59, 130, 246, 0.1)' },
    'Bedroom': { color: '#10b981', width: 2, fill: 'rgba(16, 185, 129, 0.1)' },
    'Kitchen': { color: '#f59e0b', width: 2, fill: 'rgba(245, 158, 11, 0.1)' },
    'Office': { color: '#8b5cf6', width: 2, fill: 'rgba(139, 92, 246, 0.1)' }
  });
  
  // History for undo/redo
  const [history, setHistory] = useState<DrawingElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Save state tracking
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // AI-driven save function
  const handleSaveSketch = useCallback(
    createAIHandler(
      async () => {
        setIsSaving(true);
        try {
          console.log("Saving floor plan elements:", elements);
          await onSave(elements);
          
          // Update save state
          setLastSaved(new Date());
          setHasUnsavedChanges(false);
          
          // Show success toast
          toast({
            title: "Floor Plan Saved",
            description: `Successfully saved ${elements.length} elements including rooms and reference points.`,
            duration: 3000,
          });
          
        } catch (error) {
          console.error("Save failed:", error);
          toast({
            title: "Save Failed",
            description: "Failed to save floor plan. Please try again.",
            variant: "destructive",
            duration: 4000,
          });
        } finally {
          setIsSaving(false);
        }
      },
      'save_floorplan',
      'save my floor plan with the rooms I drew',
      { elementCount: elements.length, roomCount: elements.filter(el => el.type === 'room').length }
    ),
    [elements, onSave, toast, createAIHandler]
  );

  // Track changes to mark unsaved state
  useEffect(() => {
    if (elements.length > 0 && !isSaving) {
      setHasUnsavedChanges(true);
    }
  }, [elements, isSaving]);

  // Drawing colors and styles
  const toolStyles = {
    wall: { color: '#374151', width: 4 },
    room: { color: '#3b82f6', width: 2, fill: 'rgba(59, 130, 246, 0.1)' },
    door: { color: '#f59e0b', width: 3 },
    window: { color: '#06b6d4', width: 3 },
    line: { color: '#6b7280', width: 2 },
    rectangle: { color: '#ef4444', width: 2 },
    circle: { color: '#10b981', width: 2 },
    router: { color: '#8b5cf6', width: 4, fill: '#8b5cf6' },
    location: { color: '#f59e0b', width: 4, fill: '#f59e0b' }
  };

  // Check for router and location placement in elements
  useEffect(() => {
    const hasRouter = elements.some(element => element.type === 'router');
    const hasLocation = elements.some(element => element.type === 'location');
    
    setHasRouterPlaced(hasRouter);
    setHasLocationPlaced(hasLocation);
  }, [elements]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // Load background image when provided
  useEffect(() => {
    if (backgroundImage) {
      const img = new Image();
      img.onload = () => {
        setBackgroundImageElement(img);
      };
      img.src = backgroundImage;
    } else {
      setBackgroundImageElement(null);
    }
  }, [backgroundImage]);

  // Room type selection event listener
  useEffect(() => {
    const handleRoomTypeSelect = (event: CustomEvent) => {
      setSelectedRoomType(event.detail.name);
      setTool('room'); // Switch to room drawing tool
    };

    window.addEventListener('selectRoomType', handleRoomTypeSelect as EventListener);
    return () => {
      window.removeEventListener('selectRoomType', handleRoomTypeSelect as EventListener);
    };
  }, []);

  // Snap to grid helper
  const snapPoint = useCallback((point: Point): Point => {
    if (!snapToGrid) return point;
    return {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize
    };
  }, [snapToGrid, gridSize]);

  // Get mouse position relative to canvas
  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const rawPoint = {
      x: (e.clientX - rect.left - panOffset.x) / zoom,
      y: (e.clientY - rect.top - panOffset.y) / zoom
    };
    
    return snapPoint(rawPoint);
  }, [zoom, panOffset, snapPoint]);

  // Drawing functions
  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'select') return;
    
    const point = getMousePos(e);
    
    // Handle router and location placement as single clicks
    if (tool === 'router' || tool === 'location') {
      const newElement: DrawingElement = {
        id: Date.now().toString(),
        type: tool,
        points: [point],
        style: toolStyles[tool],
        label: tool === 'router' ? 'WiFi Router' : 'Current Location'
      };

      const newElements = [...elements, newElement];
      setElements(newElements);
      
      // Update placement status
      if (tool === 'router') {
        setHasRouterPlaced(true);
      } else if (tool === 'location') {
        setHasLocationPlaced(true);
      }
      
      // Add to history
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newElements);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      return;
    }
    
    setIsDrawing(true);
    setCurrentPath([point]);
  }, [tool, getMousePos, elements, history, historyIndex, toolStyles]);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || tool === 'select') return;
    
    const point = getMousePos(e);
    
    if (tool === 'pen' || tool === 'wall') {
      setCurrentPath(prev => [...prev, point]);
    } else {
      // For shapes, update the end point
      setCurrentPath(prev => [prev[0], point]);
    }
  }, [isDrawing, tool, getMousePos]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing || currentPath.length === 0) return;
    
    // Determine which style to use based on tool and selected room type
    let elementStyle = toolStyles[tool as keyof typeof toolStyles] || toolStyles.line;
    
    // If drawing a room and a room type is selected, use the room type style
    if (tool === 'room' && selectedRoomType && roomTypeStyles[selectedRoomType]) {
      elementStyle = roomTypeStyles[selectedRoomType];
    }
    
    const newElement: DrawingElement = {
      id: Date.now().toString(),
      type: tool === 'pen' ? 'line' : tool as any,
      points: [...currentPath],
      style: elementStyle,
      label: tool === 'room' && selectedRoomType ? selectedRoomType : undefined
    };

    const newElements = [...elements, newElement];
    setElements(newElements);
    
    // If this is a room, also create a room record in the database
    if (tool === 'room' && selectedRoomType && currentPath.length >= 2) {
      const roomData = {
        floorplanId: 1, // Default floorplan
        name: selectedRoomType,
        boundaries: JSON.stringify(currentPath),
        roomType: selectedRoomType.toLowerCase().replace(' ', '_'),
        detectedAutomatically: false
      };
      
      fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roomData)
      }).catch(error => {
        console.error('Failed to save room to database:', error);
      });
    }
    
    // Add to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newElements);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    setIsDrawing(false);
    setCurrentPath([]);
  }, [isDrawing, currentPath, elements, tool, history, historyIndex, selectedRoomType, roomTypeStyles]);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply transformations
    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);

    // Draw background image if available
    if (backgroundImageElement) {
      const imgAspect = backgroundImageElement.width / backgroundImageElement.height;
      const canvasAspect = (canvasSize.width / zoom) / (canvasSize.height / zoom);
      
      let drawWidth, drawHeight;
      if (imgAspect > canvasAspect) {
        drawWidth = canvasSize.width / zoom;
        drawHeight = drawWidth / imgAspect;
      } else {
        drawHeight = canvasSize.height / zoom;
        drawWidth = drawHeight * imgAspect;
      }
      
      // Store image dimensions for room tracing
      backgroundImageDimensions.current = { width: drawWidth, height: drawHeight };
      
      ctx.globalAlpha = 0.8; // Slightly more visible for better room tracing
      ctx.drawImage(backgroundImageElement, 0, 0, drawWidth, drawHeight);
      ctx.globalAlpha = 1;
    }

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1 / zoom;
      ctx.globalAlpha = 0.5;
      
      for (let x = 0; x <= canvasSize.width / zoom; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasSize.height / zoom);
        ctx.stroke();
      }
      
      for (let y = 0; y <= canvasSize.height / zoom; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasSize.width / zoom, y);
        ctx.stroke();
      }
      
      ctx.globalAlpha = 1;
    }

    // Draw elements
    elements.forEach(element => {
      ctx.strokeStyle = element.style.color;
      ctx.lineWidth = element.style.width / zoom;
      ctx.globalAlpha = element.style.opacity || 1;
      
      if (element.style.fill) {
        ctx.fillStyle = element.style.fill;
      }

      if (element.points.length > 0) {
        ctx.beginPath();
        
        if (element.type === 'rectangle' && element.points.length >= 2) {
          const [start, end] = element.points;
          const width = end.x - start.x;
          const height = end.y - start.y;
          ctx.rect(start.x, start.y, width, height);
          if (element.style.fill) ctx.fill();
          ctx.stroke();
        } else if (element.type === 'circle' && element.points.length >= 2) {
          const [start, end] = element.points;
          const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
          ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
          if (element.style.fill) ctx.fill();
          ctx.stroke();
        } else if (element.type === 'router' && element.points.length >= 1) {
          const [point] = element.points;
          const size = 20 / zoom;
          
          // Draw router icon (antenna symbol)
          ctx.fillStyle = element.style.color;
          ctx.fillRect(point.x - size/2, point.y - size/2, size, size);
          
          // Draw antenna lines
          ctx.strokeStyle = element.style.color;
          ctx.lineWidth = 2 / zoom;
          ctx.beginPath();
          // Vertical antenna
          ctx.moveTo(point.x, point.y - size/2);
          ctx.lineTo(point.x, point.y - size);
          // Signal waves
          ctx.arc(point.x, point.y, size * 0.8, -Math.PI/4, Math.PI/4, false);
          ctx.arc(point.x, point.y, size * 1.2, -Math.PI/6, Math.PI/6, false);
          ctx.stroke();
          
          // Add label
          ctx.fillStyle = '#000';
          ctx.font = `${12 / zoom}px Arial`;
          ctx.fillText('Router', point.x + size, point.y - size/2);
        } else if (element.type === 'location' && element.points.length >= 1) {
          const [point] = element.points;
          const size = 16 / zoom;
          
          // Draw location pin
          ctx.fillStyle = element.style.color;
          ctx.beginPath();
          ctx.arc(point.x, point.y - size/2, size/2, 0, 2 * Math.PI);
          ctx.fill();
          
          // Draw pin point
          ctx.beginPath();
          ctx.moveTo(point.x, point.y);
          ctx.lineTo(point.x - size/4, point.y - size/2);
          ctx.lineTo(point.x + size/4, point.y - size/2);
          ctx.closePath();
          ctx.fill();
          
          // Add label
          ctx.fillStyle = '#000';
          ctx.font = `${12 / zoom}px Arial`;
          ctx.fillText('You are here', point.x + size, point.y - size/2);
        } else {
          // Draw line/path
          ctx.moveTo(element.points[0].x, element.points[0].y);
          element.points.slice(1).forEach(point => {
            ctx.lineTo(point.x, point.y);
          });
          if (element.type === 'room' && element.points.length > 2) {
            ctx.closePath();
            if (element.style.fill) ctx.fill();
          }
          ctx.stroke();
        }
      }
      
      // Highlight selected element
      if (selectedElement === element.id) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = (element.style.width + 2) / zoom;
        ctx.setLineDash([5 / zoom, 5 / zoom]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    // Draw current path
    if (isDrawing && currentPath.length > 0) {
      const style = toolStyles[tool as keyof typeof toolStyles] || toolStyles.line;
      ctx.strokeStyle = style.color;
      ctx.lineWidth = style.width / zoom;
      ctx.globalAlpha = 0.7;
      
      ctx.beginPath();
      if (tool === 'rectangle' && currentPath.length >= 2) {
        const [start, end] = currentPath;
        const width = end.x - start.x;
        const height = end.y - start.y;
        ctx.rect(start.x, start.y, width, height);
      } else if (tool === 'circle' && currentPath.length >= 2) {
        const [start, end] = currentPath;
        const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
      } else {
        ctx.moveTo(currentPath[0].x, currentPath[0].y);
        currentPath.slice(1).forEach(point => {
          ctx.lineTo(point.x, point.y);
        });
      }
      ctx.stroke();
    }

    ctx.restore();
  }, [elements, currentPath, isDrawing, tool, zoom, panOffset, showGrid, canvasSize, selectedElement, gridSize]);

  // Zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.1));
  const handleResetView = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Undo/Redo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setElements(history[historyIndex - 1]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setElements(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);

  // Clear canvas
  const clearCanvas = useCallback(() => {
    setElements([]);
    setHistory([[]]);
    setHistoryIndex(0);
  }, []);



  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
        {/* Toolbar */}
        <Card className="flex items-center gap-2 p-3 m-3 mb-0 bg-white dark:bg-gray-800 shadow-sm">
          {/* Drawing Tools */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={tool === 'select' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTool('select')}
                >
                  <MousePointer className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <div className="font-semibold">Select & Move</div>
                  <div className="text-xs text-gray-500 mt-1">Click and drag to select and move elements on your floor plan</div>
                </div>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={tool === 'pen' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTool('pen')}
                >
                  <Pen className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <div className="font-semibold">Free Draw</div>
                  <div className="text-xs text-gray-500 mt-1">Draw freehand lines and sketches for notes or rough outlines</div>
                </div>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={tool === 'wall' ? 'default' : 'outline'}
                  size="sm"
                  onClick={createAIHandler(() => setTool('wall'), 'select_tool', 'switch to wall drawing tool', { tool: 'wall' })}
                >
                  <RectangleHorizontal className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <div className="font-semibold">Draw Walls</div>
                  <div className="text-xs text-gray-500 mt-1">Create structural walls to outline your room boundaries and define the shape of your space</div>
                </div>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={tool === 'room' ? 'default' : 'outline'}
                  size="sm"
                  onClick={createAIHandler(() => setTool('room'), 'select_tool', 'switch to room drawing tool', { tool: 'room' })}
                >
                  <Home className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <div className="font-semibold">Draw Rooms</div>
                  <div className="text-xs text-gray-500 mt-1">Define separate rooms and areas with colored boundaries to organize your floor plan</div>
                </div>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={tool === 'door' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTool('door')}
                >
                  <DoorOpen className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <div className="font-semibold">Add Doors</div>
                  <div className="text-xs text-gray-500 mt-1">Mark door openings and entrances to show how rooms connect to each other</div>
                </div>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={tool === 'rectangle' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTool('rectangle')}
                >
                  <Square className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <div className="font-semibold">Rectangle Tool</div>
                  <div className="text-xs text-gray-500 mt-1">Draw precise rectangular shapes for furniture, appliances, or room features</div>
                </div>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={tool === 'circle' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTool('circle')}
                >
                  <Circle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <div className="font-semibold">Circle Tool</div>
                  <div className="text-xs text-gray-500 mt-1">Draw circular shapes for round tables, fixtures, or architectural features</div>
                </div>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={tool === 'router' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTool('router')}
                  className={`relative ${tool === 'router' ? 'bg-purple-600 hover:bg-purple-700' : ''} ${hasRouterPlaced ? 'border-green-500 bg-green-50' : ''}`}
                >
                  <Router className="h-4 w-4" />
                  {hasRouterPlaced && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <div className="font-semibold flex items-center gap-1">
                    WiFi Router
                    {hasRouterPlaced && <span className="text-green-600 text-xs">✓ Placed</span>}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Mark the location of your WiFi router for accurate signal mapping and coverage analysis</div>
                </div>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={tool === 'location' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTool('location')}
                  className={`relative ${tool === 'location' ? 'bg-orange-600 hover:bg-orange-700' : ''} ${hasLocationPlaced ? 'border-green-500 bg-green-50' : ''}`}
                >
                  <MapPin className="h-4 w-4" />
                  {hasLocationPlaced && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <div className="font-semibold flex items-center gap-1">
                    Current Location
                    {hasLocationPlaced && <span className="text-green-600 text-xs">✓ Placed</span>}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Mark where you are currently standing to help calibrate device positioning and signal strength</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Edit Tools */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={undo}
                  disabled={historyIndex === 0}
                >
                  <Undo className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <div className="font-semibold">Undo</div>
                  <div className="text-xs text-gray-500 mt-1">Go back one step to reverse your last drawing action</div>
                </div>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={redo}
                  disabled={historyIndex === history.length - 1}
                >
                  <Redo className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <div className="font-semibold">Redo</div>
                  <div className="text-xs text-gray-500 mt-1">Restore the last action you undid to move forward again</div>
                </div>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCanvas}
                >
                  <Eraser className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <div className="font-semibold">Clear All</div>
                  <div className="text-xs text-gray-500 mt-1">Remove everything from the canvas to start with a completely blank floor plan</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* View Controls */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <div className="font-semibold">Zoom In</div>
                  <div className="text-xs text-gray-500 mt-1">Get a closer view for detailed drawing and precise positioning</div>
                </div>
              </TooltipContent>
            </Tooltip>

            <Badge variant="secondary" className="px-2 py-1 text-xs">
              {Math.round(zoom * 100)}%
            </Badge>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <div className="font-semibold">Zoom Out</div>
                  <div className="text-xs text-gray-500 mt-1">See more of your floor plan at once for a broader overview</div>
                </div>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleResetView}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <div className="font-semibold">Reset View</div>
                  <div className="text-xs text-gray-500 mt-1">Return to the default zoom level and center position</div>
                </div>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showGrid ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowGrid(!showGrid)}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <div className="font-semibold">Toggle Grid</div>
                  <div className="text-xs text-gray-500 mt-1">Show or hide the alignment grid to help draw straight lines and keep things organized</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Save Controls */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={hasUnsavedChanges ? "default" : "outline"} 
                  size="sm" 
                  onClick={handleSaveSketch}
                  disabled={isSaving}
                  className={hasUnsavedChanges ? "bg-blue-600 hover:bg-blue-700" : ""}
                >
                  {isSaving ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : lastSaved ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <div className="font-semibold">
                    {isSaving ? "Saving..." : hasUnsavedChanges ? "Save Changes" : lastSaved ? "Saved" : "Save Sketch"}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {lastSaved 
                      ? `Last saved at ${lastSaved.toLocaleTimeString()}`
                      : "Save your current floor plan design so you can use it for device mapping"
                    }
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
            
            {hasUnsavedChanges && (
              <Badge variant="secondary" className="text-xs px-1 py-0.5">
                Unsaved
              </Badge>
            )}
          </div>

          {/* Help */}
          <div className="ml-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="max-w-xs">
                  <div className="text-center mb-2">
                    <div className="font-semibold">Drawing Tips & Help</div>
                    <div className="text-xs text-gray-500 mt-1">Quick guide to get you started</div>
                  </div>
                  <ul className="text-sm space-y-1">
                    <li>• Select room type, then trace boundaries on your blueprint</li>
                    <li>• Follow room edges carefully for accurate mapping</li>
                    <li>• Complete room outlines by connecting back to start</li>
                    <li>• Use walls for structural elements</li>
                    <li>• Grid snapping helps with precision</li>
                    <li>• Zoom in for detailed tracing work</li>
                    <li>• Each room appears in analytics automatically</li>
                  </ul>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </Card>

        {/* Canvas Area */}
        <div 
          ref={containerRef}
          className="flex-1 m-3 mt-0 bg-white dark:bg-gray-800 rounded-lg shadow-inner border-2 border-dashed border-gray-200 dark:border-gray-700 overflow-hidden relative"
        >
          <canvas
            ref={canvasRef}
            className="cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}

          />
          
          {/* Status Info */}
          <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-sm border">
            <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
              <span>Tool: <strong className="capitalize">{tool}</strong></span>
              <span>Zoom: <strong>{Math.round(zoom * 100)}%</strong></span>
              <span>Elements: <strong>{elements.length}</strong></span>
              {snapToGrid && <Badge variant="secondary" className="text-xs">Grid Snap</Badge>}
            </div>
          </div>

          {/* Room Tracing Guide */}
          {backgroundImage && tool === 'room' && (
            <div className="absolute top-4 right-4 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 rounded-lg shadow-sm border border-blue-200 dark:border-blue-700 max-w-xs">
              <div className="flex items-start gap-2">
                <div className="text-blue-600 dark:text-blue-400 mt-0.5">
                  <Home className="h-4 w-4" />
                </div>
                <div className="text-sm">
                  <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Room Tracing Mode</div>
                  <div className="text-blue-700 dark:text-blue-300 text-xs space-y-1">
                    <div>• Follow room edges on your blueprint</div>
                    <div>• Click to place boundary points</div>
                    <div>• Complete the outline to finish</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Blueprint Upload Guide */}
          {!backgroundImage && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white dark:bg-gray-800 px-6 py-4 rounded-lg shadow-sm border border-dashed border-gray-300 dark:border-gray-600 text-center max-w-md">
                <div className="text-gray-500 dark:text-gray-400 mb-2">
                  <Upload className="h-8 w-8 mx-auto mb-2" />
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 font-medium mb-1">
                  Upload Your Floor Plan
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Upload a blueprint image to trace room boundaries directly on your floor plan
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}