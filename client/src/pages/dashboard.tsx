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

  // WebSocket connection for real-time updates
  useWebSocket("/ws", {
    onMessage: (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "devices_update") {
        refetchDevices();
      }
    },
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
