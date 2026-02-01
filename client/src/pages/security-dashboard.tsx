import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import DeviceLearningPrompt from "@/components/device-learning-prompt";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Users,
  Smartphone,
  Bell,
  Clock,
  Home,
  Moon,
  LogOut,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  Settings,
  Mail,
  Phone,
  Webhook,
  Activity,
  Map,
  Wifi
} from "lucide-react";

type SecurityMode = "disarmed" | "armed_home" | "armed_away" | "armed_night";

interface SecurityStatus {
  mode: SecurityMode;
  isArmed: boolean;
  residentsAtHome: PresenceStatus[];
  activeAlerts: IntrusionAlert[];
  lastModeChange: string;
  entryDelayActive: boolean;
  exitDelayActive: boolean;
  entryDelayRemaining?: number;
  exitDelayRemaining?: number;
}

interface PresenceStatus {
  residentId: number;
  residentName: string;
  isHome: boolean;
  lastSeen: string | null;
  primaryDevice?: string;
}

interface IntrusionAlert {
  id: string;
  timestamp: string;
  alertType: string;
  severity: string;
  description: string;
  deviceId?: number;
  macAddress?: string;
  requiresAcknowledgment: boolean;
}

interface Resident {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  isActive: boolean;
  lastSeen?: string;
}

interface ResidentDevice {
  id: number;
  residentId: number;
  macAddress: string;
  deviceName: string;
  deviceType: string;
  isPrimary: boolean;
  isActive: boolean;
}

interface NotificationChannel {
  id: number;
  residentId?: number;
  channelType: string;
  destination: string;
  isEnabled: boolean;
  notifyOnIntrusion: boolean;
  notifyOnModeChange: boolean;
}

interface SecurityEvent {
  id: number;
  eventType: string;
  severity: string;
  description: string;
  createdAt: string;
  isAcknowledged: boolean;
}

