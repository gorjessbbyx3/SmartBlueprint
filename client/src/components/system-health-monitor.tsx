import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Wifi, 
  Brain, 
  Shield, 
  Zap,
  RefreshCw,
  Server,
  Database,
  Globe
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface SystemHealth {
  aiAgents: {
    totalAgents: number;
    activeAgents: number;
    lastUpdate: string;
    status: 'healthy' | 'warning' | 'critical';
  };
  networkScanning: {
    isActive: boolean;
    lastScan: string;
    devicesFound: number;
    status: 'healthy' | 'warning' | 'critical';
  };
  dataIntegrity: {
    validRecords: number;
    totalRecords: number;
    lastValidation: string;
    status: 'healthy' | 'warning' | 'critical';
  };
  cloudTunnel: {
    isConnected: boolean;
    agentsConnected: number;
    lastHeartbeat: string;
    status: 'healthy' | 'warning' | 'critical';
  };
}

export function SystemHealthMonitor() {
  const [refreshing, setRefreshing] = useState(false);

  const { data: healthData, refetch, isLoading } = useQuery({
    queryKey: ['/api/system/health'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      healthy: 'default',
      warning: 'secondary',
      critical: 'destructive'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const calculateOverallHealth = (health: SystemHealth): number => {
    const scores = [
      health.aiAgents.status === 'healthy' ? 100 : health.aiAgents.status === 'warning' ? 60 : 20,
      health.networkScanning.status === 'healthy' ? 100 : health.networkScanning.status === 'warning' ? 60 : 20,
      health.dataIntegrity.status === 'healthy' ? 100 : health.dataIntegrity.status === 'warning' ? 60 : 20,
      health.cloudTunnel.status === 'healthy' ? 100 : health.cloudTunnel.status === 'warning' ? 60 : 20,
    ];
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2 animate-pulse" />
            System Health Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading system status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Use real health data from API or show error if not available
  if (!healthData?.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            System Health Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8">
            <XCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold mb-2">Health Data Unavailable</h3>
            <p className="text-muted-foreground mb-4">
              Unable to retrieve system health information from the server.
            </p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const health = healthData.data;
  const overallHealth = calculateOverallHealth(health);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                System Health Monitor
              </CardTitle>
              <CardDescription>
                Real-time monitoring of all SmartBlueprint Pro components
              </CardDescription>
            </div>
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="sm"
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Overall Health Score */}
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">{overallHealth}%</div>
              <div className="text-sm text-muted-foreground mb-3">Overall System Health</div>
              <Progress value={overallHealth} className="w-full max-w-md mx-auto" />
            </div>

            <Separator />

            {/* Component Status Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* AI Agents */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Brain className="h-4 w-4 mr-2 text-blue-600" />
                      <CardTitle className="text-sm">AI Agents</CardTitle>
                    </div>
                    {getStatusBadge(health.aiAgents.status)}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Active Agents:</span>
                      <span className="font-medium">
                        {health.aiAgents.activeAgents}/{health.aiAgents.totalAgents}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Update:</span>
                      <span className="text-muted-foreground">{health.aiAgents.lastUpdate}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Network Scanning */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Wifi className="h-4 w-4 mr-2 text-green-600" />
                      <CardTitle className="text-sm">Network Scanning</CardTitle>
                    </div>
                    {getStatusBadge(health.networkScanning.status)}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className="font-medium">
                        {health.networkScanning.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Devices Found:</span>
                      <span className="text-muted-foreground">{health.networkScanning.devicesFound}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Scan:</span>
                      <span className="text-muted-foreground">{health.networkScanning.lastScan}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Data Integrity */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Shield className="h-4 w-4 mr-2 text-purple-600" />
                      <CardTitle className="text-sm">Data Integrity</CardTitle>
                    </div>
                    {getStatusBadge(health.dataIntegrity.status)}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Valid Records:</span>
                      <span className="font-medium">
                        {health.dataIntegrity.validRecords}/{health.dataIntegrity.totalRecords}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Check:</span>
                      <span className="text-muted-foreground">{health.dataIntegrity.lastValidation}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cloud Tunnel */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 mr-2 text-orange-600" />
                      <CardTitle className="text-sm">Cloud Tunnel</CardTitle>
                    </div>
                    {getStatusBadge(health.cloudTunnel.status)}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Connected:</span>
                      <span className="font-medium">
                        {health.cloudTunnel.isConnected ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Agents:</span>
                      <span className="text-muted-foreground">{health.cloudTunnel.agentsConnected}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Heartbeat:</span>
                      <span className="text-muted-foreground">{health.cloudTunnel.lastHeartbeat}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* System Recommendations */}
            {health.networkScanning.status !== 'healthy' && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                      Desktop Agent Required
                    </h4>
                    <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
                      Network scanning is inactive because no desktop agent is connected. 
                      The agent is required for real device discovery and WiFi signal analysis.
                    </p>
                    <Button size="sm" variant="outline" className="border-amber-300 text-amber-800">
                      Download Desktop Agent
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}