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
import WiFiConnectionCheck from "./wifi-connection-check";
import { NetworkDeviceDiscovery } from "./network-device-discovery";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAIActions } from "@/hooks/use-ai-actions";
import { Brain, Home, Zap, TrendingUp, Activity, AlertTriangle, Pen, Wifi, MapPin, ExternalLink, Gamepad2 } from "lucide-react";
import { Link } from "wouter";

interface SidebarProps {
  activeTab: "mapping" | "analytics" | "sketch";
  onTabChange: (tab: "mapping" | "analytics" | "sketch") => void;
  devices: Device[];
  onDeviceSelect: (device: Device) => void;
  showHeatmap: boolean;
  onToggleHeatmap: (show: boolean) => void;
  onBlueprintUpload?: (imageUrl: string) => void;
}

export default function Sidebar({
  activeTab,
  onTabChange,
  devices,
  onDeviceSelect,
  showHeatmap,
  onToggleHeatmap,
  onBlueprintUpload,
}: SidebarProps) {
  const [uploadingBlueprint, setUploadingBlueprint] = useState(false);
  const { createAIHandler, executeAIAction } = useAIActions();

  const { data: anomalies = [] } = useQuery({
    queryKey: ["/api/anomalies"],
  });

  const unresolved = anomalies.filter((a: any) => !a.resolved);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadingBlueprint(true);
      
      // Convert file to data URL for display in sketch interface
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result && onBlueprintUpload) {
          onBlueprintUpload(result);
          // Switch to sketch tab to show the uploaded blueprint
          onTabChange("sketch");
        }
        setUploadingBlueprint(false);
      };
      reader.onerror = () => {
        setUploadingBlueprint(false);
        console.error("Failed to read file");
      };
      reader.readAsDataURL(file);
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
            <h1 className="text-lg font-semibold text-gray-900">SmartBlueprint Pro</h1>
            <p className="text-xs text-gray-500">v2.1.3 by GorJess & Co.</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          className={`flex-1 px-3 py-3 text-sm font-medium ${
            activeTab === "mapping"
              ? "text-primary border-b-2 border-primary bg-blue-50"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => onTabChange("mapping")}
        >
          <Home className="w-4 h-4 mx-auto mb-1" />
          <span className="block text-xs">Mapping</span>
        </button>
        <button
          className={`flex-1 px-3 py-3 text-sm font-medium ${
            activeTab === "sketch"
              ? "text-primary border-b-2 border-primary bg-blue-50"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => onTabChange("sketch")}
        >
          <Pen className="w-4 h-4 mx-auto mb-1" />
          <span className="block text-xs">Sketch</span>
        </button>
        <button
          className={`flex-1 px-3 py-3 text-sm font-medium ${
            activeTab === "analytics"
              ? "text-primary border-b-2 border-primary bg-blue-50"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => onTabChange("analytics")}
        >
          <TrendingUp className="w-4 h-4 mx-auto mb-1" />
          <span className="block text-xs">Analytics</span>
        </button>
      </div>

      {/* AI Insights Quick Access */}
      <div className="p-4 border-b border-gray-200">
        <Link href="/ai-insights">
          <Button variant="outline" className="w-full justify-start" size="sm">
            <Brain className="w-4 h-4 mr-2" />
            AI Insights Dashboard
            <ExternalLink className="w-3 h-3 ml-auto" />
          </Button>
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === "mapping" && (
          <>
            {/* Download Desktop Agent */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <i className="fas fa-download mr-2 text-primary"></i>
                  Desktop Agent Required
                </h3>
                <div className="space-y-3">
                  <p className="text-xs text-gray-600">
                    Network scanning requires the desktop agent for WiFi signal access, device discovery, and real-time monitoring.
                  </p>
                  <Button className="w-full">
                    <i className="fas fa-download mr-2"></i>
                    Download Desktop Agent
                  </Button>
                  <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                    <i className="fas fa-info-circle mr-1"></i>
                    Browser security prevents direct network access
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* WiFi Connection Status & Start Button */}
            <WiFiConnectionCheck
              devices={devices}
              onStartMapping={() => {
                console.log("Starting smart home mapping...");
                // Switch to mapping tab when starting
                onTabChange("mapping");
              }}
            />

            {/* Device Discovery */}
            <DeviceDiscovery />

            {/* Enhanced Device Discovery Navigation */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <i className="fas fa-wifi mr-2 text-primary"></i>
                  Direct WiFi Discovery
                </h3>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full text-xs"
                    onClick={() => window.open('/device-discovery', '_blank')}
                  >
                    <i className="fas fa-search mr-2"></i>
                    Discover All Devices
                  </Button>
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    <div className="mb-1 font-medium">Finds:</div>
                    <div>• Printers (HP, Canon, Epson)</div>
                    <div>• Game consoles (Xbox, PlayStation)</div>
                    <div>• Smart TVs & media devices</div>
                    <div>• Network equipment & NAS</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Ping/Latency Probing */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <i className="fas fa-satellite-dish mr-2 text-primary"></i>
                  RTT Distance Measurement
                </h3>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full text-xs"
                    onClick={() => window.open('/ping-monitoring', '_blank')}
                  >
                    <i className="fas fa-satellite-dish mr-2"></i>
                    Open Ping Monitor
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full text-xs"
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
                  </Button>
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    <div className="mb-1 font-medium">Features:</div>
                    <div>• Meter-level accuracy</div>
                    <div>• RTT-based ranging</div>
                    <div>• No special hardware</div>
                    <div>• Works with any AP</div>
                  </div>
                </div>
              </CardContent>
            </Card>

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

            {/* Adjustable Heatmap Intensity Controls */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <Wifi className="w-4 h-4 mr-2 text-primary" />
                  Signal Heatmap
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Show Heatmap:</span>
                    <Switch
                      checked={showHeatmap}
                      onCheckedChange={onToggleHeatmap}
                    />
                  </div>
                  {showHeatmap && (
                    <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
                      <i className="fas fa-info-circle mr-1"></i>
                      Real-time WiFi signal visualization
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Coverage Analysis */}
            <CoverageAnalysis 
              showHeatmap={showHeatmap}
              onToggleHeatmap={onToggleHeatmap}
            />

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

        {activeTab === "sketch" && (
          <div className="space-y-4">
            {/* Sketch Tools Guide */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <Pen className="w-4 h-4 mr-2" />
                  Floor Plan Sketch Tools
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Getting Started</h4>
                    <ul className="space-y-1 text-blue-700">
                      <li>• Select a drawing tool from the toolbar</li>
                      <li>• Use walls to outline room boundaries</li>
                      <li>• Add doors and windows for accuracy</li>
                      <li>• Draw rooms to define separate areas</li>
                    </ul>
                  </div>
                  
                  <div className="bg-green-50 p-3 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">Pro Tips</h4>
                    <ul className="space-y-1 text-green-700">
                      <li>• Enable grid snap for precise alignment</li>
                      <li>• Zoom in for detailed work</li>
                      <li>• Use undo/redo to fix mistakes</li>
                      <li>• Save frequently to preserve your work</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Network Reference Points */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <Activity className="w-4 h-4 mr-2" />
                  Network Reference Points
                </h3>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-auto p-3 flex items-center justify-between bg-purple-50 hover:bg-purple-100"
                    onClick={() => onTabChange("sketch")}
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                        <Activity className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium">Mark WiFi Router</div>
                        <div className="text-xs text-gray-500">Click to place router on floor plan</div>
                      </div>
                    </div>
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center opacity-0">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-auto p-3 flex items-center justify-between bg-orange-50 hover:bg-orange-100"
                    onClick={() => onTabChange("sketch")}
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center mr-3">
                        <Home className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium">Mark Your Location</div>
                        <div className="text-xs text-gray-500">Show where you currently are</div>
                      </div>
                    </div>
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center opacity-0">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  </Button>
                  
                  <div className="bg-blue-50 p-3 rounded-lg text-xs">
                    <div className="font-medium text-blue-900 mb-1">Auto-Detection</div>
                    <div className="text-blue-700">
                      Gateway detected: {devices.find(d => d.macAddress.includes('02:00:31:128'))?.name || 'Scanning...'}
                    </div>
                  </div>
                  
                  {/* Smart Device Discovery */}
                  <NetworkDeviceDiscovery 
                    onDevicesDiscovered={(discoveredDevices) => {
                      console.log('Discovered devices:', discoveredDevices);
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Drawing Templates */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Room Types</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-auto p-3 flex flex-col cursor-pointer hover:bg-blue-50 transition-colors border-blue-200"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('selectRoomType', {
                        detail: { name: 'Living Room' }
                      }));
                    }}
                  >
                    <Home className="w-6 h-6 mb-1 text-blue-600" />
                    <span className="text-xs">Living Room</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-auto p-3 flex flex-col cursor-pointer hover:bg-green-50 transition-colors border-green-200"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('selectRoomType', {
                        detail: { name: 'Bedroom' }
                      }));
                    }}
                  >
                    <Home className="w-6 h-6 mb-1 text-green-600" />
                    <span className="text-xs">Bedroom</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-auto p-3 flex flex-col cursor-pointer hover:bg-orange-50 transition-colors border-orange-200"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('selectRoomType', {
                        detail: { name: 'Kitchen' }
                      }));
                    }}
                  >
                    <Home className="w-6 h-6 mb-1 text-orange-600" />
                    <span className="text-xs">Kitchen</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-auto p-3 flex flex-col cursor-pointer hover:bg-purple-50 transition-colors border-purple-200"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('selectRoomType', {
                        detail: { name: 'Office' }
                      }));
                    }}
                  >
                    <Home className="w-6 h-6 mb-1 text-purple-600" />
                    <span className="text-xs">Office</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-auto p-3 flex flex-col cursor-pointer hover:bg-cyan-50 transition-colors border-cyan-200"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('selectRoomType', {
                        detail: { name: 'Bathroom' }
                      }));
                    }}
                  >
                    <Home className="w-6 h-6 mb-1 text-cyan-600" />
                    <span className="text-xs">Bathroom</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-auto p-3 flex flex-col cursor-pointer hover:bg-slate-50 transition-colors border-slate-200"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('selectRoomType', {
                        detail: { name: 'Hallway' }
                      }));
                    }}
                  >
                    <Home className="w-6 h-6 mb-1 text-slate-600" />
                    <span className="text-xs">Hallway</span>
                  </Button>
                </div>
                <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">
                    Select a room type, then draw with the room tool
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Sketch Settings */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Sketch Settings</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Grid Snapping</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Show Measurements</span>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Auto-Save</span>
                    <Switch defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Export & Share</h3>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    Export as PNG
                  </Button>
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    Export as PDF
                  </Button>
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    Share Link
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Footer with Navigation Links */}
      <div className="border-t border-gray-200 p-4">
        <div className="space-y-3">
          <div className="space-y-2">
            <Link href="/ai-insights">
              <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                <Brain className="w-4 h-4 mr-2" />
                AI Insights & Analytics
              </Button>
            </Link>
            <Link href="/platforms">
              <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                <Home className="w-4 h-4 mr-2" />
                Platform Integrations
              </Button>
            </Link>
            <Link href="/device-control">
              <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                <Gamepad2 className="w-4 h-4 mr-2" />
                Device Control
              </Button>
            </Link>
          </div>
          <div className="flex justify-between items-center text-xs text-gray-500">
            <a href="/terms" className="hover:text-primary underline">Terms of Service</a>
            <a href="/privacy" className="hover:text-primary underline">Privacy Policy</a>
          </div>
          <div className="text-center text-xs text-gray-400">
            © 2025 GorJess & Co. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}
