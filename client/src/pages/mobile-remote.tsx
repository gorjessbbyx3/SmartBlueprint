import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Smartphone, Monitor, Wifi, Shield, Zap, CheckCircle, AlertTriangle, MapPin, Activity } from "lucide-react";

export default function MobileRemotePage() {
  const [connectionCode, setConnectionCode] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [desktopStatus, setDesktopStatus] = useState(null);
  const [mobileDevices, setMobileDevices] = useState([]);

  const generateConnectionCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setConnectionCode(code);
  };

  const connectToDesktop = () => {
    // Simulate connection
    setIsConnected(true);
    setDesktopStatus({
      hostname: "DESKTOP-ABC123",
      ip: "192.168.1.100",
      version: "1.0.0",
      uptime: "2 hours",
      devices: 12,
      alerts: 1
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Mobile Remote Monitoring
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            Connect your mobile device to monitor your desktop SmartBlueprint Pro installation
          </p>
        </div>

        {!isConnected ? (
          /* Connection Setup */
          <div className="max-w-2xl mx-auto">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Connect to Desktop
                </CardTitle>
                <CardDescription>
                  Establish a secure connection between your mobile device and desktop installation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Step 1: Generate Code</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Generate a secure connection code for pairing
                    </p>
                    <Button onClick={generateConnectionCode} className="w-full">
                      Generate Connection Code
                    </Button>
                    {connectionCode && (
                      <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg text-center">
                        <Label className="text-sm text-slate-600 dark:text-slate-300">Connection Code</Label>
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 tracking-widest">
                          {connectionCode}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-semibold">Step 2: Enter on Desktop</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Open your desktop SmartBlueprint Pro and enter this code in the Mobile Connection settings
                    </p>
                    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Desktop → Settings → Mobile Connection → Enter Code
                      </p>
                    </div>
                  </div>
                </div>

                {connectionCode && (
                  <div className="pt-4 border-t">
                    <Button onClick={connectToDesktop} className="w-full" size="lg">
                      <Shield className="mr-2 h-5 w-5" />
                      Connect to Desktop
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Security Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Secure Connection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium">End-to-End Encryption</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        All data encrypted between mobile and desktop
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Local Network Only</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        Connection stays within your home network
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium">No Cloud Dependency</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        Direct device-to-device communication
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Temporary Codes</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        Connection codes expire after 10 minutes
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Connected Dashboard */
          <div className="space-y-6">
            {/* Connection Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    Connected to Desktop
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
                    Online
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-sm text-slate-600 dark:text-slate-300">Hostname</Label>
                    <p className="font-medium">{desktopStatus?.hostname}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-slate-600 dark:text-slate-300">IP Address</Label>
                    <p className="font-medium">{desktopStatus?.ip}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-slate-600 dark:text-slate-300">Uptime</Label>
                    <p className="font-medium">{desktopStatus?.uptime}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-slate-600 dark:text-slate-300">Version</Label>
                    <p className="font-medium">{desktopStatus?.version}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Monitoring Tabs */}
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="devices">Devices</TabsTrigger>
                <TabsTrigger value="alerts">Alerts</TabsTrigger>
                <TabsTrigger value="control">Control</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Network Devices</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">{desktopStatus?.devices}</div>
                      <p className="text-sm text-slate-600 dark:text-slate-300">Discovered devices</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-amber-600">{desktopStatus?.alerts}</div>
                      <p className="text-sm text-slate-600 dark:text-slate-300">Requires attention</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">System Health</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">98%</div>
                      <p className="text-sm text-slate-600 dark:text-slate-300">Overall performance</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <Activity className="h-4 w-4 text-blue-600" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">New device discovered</p>
                          <p className="text-xs text-slate-600 dark:text-slate-300">Samsung Smart TV - Living Room</p>
                        </div>
                        <span className="text-xs text-slate-500">2 min ago</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">Signal strength low</p>
                          <p className="text-xs text-slate-600 dark:text-slate-300">Kitchen IoT devices experiencing weak signal</p>
                        </div>
                        <span className="text-xs text-slate-500">15 min ago</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="devices" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Network Devices</CardTitle>
                    <CardDescription>Devices discovered by your desktop installation</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { name: "Living Room TV", type: "Smart TV", ip: "192.168.1.105", signal: 85 },
                        { name: "Kitchen Echo", type: "Smart Speaker", ip: "192.168.1.108", signal: 72 },
                        { name: "Bedroom Thermostat", type: "Climate Control", ip: "192.168.1.112", signal: 68 }
                      ].map((device, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Monitor className="h-4 w-4 text-slate-600" />
                            <div>
                              <p className="font-medium text-sm">{device.name}</p>
                              <p className="text-xs text-slate-600 dark:text-slate-300">{device.type} • {device.ip}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{device.signal}%</p>
                            <p className="text-xs text-slate-600 dark:text-slate-300">Signal</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="alerts" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Active Alerts</CardTitle>
                    <CardDescription>Issues detected by your desktop monitoring</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Weak WiFi Coverage</strong> detected in Kitchen area. Consider repositioning router or adding extender.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="control" className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Remote Commands</CardTitle>
                      <CardDescription>Control your desktop installation remotely</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button className="w-full" variant="outline">
                        <Zap className="mr-2 h-4 w-4" />
                        Trigger Network Scan
                      </Button>
                      <Button className="w-full" variant="outline">
                        <Activity className="mr-2 h-4 w-4" />
                        Generate Health Report
                      </Button>
                      <Button className="w-full" variant="outline">
                        <MapPin className="mr-2 h-4 w-4" />
                        Update Device Locations
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Settings</CardTitle>
                      <CardDescription>Configure remote monitoring preferences</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Real-time Updates</Label>
                        <input type="checkbox" defaultChecked className="h-4 w-4" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Push Notifications</Label>
                        <input type="checkbox" defaultChecked className="h-4 w-4" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Auto-reconnect</Label>
                        <input type="checkbox" defaultChecked className="h-4 w-4" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}