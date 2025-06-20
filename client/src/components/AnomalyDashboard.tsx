import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Shield, Activity, TrendingUp, RefreshCw, Zap } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface AnomalyData {
  deviceId: number;
  macAddress: string;
  deviceName: string;
  deviceType: string;
  rssiAnomaly: {
    isAnomaly: boolean;
    anomalyScore: number;
    confidence: number;
    modelUsed: string;
  };
  deviceAnomaly: {
    isAnomaly: boolean;
    anomalyScore: number;
    confidence: number;
    modelUsed: string;
  };
  temporalAnomaly: {
    isAnomaly: boolean;
    anomalyScore: number;
    confidence: number;
    modelUsed: string;
  };
  predictiveAnomaly: {
    isAnomaly: boolean;
    anomalyScore: number;
    confidence: number;
    modelUsed: string;
  };
  overallRisk: number;
  criticalityLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  lastUpdated: string;
}

interface SystemMetrics {
  totalDevices: number;
  activeAnomalies: number;
  criticalDevices: number;
  systemHealth: number;
  mlModelsActive: number;
  detectionAccuracy: number;
}

export function AnomalyDashboard() {
  const queryClient = useQueryClient();
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds

  const { data: anomalies = [], isLoading: anomaliesLoading } = useQuery<AnomalyData[]>({
    queryKey: ['/api/ml/anomalies'],
    refetchInterval: refreshInterval,
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery<SystemMetrics>({
    queryKey: ['/api/ml/system-metrics'],
    refetchInterval: refreshInterval,
  });

  const getCriticalityColor = (level: string) => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getCriticalityIcon = (level: string) => {
    switch (level) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <Activity className="h-4 w-4" />;
      case 'low': return <Shield className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const formatConfidence = (confidence: number) => {
    return `${Math.round(confidence * 100)}%`;
  };

  const formatRiskScore = (score: number) => {
    return `${Math.round(score * 100)}%`;
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/ml/anomalies'] });
    queryClient.invalidateQueries({ queryKey: ['/api/ml/system-metrics'] });
  };

  if (anomaliesLoading || metricsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading anomaly detection data...</span>
      </div>
    );
  }

  const criticalAnomalies = anomalies.filter(a => a.criticalityLevel === 'critical');
  const highAnomalies = anomalies.filter(a => a.criticalityLevel === 'high');
  const activeAnomalies = anomalies.filter(a => 
    a.rssiAnomaly.isAnomaly || a.deviceAnomaly.isAnomaly || 
    a.temporalAnomaly.isAnomaly || a.predictiveAnomaly.isAnomaly
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AI Anomaly Detection</h2>
          <p className="text-muted-foreground">
            Real-time intelligent monitoring with predictive failure analysis
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* System Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalDevices || 0}</div>
            <p className="text-xs text-muted-foreground">
              Monitored by ML systems
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Anomalies</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {activeAnomalies.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Requires attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Devices</CardTitle>
            <Zap className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {criticalAnomalies.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Immediate action needed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {formatRiskScore(metrics?.systemHealth || 0.95)}
            </div>
            <p className="text-xs text-muted-foreground">
              ML detection accuracy
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts */}
      {criticalAnomalies.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Critical Anomalies Detected</AlertTitle>
          <AlertDescription>
            {criticalAnomalies.length} device{criticalAnomalies.length > 1 ? 's' : ''} require immediate attention.
            Check the detailed analysis below for recommended actions.
          </AlertDescription>
        </Alert>
      )}

      {/* Detailed Analysis Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Anomalies ({activeAnomalies.length})</TabsTrigger>
          <TabsTrigger value="all">All Devices ({anomalies.length})</TabsTrigger>
          <TabsTrigger value="predictive">Predictive Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeAnomalies.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Shield className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold">No Active Anomalies</h3>
                  <p className="text-muted-foreground">All devices are operating normally</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activeAnomalies.map((anomaly) => (
                <Card key={anomaly.macAddress} className="border-l-4 border-l-orange-500">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {getCriticalityIcon(anomaly.criticalityLevel)}
                          {anomaly.deviceName}
                          <Badge variant={getCriticalityColor(anomaly.criticalityLevel)}>
                            {anomaly.criticalityLevel.toUpperCase()}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          {anomaly.deviceType} • {anomaly.macAddress}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-orange-500">
                          {formatRiskScore(anomaly.overallRisk)}
                        </div>
                        <p className="text-xs text-muted-foreground">Risk Score</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Anomaly Types */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {anomaly.rssiAnomaly.isAnomaly && (
                          <div className="text-center">
                            <div className="text-sm font-medium">Signal Anomaly</div>
                            <div className="text-xs text-muted-foreground">
                              {formatConfidence(anomaly.rssiAnomaly.confidence)}
                            </div>
                            <Progress 
                              value={anomaly.rssiAnomaly.anomalyScore * 100} 
                              className="mt-1"
                            />
                          </div>
                        )}
                        {anomaly.deviceAnomaly.isAnomaly && (
                          <div className="text-center">
                            <div className="text-sm font-medium">Device Anomaly</div>
                            <div className="text-xs text-muted-foreground">
                              {formatConfidence(anomaly.deviceAnomaly.confidence)}
                            </div>
                            <Progress 
                              value={anomaly.deviceAnomaly.anomalyScore * 100} 
                              className="mt-1"
                            />
                          </div>
                        )}
                        {anomaly.temporalAnomaly.isAnomaly && (
                          <div className="text-center">
                            <div className="text-sm font-medium">Pattern Anomaly</div>
                            <div className="text-xs text-muted-foreground">
                              {formatConfidence(anomaly.temporalAnomaly.confidence)}
                            </div>
                            <Progress 
                              value={anomaly.temporalAnomaly.anomalyScore * 100} 
                              className="mt-1"
                            />
                          </div>
                        )}
                        {anomaly.predictiveAnomaly.isAnomaly && (
                          <div className="text-center">
                            <div className="text-sm font-medium">Failure Risk</div>
                            <div className="text-xs text-muted-foreground">
                              {formatConfidence(anomaly.predictiveAnomaly.confidence)}
                            </div>
                            <Progress 
                              value={anomaly.predictiveAnomaly.anomalyScore * 100} 
                              className="mt-1"
                            />
                          </div>
                        )}
                      </div>

                      {/* Recommendations */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">AI Recommendations</h4>
                        <div className="space-y-1">
                          {anomaly.recommendations.map((rec, index) => (
                            <div key={index} className="text-sm bg-muted p-2 rounded">
                              {rec}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <div className="grid gap-4">
            {anomalies.map((device) => (
              <Card key={device.macAddress}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {getCriticalityIcon(device.criticalityLevel)}
                        {device.deviceName}
                        <Badge variant={getCriticalityColor(device.criticalityLevel)}>
                          {device.criticalityLevel.toUpperCase()}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {device.deviceType} • {device.macAddress}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">
                        {formatRiskScore(device.overallRisk)}
                      </div>
                      <p className="text-xs text-muted-foreground">Risk Score</p>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="predictive" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Predictive Failure Analysis</CardTitle>
              <CardDescription>
                AI-powered predictions for device maintenance and failure prevention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {anomalies
                  .filter(a => a.predictiveAnomaly.isAnomaly)
                  .map((device) => (
                    <div key={device.macAddress} className="border rounded p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{device.deviceName}</span>
                        <Badge variant="secondary">
                          {formatConfidence(device.predictiveAnomaly.confidence)} confidence
                        </Badge>
                      </div>
                      <Progress 
                        value={device.predictiveAnomaly.anomalyScore * 100} 
                        className="mb-2"
                      />
                      <p className="text-sm text-muted-foreground">
                        Model: {device.predictiveAnomaly.modelUsed}
                      </p>
                    </div>
                  ))}
                {anomalies.filter(a => a.predictiveAnomaly.isAnomaly).length === 0 && (
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <h3 className="text-lg font-semibold">No Failure Risks Detected</h3>
                    <p className="text-muted-foreground">
                      All devices show healthy operational patterns
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}