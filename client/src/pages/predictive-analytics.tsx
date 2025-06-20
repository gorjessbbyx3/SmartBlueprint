import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Activity, AlertTriangle, Brain, TrendingUp, TrendingDown, CheckCircle, XCircle, Clock, Zap } from "lucide-react";
import { useState } from "react";

interface DeviceHealth {
  device_id: string;
  health_score: number;
  risk_level: string;
  predicted_failure_date: string | null;
  confidence: number;
  contributing_factors: string[];
  recommendations: string[];
  last_updated: string;
}

interface HealthSummary {
  total_devices: number;
  healthy_devices: number;
  at_risk_devices: number;
  critical_devices: number;
  average_health_score: number;
  devices_needing_attention: Array<{
    device_id: string;
    health_score: number;
    risk_level: string;
    predicted_failure: string | null;
  }>;
}

interface PredictiveInsight {
  type: string;
  severity: string;
  description: string;
  affected_devices: string[];
  predicted_impact: string;
  recommended_actions: string[];
  confidence: number;
  timestamp: string;
}

export default function PredictiveAnalyticsPage() {
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch health summary
  const { data: healthSummary, isLoading: summaryLoading } = useQuery<HealthSummary>({
    queryKey: ['/api/predictive/health-summary'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch predictive insights
  const { data: insights, isLoading: insightsLoading } = useQuery<PredictiveInsight[]>({
    queryKey: ['/api/predictive/insights'],
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch specific device health
  const { data: deviceHealth, isLoading: deviceLoading } = useQuery<DeviceHealth>({
    queryKey: ['/api/predictive/device-health', selectedDevice],
    enabled: !!selectedDevice,
  });

  // Run health assessment mutation
  const runAssessmentMutation = useMutation({
    mutationFn: () => apiRequest('/api/predictive/run-assessment', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/predictive/health-summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/predictive/insights'] });
    },
  });

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getHealthIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (score >= 60) return <Clock className="h-5 w-5 text-yellow-600" />;
    if (score >= 30) return <AlertTriangle className="h-5 w-5 text-orange-600" />;
    return <XCircle className="h-5 w-5 text-red-600" />;
  };

  if (summaryLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Brain className="h-12 w-12 mx-auto mb-4 text-blue-600 animate-pulse" />
            <p className="text-lg">Loading predictive analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Predictive Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">AI-powered device health monitoring and failure prediction</p>
        </div>
        <Button 
          onClick={() => runAssessmentMutation.mutate()}
          disabled={runAssessmentMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Brain className="mr-2 h-4 w-4" />
          {runAssessmentMutation.isPending ? 'Running Assessment...' : 'Run Health Assessment'}
        </Button>
      </div>

      {/* Health Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthSummary?.total_devices || 0}</div>
            <p className="text-xs text-muted-foreground">Under monitoring</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Healthy Devices</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{healthSummary?.healthy_devices || 0}</div>
            <p className="text-xs text-muted-foreground">Operating normally</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{healthSummary?.at_risk_devices || 0}</div>
            <p className="text-xs text-muted-foreground">Needs monitoring</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{healthSummary?.critical_devices || 0}</div>
            <p className="text-xs text-muted-foreground">Immediate attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Average Health Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Network Health Score
          </CardTitle>
          <CardDescription>Overall health of your network infrastructure</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Average Health Score</span>
              <span className="text-sm font-bold">{healthSummary?.average_health_score?.toFixed(1) || 0}%</span>
            </div>
            <Progress value={healthSummary?.average_health_score || 0} className="h-3" />
            <p className="text-xs text-muted-foreground">
              {(healthSummary?.average_health_score || 0) >= 80 ? 'Excellent' :
               (healthSummary?.average_health_score || 0) >= 60 ? 'Good' :
               (healthSummary?.average_health_score || 0) >= 40 ? 'Fair' : 'Poor'} network health
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Devices Needing Attention */}
      {healthSummary?.devices_needing_attention && healthSummary.devices_needing_attention.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Devices Needing Attention
            </CardTitle>
            <CardDescription>Devices with health issues requiring immediate action</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {healthSummary.devices_needing_attention.map((device) => (
                <div key={device.device_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getHealthIcon(device.health_score)}
                    <div>
                      <p className="font-medium">{device.device_id}</p>
                      <p className="text-sm text-muted-foreground">
                        Health Score: {device.health_score.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getRiskColor(device.risk_level)}>
                      {device.risk_level.toUpperCase()}
                    </Badge>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedDevice(device.device_id)}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Predictive Insights */}
      {insights && insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              Predictive Insights
            </CardTitle>
            <CardDescription>AI-generated predictions and recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.slice(0, 5).map((insight, index) => (
                <Alert key={index} className={
                  insight.severity === 'high' ? 'border-red-200 bg-red-50' :
                  insight.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                  'border-blue-200 bg-blue-50'
                }>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{insight.description}</p>
                        <Badge variant="outline">{insight.confidence.toFixed(0)}% confidence</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{insight.predicted_impact}</p>
                      {insight.recommended_actions.length > 0 && (
                        <div className="text-sm">
                          <p className="font-medium">Recommendations:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {insight.recommended_actions.map((action, actionIndex) => (
                              <li key={actionIndex}>{action}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Device Details Modal/Section */}
      {selectedDevice && deviceHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Device Health Details: {selectedDevice}</span>
              <Button variant="outline" onClick={() => setSelectedDevice(null)}>
                Close
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Health Score</label>
                  <div className="flex items-center gap-2 mt-1">
                    {getHealthIcon(deviceHealth.health_score)}
                    <span className="text-2xl font-bold">{deviceHealth.health_score.toFixed(1)}%</span>
                  </div>
                  <Progress value={deviceHealth.health_score} className="mt-2" />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Risk Level</label>
                  <Badge className={`mt-1 ${getRiskColor(deviceHealth.risk_level)}`}>
                    {deviceHealth.risk_level.toUpperCase()}
                  </Badge>
                </div>

                {deviceHealth.predicted_failure_date && (
                  <div>
                    <label className="text-sm font-medium">Predicted Failure</label>
                    <p className="text-sm text-red-600 mt-1">
                      {new Date(deviceHealth.predicted_failure_date).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Confidence: {(deviceHealth.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {deviceHealth.contributing_factors.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">Contributing Factors</label>
                    <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-1">
                      {deviceHealth.contributing_factors.map((factor, index) => (
                        <li key={index}>{factor}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {deviceHealth.recommendations.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">Recommendations</label>
                    <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-1">
                      {deviceHealth.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}