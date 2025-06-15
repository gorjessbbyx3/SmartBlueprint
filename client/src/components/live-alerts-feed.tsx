import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, AlertTriangle, Info, CheckCircle, X, Activity } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/use-websocket';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface MonitoringAlert {
  id: string;
  type: 'device_detection' | 'signal_anomaly' | 'device_offline' | 'network_change' | 'security_alert';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  deviceName?: string;
  deviceMac?: string;
  isResolved: boolean;
  metadata?: Record<string, any>;
}

interface LiveAlertsFeedProps {
  className?: string;
  maxAlerts?: number;
  showToastNotifications?: boolean;
  autoRefresh?: boolean;
}

function getSeverityIcon(severity: string) {
  switch (severity) {
    case 'critical':
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    case 'high':
      return <AlertTriangle className="h-4 w-4 text-orange-600" />;
    case 'medium':
      return <Info className="h-4 w-4 text-yellow-600" />;
    case 'low':
      return <Info className="h-4 w-4 text-blue-600" />;
    default:
      return <Bell className="h-4 w-4 text-gray-600" />;
  }
}

function getSeverityBadgeVariant(severity: string) {
  switch (severity) {
    case 'critical':
      return 'destructive';
    case 'high':
      return 'destructive';
    case 'medium':
      return 'secondary';
    case 'low':
      return 'outline';
    default:
      return 'outline';
  }
}

function formatTimeAgo(timestamp: Date | string): string {
  const now = new Date();
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return 'Unknown time';
  }
  
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function LiveAlertsFeed({ 
  className = '',
  maxAlerts = 20,
  showToastNotifications = true,
  autoRefresh = true
}: LiveAlertsFeedProps) {
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch monitoring alerts
  const { data: monitoringAlerts = [], refetch } = useQuery<MonitoringAlert[]>({
    queryKey: ['/api/monitoring/alerts'],
    refetchInterval: autoRefresh ? 15000 : false, // Refresh every 15 seconds
  });

  // WebSocket for real-time updates
  const { lastMessage } = useWebSocket('/ws');

  // Resolve alert mutation
  const resolveAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const response = await fetch(`/api/monitoring/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to resolve alert');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/monitoring/alerts'] });
      toast({
        title: "Alert Resolved",
        description: "The alert has been marked as resolved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to resolve alert. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Process real-time WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    try {
      if (lastMessage.type === 'monitoring_alert') {
        const newAlert: MonitoringAlert = {
          id: Date.now().toString(),
          type: lastMessage.data.type || 'device_detection',
          severity: lastMessage.data.severity || 'medium',
          title: lastMessage.data.title || 'New Alert',
          message: lastMessage.data.message || '',
          timestamp: new Date(),
          deviceName: lastMessage.data.deviceName,
          deviceMac: lastMessage.data.deviceMac,
          isResolved: false,
          metadata: lastMessage.data.metadata
        };

        setAlerts(prev => [newAlert, ...prev.slice(0, maxAlerts - 1)]);
        setUnreadCount(prev => prev + 1);

        // Show toast notification
        if (showToastNotifications) {
          toast({
            title: newAlert.title,
            description: newAlert.message,
            variant: newAlert.severity === 'critical' || newAlert.severity === 'high' ? 'destructive' : 'default',
          });
        }
      } else if (lastMessage.type === 'device_update') {
        // Create alert for device changes
        const deviceAlert: MonitoringAlert = {
          id: `device_${Date.now()}`,
          type: 'device_detection',
          severity: 'low',
          title: 'Device Status Update',
          message: `Device ${lastMessage.data.name} status changed`,
          timestamp: new Date(),
          deviceName: lastMessage.data.name,
          deviceMac: lastMessage.data.macAddress,
          isResolved: false
        };

        setAlerts(prev => [deviceAlert, ...prev.slice(0, maxAlerts - 1)]);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  }, [lastMessage, maxAlerts, showToastNotifications, toast]);

  // Update alerts from monitoring service
  useEffect(() => {
    if (monitoringAlerts.length > 0) {
      setAlerts(monitoringAlerts.slice(0, maxAlerts));
    }
  }, [monitoringAlerts, maxAlerts]);

  const handleResolveAlert = (alertId: string) => {
    resolveAlertMutation.mutate(alertId);
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, isResolved: true } : alert
    ));
  };

  const handleClearAll = () => {
    setAlerts([]);
    setUnreadCount(0);
  };

  const handleMarkAllRead = () => {
    setUnreadCount(0);
  };

  const activeAlerts = alerts.filter(alert => !alert.isResolved);
  const resolvedAlerts = alerts.filter(alert => alert.isResolved);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Live Alerts</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="px-2 py-1 text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
                Mark Read
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleClearAll}>
              Clear All
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No alerts to display</p>
            <p className="text-sm">System monitoring is active</p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {/* Active Alerts */}
              {activeAlerts.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Active Alerts ({activeAlerts.length})
                  </h4>
                  {activeAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border-l-4 border-l-blue-500"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {getSeverityIcon(alert.severity)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="text-sm font-medium text-gray-900">
                                {alert.title}
                              </h5>
                              <Badge variant={getSeverityBadgeVariant(alert.severity)} className="text-xs">
                                {alert.severity}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">
                              {alert.message}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>{formatTimeAgo(alert.timestamp)}</span>
                              {alert.deviceName && (
                                <span>Device: {alert.deviceName}</span>
                              )}
                              <span className="capitalize">Type: {alert.type.replace('_', ' ')}</span>
                            </div>
                          </div>
                          
                          <div className="flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResolveAlert(alert.id)}
                              disabled={resolveAlertMutation.isPending}
                              className="h-8 w-8 p-0"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Resolved Alerts */}
              {resolvedAlerts.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Resolved ({resolvedAlerts.length})
                  </h4>
                  {resolvedAlerts.slice(0, 5).map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border-l-4 border-l-green-500 opacity-75"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="text-sm font-medium text-gray-700">
                            {alert.title}
                          </h5>
                          <Badge variant="outline" className="text-xs">
                            Resolved
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {alert.message}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{formatTimeAgo(alert.timestamp)}</span>
                          {alert.deviceName && (
                            <span>Device: {alert.deviceName}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-lg font-bold text-red-600">
              {activeAlerts.filter(a => a.severity === 'critical' || a.severity === 'high').length}
            </div>
            <div className="text-xs text-gray-600">High Priority</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-yellow-600">
              {activeAlerts.filter(a => a.severity === 'medium').length}
            </div>
            <div className="text-xs text-gray-600">Medium Priority</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">
              {resolvedAlerts.length}
            </div>
            <div className="text-xs text-gray-600">Resolved</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}