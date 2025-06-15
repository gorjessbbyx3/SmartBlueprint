import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Device } from "@shared/schema";
import DeviceDiscovery from "./device-discovery";
import CoverageAnalysis from "./coverage-analysis";
import MLAnalyticsPanel from "./ml-analytics-panel";
import RoomManagementPanel from "./room-management-panel";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Brain, Home, Zap, TrendingUp, Activity, AlertTriangle } from "lucide-react";

interface SidebarProps {
  activeTab: "mapping" | "analytics";
  onTabChange: (tab: "mapping" | "analytics") => void;
  devices: Device[];
  onDeviceSelect: (device: Device) => void;
  showHeatmap: boolean;
  onToggleHeatmap: (show: boolean) => void;
}

export default function Sidebar({
  activeTab,
  onTabChange,
  devices,
  onDeviceSelect,
  showHeatmap,
  onToggleHeatmap,
}: SidebarProps) {
  const [uploadingBlueprint, setUploadingBlueprint] = useState(false);

  const { data: anomalies = [] } = useQuery({
    queryKey: ["/api/anomalies"],
  });

  const unresolved = anomalies.filter((a: any) => !a.resolved);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadingBlueprint(true);
      // Simulate upload processing
      setTimeout(() => {
        setUploadingBlueprint(false);
      }, 2000);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case "smart_tv":
        return "fas fa-tv";
      case "hue_bridge":
        return "fas fa-lightbulb";
      case "thermostat":
        return "fas fa-thermometer-half";
      case "smart_speaker":
        return "fas fa-volume-up";
      case "smart_fridge":
        return "fas fa-snowflake";
      default:
        return "fas fa-microchip";
    }
  };

  const getSignalStrength = (rssi: number) => {
    if (rssi > -50) return { color: "bg-green-500", label: "Excellent" };
    if (rssi > -60) return { color: "bg-yellow-500", label: "Good" };
    if (rssi > -70) return { color: "bg-orange-500", label: "Fair" };
    return { color: "bg-red-500", label: "Poor" };
  };

  return (
    <div className="w-80 bg-surface border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <i className="fas fa-map-marked-alt text-white text-sm"></i>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">SmartMap Pro</h1>
            <p className="text-xs text-gray-500">v2.1.3 by GorJessCo</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          className={`flex-1 px-4 py-3 text-sm font-medium ${
            activeTab === "mapping"
              ? "text-primary border-b-2 border-primary bg-blue-50"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => onTabChange("mapping")}
        >
          <i className="fas fa-map mr-2"></i>Mapping
        </button>
        <button
          className={`flex-1 px-4 py-3 text-sm font-medium ${
            activeTab === "analytics"
              ? "text-primary border-b-2 border-primary bg-blue-50"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => onTabChange("analytics")}
        >
          <i className="fas fa-chart-line mr-2"></i>Analytics
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === "mapping" && (
          <>
            {/* Blueprint Section */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <i className="fas fa-home mr-2 text-primary"></i>
                  Blueprint Setup
                </h3>
                <div className="space-y-3">
                  <div>
                    <input
                      type="file"
                      id="blueprint-upload"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg,.svg"
                      onChange={handleFileUpload}
                    />
                    <Button
                      className="w-full"
                      onClick={() => document.getElementById("blueprint-upload")?.click()}
                      disabled={uploadingBlueprint}
                    >
                      <i className="fas fa-upload mr-2"></i>
                      {uploadingBlueprint ? "Uploading..." : "Upload Floorplan"}
                    </Button>
                  </div>
                  <Button variant="outline" className="w-full">
                    <i className="fas fa-pencil-alt mr-2"></i>Sketch New Plan
                  </Button>
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    <i className="fas fa-info-circle mr-1"></i>
                    Supports: PDF, PNG, JPG, SVG
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Device Discovery */}
            <DeviceDiscovery />

            {/* Discovered Devices */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <i className="fas fa-microchip mr-2 text-primary"></i>
                  Discovered Devices
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {devices.map((device) => {
                    const signal = getSignalStrength(device.rssi);
                    return (
                      <div
                        key={device.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded border cursor-pointer hover:bg-gray-100"
                        onClick={() => onDeviceSelect(device)}
                      >
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 ${signal.color} rounded-full`} 
                               style={device.isOnline ? { animation: 'pulse 2s infinite' } : {}}></div>
                          <div className="flex items-center space-x-2">
                            <i className={`${getDeviceIcon(device.deviceType)} text-xs text-gray-600`}></i>
                            <div>
                              <p className="text-xs font-medium text-gray-900">{device.name}</p>
                              <p className="text-xs text-gray-500">{device.macAddress}</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-gray-900">{device.rssi} dBm</p>
                          <button className="text-xs text-primary hover:text-blue-700">
                            Place
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Coverage Analysis */}
            <CoverageAnalysis 
              showHeatmap={showHeatmap}
              onToggleHeatmap={onToggleHeatmap}
            />

            {/* Anomaly Detection */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <i className="fas fa-exclamation-triangle mr-2 text-accent"></i>
                  Anomaly Detection
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Status:</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Monitoring
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Alerts Today:</span>
                    <span className="text-xs font-semibold text-gray-900">{unresolved.length}</span>
                  </div>
                  {unresolved.slice(0, 1).map((anomaly: any) => (
                    <div key={anomaly.id} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                      <i className="fas fa-bell mr-1"></i>
                      {anomaly.description}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === "analytics" && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Network Statistics</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Wi-Fi Coverage</span>
                      <span>82%</span>
                    </div>
                    <Progress value={82} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Signal Quality</span>
                      <span>76%</span>
                    </div>
                    <Progress value={76} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Device Health</span>
                      <span>91%</span>
                    </div>
                    <Progress value={91} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Device Distribution</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Wi-Fi Devices</span>
                    <span>{devices.filter(d => d.protocol === 'wifi').length}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Zigbee Devices</span>
                    <span>{devices.filter(d => d.protocol === 'zigbee').length}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Bluetooth Devices</span>
                    <span>{devices.filter(d => d.protocol === 'bluetooth').length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