export default function SecurityDashboard() {
  const [activeSection, setActiveSection] = useState<"status" | "residents" | "notifications" | "events" | "settings">("status");
  const [isMobile, setIsMobile] = useState(false);
  const [showAddResident, setShowAddResident] = useState(false);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [showAddNotification, setShowAddNotification] = useState(false);
  const [selectedResidentId, setSelectedResidentId] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Queries
  const { data: securityStatus, refetch: refetchStatus } = useQuery<SecurityStatus>({
    queryKey: ["/api/security/status"],
    refetchInterval: 5000,
  });

  const { data: residents = [] } = useQuery<Resident[]>({
    queryKey: ["/api/security/residents"],
    select: (data: any) => data.residents || [],
  });

  const { data: events = [] } = useQuery<SecurityEvent[]>({
    queryKey: ["/api/security/events"],
    select: (data: any) => data.events || [],
  });

  const { data: notifications = [] } = useQuery<NotificationChannel[]>({
    queryKey: ["/api/security/notifications"],
    select: (data: any) => data.channels || [],
  });

  // WebSocket for real-time updates
  useWebSocket("/ws", {
    onMessage: (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "security_alert" || message.type === "security_event") {
          refetchStatus();
          queryClient.invalidateQueries({ queryKey: ["/api/security/events"] });

          if (message.type === "security_alert") {
            toast({
              title: "Security Alert",
              description: message.alert?.description || "New security alert",
              variant: "destructive",
            });
          }
        } else if (message.type === "security_mode_change") {
          refetchStatus();
          toast({
            title: "Security Mode Changed",
            description: `System is now ${message.mode}`,
          });
        }
      } catch (error) {
        console.warn("Failed to parse WebSocket message:", error);
      }
    },
  });

  // Mutations
  const setModeMutation = useMutation({
    mutationFn: async (mode: SecurityMode) => {
      return apiRequest("/api/security/mode", {
        method: "POST",
        body: JSON.stringify({ mode }),
      });
    },
    onSuccess: () => {
      refetchStatus();
      toast({ title: "Security mode updated" });
    },
    onError: () => {
      toast({ title: "Failed to update security mode", variant: "destructive" });
    },
  });

  const acknowledgeAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      return apiRequest(`/api/security/alerts/${alertId}/acknowledge`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      refetchStatus();
      toast({ title: "Alert acknowledged" });
    },
  });

  const getModeIcon = (mode: SecurityMode) => {
    switch (mode) {
      case "disarmed": return <ShieldOff className="w-8 h-8 text-gray-400" />;
      case "armed_home": return <Home className="w-8 h-8 text-blue-500" />;
      case "armed_away": return <Shield className="w-8 h-8 text-green-500" />;
      case "armed_night": return <Moon className="w-8 h-8 text-purple-500" />;
    }
  };

  const getModeColor = (mode: SecurityMode) => {
    switch (mode) {
      case "disarmed": return "bg-gray-100 border-gray-300";
      case "armed_home": return "bg-blue-50 border-blue-300";
      case "armed_away": return "bg-green-50 border-green-300";
      case "armed_night": return "bg-purple-50 border-purple-300";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-100 text-red-800 border-red-200";
      case "alert": return "bg-orange-100 text-orange-800 border-orange-200";
      case "warning": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default: return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      {!isMobile && (
        <div className="w-64 bg-white border-r border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-6 h-6 text-blue-600" />
              <h1 className="text-lg font-semibold">Security Center</h1>
            </div>
          </div>
          <nav className="p-4 space-y-2">
            {[
              { id: "status", label: "Security Status", icon: Shield },
              { id: "residents", label: "Residents", icon: Users },
              { id: "notifications", label: "Notifications", icon: Bell },
              { id: "events", label: "Event Log", icon: Clock },
              { id: "settings", label: "Settings", icon: Settings },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id as any)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  activeSection === item.id
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Quick Links to Other Features */}
          <div className="p-4 border-t border-gray-200">
            <p className="text-xs text-gray-400 uppercase mb-2">Features</p>
            <div className="space-y-1">
              <a
                href="/mapping"
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
              >
                <Map className="w-4 h-4" />
                <span>Home Mapping</span>
              </a>
              <a
                href="/device-discovery"
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
              >
                <Wifi className="w-4 h-4" />
                <span>Device Discovery</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 max-w-6xl mx-auto">
          {/* Security Status Section */}
          {activeSection === "status" && (
            <div className="space-y-6">
              {/* Current Mode Card */}
              <div className={`p-6 rounded-xl border-2 ${getModeColor(securityStatus?.mode || "disarmed")}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getModeIcon(securityStatus?.mode || "disarmed")}
                    <div>
                      <h2 className="text-2xl font-bold capitalize">
                        {securityStatus?.mode?.replace("_", " ") || "Disarmed"}
                      </h2>
                      <p className="text-gray-500">
                        {securityStatus?.exitDelayActive
                          ? `Arming in ${securityStatus.exitDelayRemaining}s...`
                          : securityStatus?.entryDelayActive
                          ? `Entry delay: ${securityStatus.entryDelayRemaining}s`
                          : "System ready"}
                      </p>
                    </div>
                  </div>
                  {securityStatus?.activeAlerts && securityStatus.activeAlerts.length > 0 && (
                    <div className="flex items-center space-x-2 text-red-600">
                      <AlertTriangle className="w-6 h-6" />
                      <span className="font-semibold">{securityStatus.activeAlerts.length} Active Alert(s)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Mode Selection */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { mode: "disarmed" as SecurityMode, label: "Disarm", icon: ShieldOff, color: "gray" },
                  { mode: "armed_home" as SecurityMode, label: "Home", icon: Home, color: "blue" },
                  { mode: "armed_away" as SecurityMode, label: "Away", icon: Shield, color: "green" },
                  { mode: "armed_night" as SecurityMode, label: "Night", icon: Moon, color: "purple" },
                ].map((item) => (
                  <button
                    key={item.mode}
                    onClick={() => setModeMutation.mutate(item.mode)}
                    disabled={setModeMutation.isPending}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      securityStatus?.mode === item.mode
                        ? `border-${item.color}-500 bg-${item.color}-50`
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <item.icon className={`w-8 h-8 mx-auto mb-2 text-${item.color}-500`} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </div>

              {/* AI Device Learning - Who's Home with device identification */}
              <DeviceLearningPrompt />

              {/* Residents at Home */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Who's Home
                </h3>
                <div className="space-y-3">
                  {securityStatus?.residentsAtHome?.map((resident) => (
                    <div
                      key={resident.residentId}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${resident.isHome ? "bg-green-500" : "bg-gray-300"}`} />
                        <span className="font-medium">{resident.residentName}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {resident.isHome ? (
                          <span className="text-green-600">Home</span>
                        ) : resident.lastSeen ? (
                          `Last seen: ${new Date(resident.lastSeen).toLocaleString()}`
                        ) : (
                          "Away"
                        )}
                      </div>
                    </div>
                  ))}
                  {(!securityStatus?.residentsAtHome || securityStatus.residentsAtHome.length === 0) && (
                    <p className="text-gray-500 text-center py-4">No residents registered</p>
                  )}
                </div>
              </div>

              {/* Active Alerts */}
              {securityStatus?.activeAlerts && securityStatus.activeAlerts.length > 0 && (
                <div className="bg-red-50 rounded-xl border border-red-200 p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center text-red-800">
                    <ShieldAlert className="w-5 h-5 mr-2" />
                    Active Alerts
                  </h3>
                  <div className="space-y-3">
                    {securityStatus.activeAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{alert.alertType.replace("_", " ").toUpperCase()}</p>
                            <p className="text-sm">{alert.description}</p>
                            <p className="text-xs mt-1 opacity-75">
                              {new Date(alert.timestamp).toLocaleString()}
                            </p>
                          </div>
                          {alert.requiresAcknowledgment && (
                            <button
                              onClick={() => acknowledgeAlertMutation.mutate(alert.id)}
                              className="px-3 py-1 bg-white rounded border hover:bg-gray-50"
                            >
                              Acknowledge
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Residents Section */}
          {activeSection === "residents" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Residents</h2>
                <button
                  onClick={() => setShowAddResident(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Resident</span>
                </button>
              </div>

              <div className="grid gap-4">
                {residents.map((resident) => (
                  <div key={resident.id} className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{resident.name}</h3>
                        <p className="text-sm text-gray-500 capitalize">{resident.role}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${resident.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                        {resident.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    {resident.email && (
                      <p className="text-sm text-gray-600 flex items-center mb-1">
                        <Mail className="w-4 h-4 mr-2" />
                        {resident.email}
                      </p>
                    )}
                    {resident.phone && (
                      <p className="text-sm text-gray-600 flex items-center">
                        <Phone className="w-4 h-4 mr-2" />
                        {resident.phone}
                      </p>
                    )}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Registered Devices</span>
                        <button
                          onClick={() => {
                            setSelectedResidentId(resident.id);
                            setShowAddDevice(true);
                          }}
                          className="text-blue-600 text-sm hover:underline"
                        >
                          + Add Device
                        </button>
                      </div>
                      <ResidentDevicesList residentId={resident.id} />
                    </div>
                  </div>
                ))}
                {residents.length === 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">No residents registered yet</p>
                    <button
                      onClick={() => setShowAddResident(true)}
                      className="mt-4 text-blue-600 hover:underline"
                    >
                      Add your first resident
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notifications Section */}
          {activeSection === "notifications" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Notification Channels</h2>
                <button
                  onClick={() => setShowAddNotification(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Channel</span>
                </button>
              </div>

              <div className="grid gap-4">
                {notifications.map((channel) => (
                  <div key={channel.id} className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {channel.channelType === "email" && <Mail className="w-8 h-8 text-blue-500" />}
                        {channel.channelType === "sms" && <Phone className="w-8 h-8 text-green-500" />}
                        {channel.channelType === "webhook" && <Webhook className="w-8 h-8 text-purple-500" />}
                        {channel.channelType === "push" && <Bell className="w-8 h-8 text-orange-500" />}
                        <div>
                          <p className="font-semibold capitalize">{channel.channelType}</p>
                          <p className="text-sm text-gray-500">{channel.destination}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className={`px-2 py-1 rounded text-xs ${channel.isEnabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                          {channel.isEnabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {channel.notifyOnIntrusion && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">Intrusions</span>
                      )}
                      {channel.notifyOnModeChange && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Mode Changes</span>
                      )}
                    </div>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <Bell className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">No notification channels configured</p>
                    <button
                      onClick={() => setShowAddNotification(true)}
                      className="mt-4 text-blue-600 hover:underline"
                    >
                      Add your first notification channel
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Events Section */}
          {activeSection === "events" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Security Event Log</h2>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {events.map((event) => (
                    <div key={event.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {event.severity === "critical" && <XCircle className="w-5 h-5 text-red-500" />}
                          {event.severity === "alert" && <AlertTriangle className="w-5 h-5 text-orange-500" />}
                          {event.severity === "warning" && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                          {event.severity === "info" && <CheckCircle className="w-5 h-5 text-blue-500" />}
                          <div>
                            <p className="font-medium">{event.description}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(event.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs capitalize ${getSeverityColor(event.severity)}`}>
                          {event.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                  {events.length === 0 && (
                    <div className="p-12 text-center">
                      <Activity className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">No security events recorded</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Settings Section */}
          {activeSection === "settings" && (
            <SecuritySettingsPanel />
          )}
        </div>
      </div>

      {/* Add Resident Modal */}
      {showAddResident && (
        <AddResidentModal onClose={() => setShowAddResident(false)} />
      )}

      {/* Add Device Modal */}
      {showAddDevice && selectedResidentId && (
        <AddDeviceModal
          residentId={selectedResidentId}
          onClose={() => {
            setShowAddDevice(false);
            setSelectedResidentId(null);
          }}
        />
      )}

      {/* Add Notification Modal */}
      {showAddNotification && (
        <AddNotificationModal onClose={() => setShowAddNotification(false)} />
      )}
    </div>
  );
}

// Resident Devices List Component
function ResidentDevicesList({ residentId }: { residentId: number }) {
  const { data: devices = [] } = useQuery<ResidentDevice[]>({
    queryKey: [`/api/security/residents/${residentId}/devices`],
    select: (data: any) => data.devices || [],
  });

  if (devices.length === 0) {
    return <p className="text-sm text-gray-400 mt-2">No devices registered</p>;
  }

  return (
    <div className="mt-2 space-y-2">
      {devices.map((device) => (
        <div key={device.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
          <div className="flex items-center space-x-2">
            <Smartphone className="w-4 h-4 text-gray-400" />
            <span className="text-sm">{device.deviceName}</span>
            {device.isPrimary && (
              <span className="px-1 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">Primary</span>
            )}
          </div>
          <span className="text-xs text-gray-400">{device.macAddress}</span>
        </div>
      ))}
    </div>
  );
}

// Add Resident Modal
function AddResidentModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("resident");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/security/residents", {
        method: "POST",
        body: JSON.stringify({ name, email, phone, role }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/security/residents"] });
      toast({ title: "Resident added" });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to add resident", variant: "destructive" });
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Add Resident</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="john@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="+1 (555) 123-4567"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="owner">Owner</option>
              <option value="resident">Resident</option>
              <option value="guest">Guest</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!name || mutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? "Adding..." : "Add Resident"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Add Device Modal
function AddDeviceModal({ residentId, onClose }: { residentId: number; onClose: () => void }) {
  const [macAddress, setMacAddress] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [deviceType, setDeviceType] = useState("phone");
  const [isPrimary, setIsPrimary] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/security/residents/${residentId}/devices`, {
        method: "POST",
        body: JSON.stringify({ macAddress, deviceName, deviceType, isPrimary }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/security/residents/${residentId}/devices`] });
      toast({ title: "Device registered" });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to register device", variant: "destructive" });
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Register Device</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Device Name *</label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="John's iPhone"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">MAC Address *</label>
            <input
              type="text"
              value={macAddress}
              onChange={(e) => setMacAddress(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="AA:BB:CC:DD:EE:FF"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Device Type</label>
            <select
              value={deviceType}
              onChange={(e) => setDeviceType(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="phone">Phone</option>
              <option value="watch">Watch</option>
              <option value="laptop">Laptop</option>
              <option value="tablet">Tablet</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isPrimary"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="isPrimary" className="text-sm">Primary device for presence detection</label>
          </div>
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!macAddress || !deviceName || mutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? "Registering..." : "Register Device"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Add Notification Modal
function AddNotificationModal({ onClose }: { onClose: () => void }) {
  const [channelType, setChannelType] = useState("email");
  const [destination, setDestination] = useState("");
  const [notifyOnIntrusion, setNotifyOnIntrusion] = useState(true);
  const [notifyOnModeChange, setNotifyOnModeChange] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/security/notifications", {
        method: "POST",
        body: JSON.stringify({ channelType, destination, notifyOnIntrusion, notifyOnModeChange }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/security/notifications"] });
      toast({ title: "Notification channel added" });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to add notification channel", variant: "destructive" });
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Add Notification Channel</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Channel Type</label>
            <select
              value={channelType}
              onChange={(e) => setChannelType(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="webhook">Webhook</option>
              <option value="push">Push Notification</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {channelType === "email" ? "Email Address" :
               channelType === "sms" ? "Phone Number" :
               channelType === "webhook" ? "Webhook URL" : "Device Token"} *
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder={
                channelType === "email" ? "alerts@example.com" :
                channelType === "sms" ? "+1 (555) 123-4567" :
                channelType === "webhook" ? "https://example.com/webhook" : "device-token"
              }
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium">Notify On:</label>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="notifyIntrusion"
                checked={notifyOnIntrusion}
                onChange={(e) => setNotifyOnIntrusion(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="notifyIntrusion" className="text-sm">Intrusion Alerts</label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="notifyModeChange"
                checked={notifyOnModeChange}
                onChange={(e) => setNotifyOnModeChange(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="notifyModeChange" className="text-sm">Mode Changes</label>
            </div>
          </div>
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!destination || mutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? "Adding..." : "Add Channel"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Security Settings Panel
function SecuritySettingsPanel() {
  const { data: settings } = useQuery({
    queryKey: ["/api/security/settings"],
    select: (data: any) => data.settings,
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [autoArmEnabled, setAutoArmEnabled] = useState(false);
  const [autoArmDelay, setAutoArmDelay] = useState(300);
  const [entryDelay, setEntryDelay] = useState(30);
  const [exitDelay, setExitDelay] = useState(60);

  useEffect(() => {
    if (settings) {
      setAutoArmEnabled(settings.autoArmEnabled || false);
      setAutoArmDelay(settings.autoArmDelay || 300);
      setEntryDelay(settings.entryDelay || 30);
      setExitDelay(settings.exitDelay || 60);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/security/settings", {
        method: "PUT",
        body: JSON.stringify({ autoArmEnabled, autoArmDelay, entryDelay, exitDelay }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/security/settings"] });
      toast({ title: "Settings saved" });
    },
    onError: () => {
      toast({ title: "Failed to save settings", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Security Settings</h2>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="font-medium">Auto-Arm When Everyone Leaves</label>
            <button
              onClick={() => setAutoArmEnabled(!autoArmEnabled)}
              className={`w-12 h-6 rounded-full transition-colors ${autoArmEnabled ? "bg-blue-600" : "bg-gray-300"}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${autoArmEnabled ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>
          <p className="text-sm text-gray-500">Automatically arm the system when all residents leave</p>
        </div>

        {autoArmEnabled && (
          <div>
            <label className="block text-sm font-medium mb-1">Auto-Arm Delay (seconds)</label>
            <input
              type="number"
              value={autoArmDelay}
              onChange={(e) => setAutoArmDelay(parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg"
              min={0}
              max={3600}
            />
            <p className="text-xs text-gray-500 mt-1">Wait time before auto-arming after everyone leaves</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Entry Delay (seconds)</label>
          <input
            type="number"
            value={entryDelay}
            onChange={(e) => setEntryDelay(parseInt(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg"
            min={0}
            max={300}
          />
          <p className="text-xs text-gray-500 mt-1">Time to disarm before alarm triggers</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Exit Delay (seconds)</label>
          <input
            type="number"
            value={exitDelay}
            onChange={(e) => setExitDelay(parseInt(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg"
            min={0}
            max={300}
          />
          <p className="text-xs text-gray-500 mt-1">Time to leave before system arms</p>
        </div>

        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {mutation.isPending ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
