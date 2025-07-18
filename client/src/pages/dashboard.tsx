import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import FloorplanCanvas from "@/components/floorplan-canvas";
import EnhancedFloorplanSketch from "@/components/enhanced-floorplan-sketch";
import DeviceDetailsModal from "@/components/device-details-modal";
import RecommendationPanel from "@/components/recommendation-panel";
import { RoomHeatmap } from "@/components/room-heatmap";
import { LiveAlertsFeed } from "@/components/live-alerts-feed";
import { MetaAIFixQueue } from "@/components/meta-ai-fix-queue";
import SignalHeatmap from "@/components/signal-heatmap";
import WiFiConnectionCheck from "@/components/wifi-connection-check";
import { ErrorBoundary, NetworkErrorFallback } from "@/components/error-boundary";
import { LoadingSpinner, AnalyticsLoadingState } from "@/components/loading-states";
import { MobileNav, MobileBottomNav } from "@/components/mobile-nav";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Device, Floorplan, Recommendation } from "@shared/schema";
import { useWebSocket } from "@/hooks/use-websocket";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [activeTab, setActiveTab] = useState<"mapping" | "analytics" | "sketch">("mapping");
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [uploadedBlueprint, setUploadedBlueprint] = useState<string | null>(null);
  
  // Add hooks
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Detect mobile device for responsive UI
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { data: devices = [], refetch: refetchDevices } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
  });

  const { data: floorplan } = useQuery<Floorplan>({
    queryKey: ["/api/floorplans/1"],
  });

  const { data: recommendations = [] } = useQuery<Recommendation[]>({
    queryKey: ["/api/recommendations"],
  });

  // WebSocket connection for real-time updates (optional)
  const { isConnected } = useWebSocket("/ws", {
    onMessage: (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "devices_update") {
          refetchDevices();
        }
      } catch (error) {
        console.warn("Failed to parse WebSocket message:", error);
      }
    },
    onError: (error) => {
      console.warn("WebSocket connection failed - app will work without real-time updates");
    }
  });

  const handleDeviceClick = (device: Device) => {
    setSelectedDevice(device);
  };

  const handleCloseModal = () => {
    setSelectedDevice(null);
  };

  const onlineDevices = devices.filter(d => d.isOnline).length;
  const warningDevices = devices.filter(d => d.rssi < -60).length;

  return (
    <ErrorBoundary fallback={NetworkErrorFallback}>
      <div className="flex h-screen bg-gray-50">
        {/* Mobile Navigation */}
        {isMobile && (
          <MobileNav 
            activeTab={activeTab} 
            onTabChange={(tab) => setActiveTab(tab as "mapping" | "analytics")} 
          />
        )}

        {/* Desktop Sidebar */}
        <div className={isMobile ? "hidden" : "block"}>
          <Sidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            devices={devices}
            onDeviceSelect={setSelectedDevice}
            showHeatmap={showHeatmap}
            onToggleHeatmap={setShowHeatmap}
            onBlueprintUpload={setUploadedBlueprint}
          />
        </div>
        
        <div className={`flex-1 flex flex-col ${isMobile ? 'pb-16' : ''}`}>
          {/* Top Toolbar - Mobile Optimized */}
          <div className={`bg-white border-b border-gray-200 ${isMobile ? 'px-4 py-3 pt-16' : 'px-6 py-4'}`}>
            <div className={`flex items-center ${isMobile ? 'flex-col space-y-2' : 'justify-between'}`}>
              <div className={`flex items-center ${isMobile ? 'w-full justify-center' : 'space-x-4'}`}>
                <h2 className={`font-semibold text-gray-900 ${isMobile ? 'text-base' : 'text-lg'}`}>
                  Floor Plan - {floorplan?.name || "Living Area"}
                </h2>
                {!isMobile && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Scale:</span>
                    <select className="text-sm border border-gray-300 rounded px-2 py-1" defaultValue="1:200">
                      <option value="1:50">1:50</option>
                      <option value="1:100">1:100</option>
                      <option value="1:200">1:200</option>
                    </select>
                  </div>
                )}
              </div>
              <div className={`flex items-center ${isMobile ? 'w-full justify-between' : 'space-x-3'}`}>
                <div className={`flex items-center ${isMobile ? 'space-x-4' : 'space-x-3'}`}>
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600">{onlineDevices} Online</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-gray-600">{warningDevices} Warning</span>
                  </div>
                </div>
                
              </div>
            </div>
          </div>

          {/* Main Content Area - Mobile Optimized */}
          <div className="flex-1 relative bg-gray-50 overflow-hidden">
            {activeTab === "mapping" ? (
              <div className="h-full bg-white">
                {showHeatmap ? (
                  <SignalHeatmap
                    devices={devices}
                    floorplan={{
                      width: Number(floorplan?.width) || 800,
                      height: Number(floorplan?.height) || 600,
                      scale: Number(floorplan?.scale) || 1,
                      backgroundImage: uploadedBlueprint || undefined
                    }}
                    className="h-full"
                    showControls={true}
                    realTimeUpdate={true}
                  />
                ) : (
                  <FloorplanCanvas
                    devices={devices}
                    floorplan={floorplan}
                    onDeviceClick={handleDeviceClick}
                    showHeatmap={false}
                  />
                )}
              </div>
            ) : activeTab === "sketch" ? (
              <div className="h-full">
                <EnhancedFloorplanSketch
                  onSave={async (elements) => {
                    try {
                      console.log("Saving floor plan elements:", elements);
                      
                      // Extract room elements and create room records
                      const roomElements = elements.filter(el => el.type === 'room');
                      
                      // Save sketch elements to the floorplan
                      const floorplanResponse = await fetch(`/api/floorplans/${floorplan?.id || 1}`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          sketchElements: JSON.stringify(elements),
                          width: 800,
                          height: 600,
                          scale: "1:200"
                        })
                      });

                      if (!floorplanResponse.ok) {
                        throw new Error('Failed to save floor plan');
                      }

                      // Clear existing rooms and create new ones from sketch
                      if (roomElements.length > 0) {
                        // Delete all existing rooms first
                        await fetch('/api/rooms/clear', {
                          method: 'DELETE'
                        });
                        
                        // Create new room records from sketch elements
                        for (let i = 0; i < roomElements.length; i++) {
                          const roomElement = roomElements[i];
                          const roomType = roomElement.label || 'Living Room'; // Use the room type from label
                          await fetch('/api/rooms', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              name: roomElement.label ? roomElement.label : `Room ${i + 1}`,
                              floorplanId: floorplan?.id || 1,
                              boundaries: JSON.stringify(roomElement.points),
                              roomType: roomType,
                              detectedAutomatically: false
                            })
                          });
                        }
                      }

                      toast({
                        title: "Floor plan saved",
                        description: `Saved ${elements.length} elements and ${roomElements.length} rooms`,
                      });
                      
                      // Refresh both floorplan and rooms data
                      queryClient.invalidateQueries({ queryKey: ['/api/floorplans/1'] });
                      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
                      
                    } catch (error) {
                      console.error("Save error:", error);
                      toast({
                        title: "Save failed",
                        description: "Could not save your floor plan sketch",
                        variant: "destructive",
                      });
                    }
                  }}
                  initialElements={floorplan?.sketchElements ? JSON.parse(floorplan.sketchElements) : []}
                  backgroundImage={uploadedBlueprint || undefined}
                />
              </div>
            ) : (
              <div className={`h-full overflow-auto ${isMobile ? 'p-4' : 'p-6'}`}>
                <div className={`grid grid-cols-1 xl:grid-cols-3 ${isMobile ? 'gap-4' : 'gap-6'} max-w-7xl mx-auto`}>
                  {/* Room Heatmap - Takes 2 columns */}
                  <div className="xl:col-span-2">
                    <RoomHeatmap 
                      enableTimelinePlayback={true}
                      overlayFloorplan={true}
                      className="h-full"
                    />
                  </div>
                  
                  {/* Right Panel - 2 components stacked */}
                  <div className="xl:col-span-1 space-y-6">
                    {/* Meta-AI Fix Queue */}
                    <MetaAIFixQueue className="h-[300px]" />
                    
                    {/* Live Alerts Feed */}
                    <LiveAlertsFeed 
                      maxAlerts={15}
                      showToastNotifications={true}
                      autoRefresh={true}
                      className="h-[400px]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Bottom Navigation */}
          {isMobile && (
            <MobileBottomNav 
              activeTab={activeTab} 
              onTabChange={(tab) => setActiveTab(tab as "mapping" | "analytics")} 
            />
          )}
        </div>

        {/* Right Sidebar - Analysis Tools */}
        {!isMobile && (
          <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Blueprint Setup */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <i className="fas fa-home mr-2 text-primary"></i>
                  Blueprint Setup
                </h3>
                <div className="space-y-3">
                  <div>
                    <input
                      type="file"
                      id="blueprint-upload-right"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg,.svg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setUploadedBlueprint(event.target?.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <button
                      className="w-full px-3 py-2 text-xs bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100"
                      onClick={() => document.getElementById("blueprint-upload-right")?.click()}
                    >
                      <i className="fas fa-upload mr-2"></i>
                      Upload Floorplan
                    </button>
                  </div>
                  <button className="w-full px-3 py-2 text-xs border border-gray-200 rounded hover:bg-gray-50">
                    <i className="fas fa-pencil-alt mr-2"></i>Sketch New Plan
                  </button>
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    <i className="fas fa-info-circle mr-1"></i>
                    Supports: PDF, PNG, JPG, SVG
                  </div>
                </div>
              </div>

              {/* Coverage Analysis */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <i className="fas fa-chart-area mr-2 text-primary"></i>
                  Coverage Analysis
                </h3>
                <div className="space-y-2">
                  <button 
                    className="w-full px-3 py-2 text-xs bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100"
                    onClick={() => window.open('/advanced-analytics', '_blank')}
                  >
                    <i className="fas fa-chart-line mr-2"></i>
                    View Analytics
                  </button>
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    <div className="mb-1 font-medium">Real-time Analysis:</div>
                    <div>• Signal strength mapping</div>
                    <div>• Coverage gap detection</div>
                    <div>• Performance optimization</div>
                  </div>
                </div>
              </div>

              {/* RTT Distance Measurement */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <i className="fas fa-satellite-dish mr-2 text-primary"></i>
                  RTT Distance Measurement
                </h3>
                <div className="space-y-2">
                  <button 
                    className="w-full px-3 py-2 text-xs bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100"
                    onClick={() => window.open('/ping-monitoring', '_blank')}
                  >
                    <i className="fas fa-satellite-dish mr-2"></i>
                    Open Ping Monitor
                  </button>
                  <button 
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded hover:bg-gray-50"
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/ping/measure', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            hosts: ['192.168.1.1', '192.168.1.254', '192.168.0.1'],
                            trials: 3
                          })
                        });
                        const data = await response.json();
                        if (data.success) {
                          console.log('Ping measurements:', data.measurements);
                        }
                      } catch (error) {
                        console.error('Ping measurement failed:', error);
                      }
                    }}
                  >
                    <i className="fas fa-play mr-2"></i>
                    Quick Measure
                  </button>
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    <div className="mb-1 font-medium">Features:</div>
                    <div>• Meter-level accuracy</div>
                    <div>• RTT-based ranging</div>
                    <div>• No special hardware</div>
                    <div>• Works with any AP</div>
                  </div>
                </div>
              </div>

              {/* System Setup Guide */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <i className="fas fa-rocket mr-2 text-primary"></i>
                  System Setup
                </h3>
                <div className="space-y-2">
                  <button 
                    className="w-full px-3 py-2 text-xs bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100"
                    onClick={() => window.open('/onboarding', '_blank')}
                  >
                    <i className="fas fa-cog mr-2"></i>
                    Setup Guide
                  </button>
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    <div className="mb-1 font-medium">Complete Setup:</div>
                    <div>• Desktop agent installation</div>
                    <div>• Authentic device discovery</div>
                    <div>• Platform integrations</div>
                    <div>• Ping calibration system</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals and Panels */}
      {selectedDevice && (
        <DeviceDetailsModal
          device={selectedDevice}
          onClose={handleCloseModal}
          onUpdate={refetchDevices}
        />
      )}

      {showRecommendations && recommendations.length > 0 && (
        <RecommendationPanel
          recommendations={recommendations}
          onClose={() => setShowRecommendations(false)}
        />
      )}
    </ErrorBoundary>
  );
}
