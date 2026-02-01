import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Link } from 'wouter';
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  Clock,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ArrowLeft,
  RefreshCw,
  UserCheck,
  UserX,
  Bell,
  Download,
  Calendar,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Wifi
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface SecurityEvent {
  id: number;
  eventType: string;
  severity: string;
  description: string;
  deviceMac?: string;
  residentId?: number;
  resolved: boolean;
  timestamp: string;
  metadata?: any;
}

export default function SecurityAnalyticsPage() {
  const [timeRange, setTimeRange] = useState('24h');
  const [eventFilter, setEventFilter] = useState('all');

  // Fetch security events
  const { data: securityEvents = [], isLoading: eventsLoading, refetch: refetchEvents } = useQuery<SecurityEvent[]>({
    queryKey: ['/api/security/events', timeRange],
    refetchInterval: 30000
  });

  // Fetch security status
  const { data: securityStatus } = useQuery({
    queryKey: ['/api/security/status'],
    refetchInterval: 10000
  });

  // Fetch residents
  const { data: residents = [] } = useQuery<any[]>({
    queryKey: ['/api/security/residents']
  });

  // Fetch trusted devices
  const { data: trustedDevices = [] } = useQuery<any[]>({
    queryKey: ['/api/security/resident-devices']
  });

  // Calculate statistics
  const eventsByType = {
    intrusion_alert: securityEvents.filter(e => e.eventType === 'intrusion_alert').length,
    mode_change: securityEvents.filter(e => e.eventType === 'mode_change').length,
    device_registered: securityEvents.filter(e => e.eventType === 'device_registered').length,
    resident_arrival: securityEvents.filter(e => e.eventType === 'resident_arrival').length,
    resident_departure: securityEvents.filter(e => e.eventType === 'resident_departure').length,
    unknown_device: securityEvents.filter(e => e.eventType === 'unknown_device').length,
  };

  const unresolvedAlerts = securityEvents.filter(e =>
    e.severity === 'critical' && !e.resolved
  ).length;

  const filteredEvents = securityEvents.filter(e => {
    if (eventFilter === 'all') return true;
    if (eventFilter === 'alerts') return e.severity === 'critical' || e.severity === 'high';
    if (eventFilter === 'activity') return e.eventType.includes('arrival') || e.eventType.includes('departure');
    return e.eventType === eventFilter;
  });

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'intrusion_alert': return <ShieldX className="h-4 w-4 text-red-600" />;
      case 'mode_change': return <Shield className="h-4 w-4 text-blue-600" />;
      case 'device_registered': return <ShieldCheck className="h-4 w-4 text-green-600" />;
      case 'resident_arrival': return <UserCheck className="h-4 w-4 text-green-600" />;
      case 'resident_departure': return <UserX className="h-4 w-4 text-amber-600" />;
      case 'unknown_device': return <ShieldAlert className="h-4 w-4 text-amber-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'high': return <Badge className="bg-orange-100 text-orange-800">High</Badge>;
      case 'medium': return <Badge className="bg-amber-100 text-amber-800">Medium</Badge>;
      case 'low': return <Badge className="bg-blue-100 text-blue-800">Low</Badge>;
      default: return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const formatEventType = (type: string) => {
    return type.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const exportEvents = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      timeRange,
      totalEvents: securityEvents.length,
      events: securityEvents
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-events-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Security Dashboard
                </Button>
              </Link>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                  Security Analytics
                </h1>
                <p className="text-sm text-muted-foreground">
                  Event history, trends, and security insights
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetchEvents()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={exportEvents}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6 space-y-6">
        {/* Alert Banner */}
        {unresolvedAlerts > 0 && (
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Unresolved Alerts</AlertTitle>
            <AlertDescription>
              You have {unresolvedAlerts} unresolved critical alert(s) that require attention.
            </AlertDescription>
          </Alert>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium">Total Events</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{securityEvents.length}</div>
              <p className="text-xs text-muted-foreground">Last {timeRange}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium">Intrusion Alerts</CardTitle>
              <ShieldX className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{eventsByType.intrusion_alert}</div>
              <p className="text-xs text-muted-foreground">Security incidents</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium">Unknown Devices</CardTitle>
              <ShieldAlert className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{eventsByType.unknown_device}</div>
              <p className="text-xs text-muted-foreground">Need review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium">Arrivals</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{eventsByType.resident_arrival}</div>
              <p className="text-xs text-muted-foreground">Residents detected</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium">Departures</CardTitle>
              <UserX className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{eventsByType.resident_departure}</div>
              <p className="text-xs text-muted-foreground">Residents left</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium">Trusted Devices</CardTitle>
              <ShieldCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{trustedDevices.length}</div>
              <p className="text-xs text-muted-foreground">Registered</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Event Timeline */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Event Timeline
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={timeRange} onValueChange={setTimeRange}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1h">Last Hour</SelectItem>
                        <SelectItem value="24h">Last 24 Hours</SelectItem>
                        <SelectItem value="7d">Last 7 Days</SelectItem>
                        <SelectItem value="30d">Last 30 Days</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={eventFilter} onValueChange={setEventFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Events</SelectItem>
                        <SelectItem value="alerts">Alerts Only</SelectItem>
                        <SelectItem value="activity">Activity</SelectItem>
                        <SelectItem value="intrusion_alert">Intrusions</SelectItem>
                        <SelectItem value="mode_change">Mode Changes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {eventsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-500">Loading events...</span>
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-600">No Events Found</h3>
                    <p className="text-sm text-gray-500">
                      No security events match your current filters.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredEvents.slice(0, 50).map((event) => (
                      <div
                        key={event.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border ${
                          event.severity === 'critical' && !event.resolved
                            ? 'bg-red-50 border-red-200'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="mt-1">
                          {getEventIcon(event.eventType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              {formatEventType(event.eventType)}
                            </span>
                            {getSeverityBadge(event.severity)}
                            {event.resolved && (
                              <Badge variant="outline" className="text-green-600 border-green-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Resolved
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(event.timestamp).toLocaleString()}
                            </span>
                            {event.deviceMac && (
                              <span className="flex items-center gap-1">
                                <Wifi className="h-3 w-3" />
                                {event.deviceMac}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Stats */}
          <div className="space-y-4">
            {/* Current Security Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Current Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Security Mode</span>
                  <Badge className={
                    (securityStatus as any)?.currentMode === 'disarmed' ? 'bg-gray-100 text-gray-800' :
                    (securityStatus as any)?.currentMode === 'armed_home' ? 'bg-blue-100 text-blue-800' :
                    (securityStatus as any)?.currentMode === 'armed_away' ? 'bg-orange-100 text-orange-800' :
                    'bg-purple-100 text-purple-800'
                  }>
                    {((securityStatus as any)?.currentMode || 'unknown').replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm">Residents</span>
                  <span className="font-medium">{residents.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Trusted Devices</span>
                  <span className="font-medium">{trustedDevices.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Unresolved Alerts</span>
                  <Badge variant={unresolvedAlerts > 0 ? 'destructive' : 'outline'}>
                    {unresolvedAlerts}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Event Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Event Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(eventsByType).map(([type, count]) => (
                  <div key={type} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {getEventIcon(type)}
                      <span className="text-xs capitalize">
                        {type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/devices">
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Manage Devices
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <Shield className="h-4 w-4 mr-2" />
                    Security Dashboard
                  </Button>
                </Link>
                <Link href="/network">
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <Wifi className="h-4 w-4 mr-2" />
                    Network View
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Insights Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Security Insights
            </CardTitle>
            <CardDescription>
              AI-powered analysis of your home security patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">System Health</h4>
                <p className="text-sm text-green-700">
                  {trustedDevices.length > 0
                    ? `${trustedDevices.length} devices registered. Your security system is properly configured.`
                    : 'No trusted devices registered yet. Add your family devices to improve detection accuracy.'}
                </p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Activity Pattern</h4>
                <p className="text-sm text-blue-700">
                  {eventsByType.resident_arrival + eventsByType.resident_departure > 0
                    ? `${eventsByType.resident_arrival + eventsByType.resident_departure} presence events detected in the last ${timeRange}.`
                    : 'No presence activity detected recently. System is monitoring for changes.'}
                </p>
              </div>
              <div className={`p-4 rounded-lg ${eventsByType.intrusion_alert > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                <h4 className={`font-semibold mb-2 ${eventsByType.intrusion_alert > 0 ? 'text-red-800' : 'text-gray-800'}`}>
                  Threat Assessment
                </h4>
                <p className={`text-sm ${eventsByType.intrusion_alert > 0 ? 'text-red-700' : 'text-gray-700'}`}>
                  {eventsByType.intrusion_alert > 0
                    ? `${eventsByType.intrusion_alert} intrusion alert(s) recorded. Review events for details.`
                    : 'No threats detected. Your home is secure.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
