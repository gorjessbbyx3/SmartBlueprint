import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Pen, Square, Circle, Move, Eraser, Undo, Redo, 
  ZoomIn, ZoomOut, RotateCcw, Grid3X3, Ruler, 
  Save, Download, Upload, Settings, HelpCircle,
  MousePointer, RectangleHorizontal, Home, DoorOpen
} from "lucide-react";

interface Point {
  x: number;
  y: number;
}

interface DrawingElement {
  id: string;
  type: 'wall' | 'room' | 'door' | 'window' | 'line' | 'rectangle' | 'circle';
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
}

export default function EnhancedFloorplanSketch({ onSave, onLoad, initialElements = [] }: SketchToolsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Drawing state
  const [tool, setTool] = useState<'select' | 'pen' | 'wall' | 'room' | 'door' | 'window' | 'rectangle' | 'circle' | 'eraser'>('select');
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
  
  // History for undo/redo
  const [history, setHistory] = useState<DrawingElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Drawing colors and styles
  const toolStyles = {
    wall: { color: '#374151', width: 4 },
    room: { color: '#3b82f6', width: 2, fill: 'rgba(59, 130, 246, 0.1)' },
    door: { color: '#f59e0b', width: 3 },
    window: { color: '#06b6d4', width: 3 },
    line: { color: '#6b7280', width: 2 },
    rectangle: { color: '#ef4444', width: 2 },
    circle: { color: '#10b981', width: 2 }
  };

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
    setIsDrawing(true);
    setCurrentPath([point]);
  }, [tool, getMousePos]);

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
    
    const newElement: DrawingElement = {
      id: Date.now().toString(),
      type: tool === 'pen' ? 'line' : tool as any,
      points: [...currentPath],
      style: toolStyles[tool as keyof typeof toolStyles] || toolStyles.line
    };

    const newElements = [...elements, newElement];
    setElements(newElements);
    
    // Add to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newElements);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    setIsDrawing(false);
    setCurrentPath([]);
  }, [isDrawing, currentPath, elements, tool, history, historyIndex]);

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

  // Save sketch
  const handleSave = useCallback(() => {
    onSave(elements);
  }, [elements, onSave]);

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
                  onClick={() => setTool('wall')}
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
                  onClick={() => setTool('room')}
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
                <Button variant="outline" size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <div className="font-semibold">Save Sketch</div>
                  <div className="text-xs text-gray-500 mt-1">Save your current floor plan design so you can use it for device mapping</div>
                </div>
              </TooltipContent>
            </Tooltip>
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
                    <li>• Use walls to outline your space boundaries</li>
                    <li>• Draw rooms to define separate areas</li>
                    <li>• Add doors and windows for accuracy</li>
                    <li>• Grid snapping helps with precision</li>
                    <li>• Zoom in for detailed work</li>
                    <li>• Use undo/redo to fix mistakes</li>
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
        </div>
      </div>
    </TooltipProvider>
  );
}