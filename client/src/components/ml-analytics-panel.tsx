import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Brain, TrendingUp, AlertTriangle, Zap, Activity, Target } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface MLAnalysisResult {
  locationFingerprints: number;
  anomaliesDetected: number;
  maintenanceAlerts: number;
  analysis: {
    fingerprints: any[];
    anomalies: any[];
    maintenance: any[];
  };
}

interface MLAnalyticsPanelProps {
  onClose: () => void;
}

export default function MLAnalyticsPanel({ onClose }: MLAnalyticsPanelProps) {
  const [analysisResult, setAnalysisResult] = useState<MLAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTraining, setIsTraining] = useState(false);

  const runMLAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await apiRequest("/api/ml/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      setAnalysisResult(result);
    } catch (error) {
      console.error("ML analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const trainModels = async () => {
    setIsTraining(true);
    try {
      await apiRequest("/api/ml/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      // Re-run analysis after training
      await runMLAnalysis();
    } catch (error) {
      console.error("Model training failed:", error);
    } finally {
      setIsTraining(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getAnomalyIcon = (type: string) => {
    switch (type) {
      case 'signal_drop': return <TrendingUp className="h-4 w-4" />;
      case 'device_offline': return <AlertTriangle className="h-4 w-4" />;
      case 'performance_degradation': return <Activity className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold">ML Analytics Dashboard</h2>
            </div>
            <Button variant="ghost" onClick={onClose}>×</Button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            {/* Control Panel */}
            <Card>
              <CardHeader>
                <CardTitle>ML Operations</CardTitle>
                <CardDescription>
                  Run advanced analytics and train machine learning models
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button 
                    onClick={runMLAnalysis} 
                    disabled={isAnalyzing}
                    className="flex items-center gap-2"
                  >
                    <Brain className="h-4 w-4" />
                    {isAnalyzing ? "Analyzing..." : "Run ML Analysis"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={trainModels} 
                    disabled={isTraining}
                    className="flex items-center gap-2"
                  >
                    <Target className="h-4 w-4" />
                    {isTraining ? "Training..." : "Train Models"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Analysis Results */}
            {analysisResult && (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="fingerprints">Location Fingerprints</TabsTrigger>
                  <TabsTrigger value="anomalies">Anomaly Detection</TabsTrigger>
                  <TabsTrigger value="maintenance">Predictive Maintenance</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Location Fingerprints</CardTitle>
                        <Brain className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{analysisResult.locationFingerprints}</div>
                        <p className="text-xs text-muted-foreground">
                          Signal patterns mapped
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Anomalies Detected</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                          {analysisResult.anomaliesDetected}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Issues requiring attention
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Maintenance Alerts</CardTitle>
                        <Activity className="h-4 w-4 text-red-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                          {analysisResult.maintenanceAlerts}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Devices need attention
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="fingerprints" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Location Fingerprinting</CardTitle>
                      <CardDescription>
                        ML-generated signal patterns for precise device positioning
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analysisResult.analysis.fingerprints.map((fp, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Target className="h-4 w-4 text-blue-500" />
                              <div>
                                <div className="font-medium">
                                  Position ({fp.location.x}, {fp.location.y})
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Confidence: {(fp.confidence * 100).toFixed(1)}%
                                </div>
                              </div>
                            </div>
                            <Progress value={fp.confidence * 100} className="w-20" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="anomalies" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Anomaly Detection</CardTitle>
                      <CardDescription>
                        AI-powered detection of unusual device behavior and signal patterns
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analysisResult.analysis.anomalies.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            No anomalies detected. All devices operating normally.
                          </div>
                        ) : (
                          analysisResult.analysis.anomalies.map((anomaly, index) => (
                            <Alert key={index}>
                              <div className="flex items-start gap-3">
                                {getAnomalyIcon(anomaly.anomalyType)}
                                <div className="flex-1">
                                  <AlertTitle className="flex items-center gap-2">
                                    Device {anomaly.deviceId}
                                    <Badge variant={getSeverityColor(anomaly.severity)}>
                                      {anomaly.severity}
                                    </Badge>
                                  </AlertTitle>
                                  <AlertDescription className="mt-2">
                                    <div>{anomaly.description}</div>
                                    {anomaly.recommendedAction && (
                                      <div className="mt-2 text-sm font-medium">
                                        Recommended: {anomaly.recommendedAction}
                                      </div>
                                    )}
                                    <div className="mt-2 text-sm text-muted-foreground">
                                      Confidence: {(anomaly.confidence * 100).toFixed(1)}%
                                    </div>
                                  </AlertDescription>
                                </div>
                              </div>
                            </Alert>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="maintenance" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Predictive Maintenance</CardTitle>
                      <CardDescription>
                        AI predictions for device failures and maintenance needs
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analysisResult.analysis.maintenance.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            No maintenance alerts. All devices in good health.
                          </div>
                        ) : (
                          analysisResult.analysis.maintenance.map((maintenance, index) => (
                            <div key={index} className="p-4 border rounded-lg space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Activity className="h-5 w-5 text-orange-500" />
                                  <div>
                                    <div className="font-medium">Device {maintenance.deviceId}</div>
                                    <div className="text-sm text-muted-foreground">
                                      Priority Score: {maintenance.priorityScore.toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                                <Badge variant={
                                  maintenance.failureProbability > 0.7 ? 'destructive' : 
                                  maintenance.failureProbability > 0.4 ? 'default' : 'secondary'
                                }>
                                  {(maintenance.failureProbability * 100).toFixed(1)}% risk
                                </Badge>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>Failure Probability</span>
                                  <span>{(maintenance.failureProbability * 100).toFixed(1)}%</span>
                                </div>
                                <Progress value={maintenance.failureProbability * 100} />
                              </div>
                              
                              <div className="text-sm">
                                <div className="font-medium">Estimated Time to Failure:</div>
                                <div className="text-muted-foreground">
                                  {maintenance.timeToFailure} days
                                </div>
                              </div>
                              
                              <div className="text-sm">
                                <div className="font-medium">Recommended Action:</div>
                                <div className="text-muted-foreground">
                                  {maintenance.maintenanceRecommendation}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}

            {!analysisResult && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">ML Analytics Ready</h3>
                    <p className="text-muted-foreground mb-4">
                      Run advanced machine learning analysis to get insights about your smart home devices
                    </p>
                    <Button onClick={runMLAnalysis} className="flex items-center gap-2 mx-auto">
                      <Brain className="h-4 w-4" />
                      Start Analysis
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}