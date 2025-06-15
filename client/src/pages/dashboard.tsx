import { useState } from "react";
import Sidebar from "@/components/sidebar";
import FloorplanCanvas from "@/components/floorplan-canvas";
import DeviceDetailsModal from "@/components/device-details-modal";
import RecommendationPanel from "@/components/recommendation-panel";
import { RoomHeatmap } from "@/components/room-heatmap";
import { LiveAlertsFeed } from "@/components/live-alerts-feed";
import { useQuery } from "@tanstack/react-query";
import { Device, Floorplan, Recommendation } from "@shared/schema";
import { useWebSocket } from "@/hooks/use-websocket";

export default function Dashboard() {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [activeTab, setActiveTab] = useState<"mapping" | "analytics">("mapping");
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);

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
    <div className="flex h-screen bg-background">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        devices={devices}
        onDeviceSelect={setSelectedDevice}
        showHeatmap={showHeatmap}
        onToggleHeatmap={setShowHeatmap}
      />
      
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="bg-surface border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Floor Plan - {floorplan?.name || "Living Area"}
              </h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Scale:</span>
                <select className="text-sm border border-gray-300 rounded px-2 py-1" defaultValue="1:200">
                  <option value="1:50">1:50</option>
                  <option value="1:100">1:100</option>
                  <option value="1:200">1:200</option>
                </select>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-3 h-3 bg-success rounded-full"></div>
                <span className="text-gray-600">{onlineDevices} Online</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-3 h-3 bg-accent rounded-full"></div>
                <span className="text-gray-600">{warningDevices} Warning</span>
              </div>
              <button className="px-3 py-1.5 bg-primary text-white rounded text-sm font-medium hover:bg-blue-700">
                <i className="fas fa-save mr-1"></i>Save
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 relative bg-gray-50">
          {activeTab === "mapping" ? (
            <div className="h-full bg-white">
              <FloorplanCanvas
                devices={devices}
                floorplan={floorplan}
                onDeviceClick={handleDeviceClick}
                showHeatmap={showHeatmap}
              />
            </div>
          ) : (
            <div className="h-full overflow-auto p-6">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">
                {/* Room Heatmap - Takes 2 columns */}
                <div className="xl:col-span-2">
                  <RoomHeatmap 
                    enableTimelinePlayback={true}
                    overlayFloorplan={true}
                    className="h-full"
                  />
                </div>
                
                {/* Live Alerts Feed - Takes 1 column */}
                <div className="xl:col-span-1">
                  <LiveAlertsFeed 
                    maxAlerts={20}
                    showToastNotifications={true}
                    autoRefresh={true}
                    className="h-full"
                  />
                </div>
              </div>
            </div>
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
    </div>
  );
}
