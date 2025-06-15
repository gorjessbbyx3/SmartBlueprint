import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, Pause, AlertTriangle, CheckCircle, Activity, Shield } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface MonitoringAlert {
  id: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  deviceId?: number;
  message: string;
  details: string;
  recommendedAction: string;
  isResolved: boolean;
}

interface EnvironmentMetrics {
  timestamp: string;
  totalDevices: number;
  onlineDevices: number;
  averageSignalStrength: number;
  networkHealth: number;
  anomalyCount: number;
  criticalAlerts: number;
  environmentalFactors: {
    interferenceLevel: number;
    timeOfDay: string;
    networkLoad: number;
  };
}

interface MonitoringStatus {
  isActive: boolean;
  activeAlerts: number;
  criticalAlerts: number;
  environmentMetrics: EnvironmentMetrics | null;
  lastUpdate: string;
}

export default function MonitoringDashboard() {
  const [realTimeAlerts, setRealTimeAlerts] = useState<MonitoringAlert[]>([]);
  const queryClient = useQueryClient();

  // Query monitoring status
  const { data: status } = useQuery<MonitoringStatus>({
    queryKey: ['/api/monitoring/status'],
    refetchInterval: 5000 // Update every 5 seconds
  });

  // Query active alerts
  const { data: alerts = [] } = useQuery<MonitoringAlert[]>({
    queryKey: ['/api/monitoring/alerts'],
    refetchInterval: 10000 // Update every 10 seconds
  });

  // Query environment data
  const { data: environmentData } = useQuery({
    queryKey: ['/api/monitoring/environment'],
    refetchInterval: 30000 // Update every 30 seconds
  });

  // Start monitoring mutation
  const startMonitoring = useMutation({
    mutationFn: () => apiRequest('/api/monitoring/start', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/monitoring/status'] });
    }
  });

  // Stop monitoring mutation
  const stopMonitoring = useMutation({
    mutationFn: () => apiRequest('/api/monitoring/stop', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/monitoring/status'] });
    }
  });

  // Resolve alert mutation
  const resolveAlert = useMutation({
    mutationFn: (alertId: string) => 
      apiRequest(`/api/monitoring/alerts/${alertId}/resolve`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/monitoring/alerts'] });
    }
  });

  // WebSocket connection for real-time alerts
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'alert') {
          setRealTimeAlerts(prev => [message.data, ...prev.slice(0, 9)]);
          
          // Show browser notification for critical alerts
          if (message.data.severity === 'critical' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
              new Notification(`Critical Alert: ${message.data.message}`, {
                body: message.data.details,
                icon: '/favicon.ico'
              });
            }
          }
        } else if (message.type === 'monitoring_status') {
          queryClient.invalidateQueries({ queryKey: ['/api/monitoring/status'] });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    return () => socket.close();
  }, [queryClient]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="w-4 h-4" />;
      case 'medium':
        return <Activity className="w-4 h-4" />;
      case 'low':
        return <Shield className="w-4 h-4" />;
      default:
        return <CheckCircle className="w-4 h-4" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">24/7 AI Environment Monitoring</h2>
          <p className="text-muted-foreground">
            Continuous monitoring and anomaly detection for smart home devices
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {status?.isActive ? (
            <Button 
              onClick={() => stopMonitoring.mutate()}
              disabled={stopMonitoring.isPending}
              variant="outline"
              size="sm"
            >
              <Pause className="w-4 h-4 mr-2" />
              Stop Monitoring
            </Button>
          ) : (
            <Button 
              onClick={() => startMonitoring.mutate()}
              disabled={startMonitoring.isPending}
              size="sm"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Monitoring
            </Button>
          )}
          
          <Badge variant={status?.isActive ? 'default' : 'secondary'}>
            {status?.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status?.environmentMetrics?.networkHealth?.toFixed(1) || 0}%
            </div>
            <Progress 
              value={status?.environmentMetrics?.networkHealth || 0} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.activeAlerts || 0}</div>
            <p className="text-xs text-muted-foreground">
              {status?.criticalAlerts || 0} critical
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online Devices</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status?.environmentMetrics?.onlineDevices || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              of {status?.environmentMetrics?.totalDevices || 0} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Signal Strength</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status?.environmentMetrics?.averageSignalStrength?.toFixed(0) || 0} dBm
            </div>
            <p className="text-xs text-muted-foreground">
              {status?.environmentMetrics?.environmentalFactors?.timeOfDay || 'unknown'} conditions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Alerts */}
      {realTimeAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Real-time Alerts</CardTitle>
            <CardDescription>Live notifications from the monitoring system</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {realTimeAlerts.map((alert, index) => (
                  <Alert key={`realtime-${index}`} className="border-l-4 border-l-orange-500">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        {getSeverityIcon(alert.severity)}
                        <div>
                          <div className="font-medium">{alert.message}</div>
                          <div className="text-sm text-muted-foreground">{alert.details}</div>
                        </div>
                      </div>
                      <Badge variant={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                    </div>
                  </Alert>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Active Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Active Alerts</CardTitle>
          <CardDescription>Current anomalies requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p>No active alerts. System running normally.</p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div key={alert.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(alert.severity)}
                        <h4 className="font-medium">{alert.message}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatTimestamp(alert.timestamp)}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3">{alert.details}</p>
                    
                    <div className="bg-muted/50 rounded p-3 mb-3">
                      <p className="text-sm">
                        <strong>Recommended Action:</strong> {alert.recommendedAction}
                      </p>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Type: {alert.type.replace('_', ' ')}
                        {alert.deviceId && ` • Device ID: ${alert.deviceId}`}
                      </span>
                      
                      <Button
                        onClick={() => resolveAlert.mutate(alert.id)}
                        disabled={resolveAlert.isPending}
                        variant="outline"
                        size="sm"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Resolve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Environment Metrics */}
      {status?.environmentMetrics && (
        <Card>
          <CardHeader>
            <CardTitle>Environment Analysis</CardTitle>
            <CardDescription>Current environmental conditions and factors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-medium mb-2">Interference Level</h4>
                <Progress 
                  value={status.environmentMetrics.environmentalFactors.interferenceLevel} 
                  className="mb-1"
                />
                <p className="text-sm text-muted-foreground">
                  {status.environmentMetrics.environmentalFactors.interferenceLevel.toFixed(1)}%
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Network Load</h4>
                <Progress 
                  value={status.environmentMetrics.environmentalFactors.networkLoad} 
                  className="mb-1"
                />
                <p className="text-sm text-muted-foreground">
                  {status.environmentMetrics.environmentalFactors.networkLoad.toFixed(1)}%
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Time Context</h4>
                <Badge variant="outline" className="text-sm">
                  {status.environmentMetrics.environmentalFactors.timeOfDay}
                </Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  {status.environmentMetrics.anomalyCount} anomalies detected
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monitoring Info */}
      <Card>
        <CardHeader>
          <CardTitle>About 24/7 Monitoring</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium mb-1">Real-time Analysis</h4>
              <p className="text-muted-foreground">
                Continuously scans devices every 30 seconds, collecting telemetry data every 15 seconds, 
                and performing ML anomaly detection every minute.
              </p>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-medium mb-1">Alert Types</h4>
              <ul className="text-muted-foreground space-y-1">
                <li>• Device Offline - Devices that stop responding</li>
                <li>• Signal Degradation - Significant RSSI drops</li>
                <li>• Network Anomaly - Unusual network patterns</li>
                <li>• Performance Issue - Device health decline</li>
                <li>• Security Threat - Unauthorized device detection</li>
              </ul>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-medium mb-1">AI Features</h4>
              <ul className="text-muted-foreground space-y-1">
                <li>• LSTM autoencoder anomaly detection (89% accuracy)</li>
                <li>• Adaptive threshold learning</li>
                <li>• Environmental context analysis</li>
                <li>• Predictive maintenance alerts</li>
                <li>• Behavioral baseline analysis</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}