import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface FailurePrediction {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  failureProbability: number;
  timeToFailure: number;
  failureType: 'hardware' | 'software' | 'battery' | 'connectivity' | 'performance';
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  contributingFactors: string[];
  recommendedActions: string[];
  estimatedCost: number;
  urgency: number;
  lastUpdated: string;
}

interface MaintenanceSchedule {
  scheduleId: string;
  deviceId: string;
  deviceName: string;
  maintenanceType: 'preventive' | 'corrective' | 'emergency' | 'routine';
  scheduledDate: string;
  estimatedDuration: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  requiredParts: string[];
  estimatedCost: number;
  assignedTechnician?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'postponed' | 'cancelled';
  notes?: string;
  completedDate?: string;
}

interface DeviceHealthMetrics {
  deviceId: string;
  currentHealth: number;
  degradationRate: number;
  performanceScore: number;
  signalStability: number;
  connectionQuality: number;
  batteryLevel?: number;
  temperature?: number;
  lastMaintenance?: string;
  operatingHours: number;
  errorCount: number;
  restartCount: number;
  timestamp: string;
}

export default function PredictiveMaintenance() {
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'predictions' | 'schedule' | 'health'>('predictions');
  const queryClient = useQueryClient();

  // Fetch failure predictions
  const { data: predictionsData, isLoading: predictionsLoading } = useQuery({
    queryKey: ['/api/maintenance/predictions'],
    refetchInterval: 30000
  });

  // Fetch maintenance schedule
  const { data: scheduleData, isLoading: scheduleLoading } = useQuery({
    queryKey: ['/api/maintenance/schedule'],
    refetchInterval: 30000
  });

  // Fetch device health for selected device
  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ['/api/maintenance/device', selectedDevice, 'health'],
    enabled: !!selectedDevice,
    refetchInterval: 60000
  });

  // Update maintenance status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ scheduleId, status, notes }: { scheduleId: string; status: string; notes?: string }) => {
      const response = await fetch(`/api/maintenance/schedule/${scheduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes })
      });
      if (!response.ok) throw new Error('Update failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance/schedule'] });
    }
  });

  // Schedule emergency maintenance mutation
  const emergencyMutation = useMutation({
    mutationFn: async ({ deviceId, reason, urgency }: { deviceId: string; reason: string; urgency: number }) => {
      const response = await fetch(`/api/maintenance/emergency/${deviceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, urgency })
      });
      if (!response.ok) throw new Error('Emergency scheduling failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance/schedule'] });
    }
  });

  const predictions: FailurePrediction[] = (predictionsData as any)?.predictions || [];
  const schedule: MaintenanceSchedule[] = (scheduleData as any)?.schedule || [];
  const deviceHealth: DeviceHealthMetrics | null = (healthData as any)?.healthStatus || null;

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-600';
      case 'medium': return 'bg-yellow-600';
      default: return 'bg-green-600';
    }
  };

  const getHealthColor = (health: number) => {
    if (health >= 0.8) return 'text-green-600';
    if (health >= 0.6) return 'text-yellow-600';
    if (health >= 0.4) return 'text-orange-600';
    return 'text-red-600';
  };

  const getFailureTypeIcon = (type: string) => {
    switch (type) {
      case 'hardware': return 'fas fa-microchip';
      case 'software': return 'fas fa-code';
      case 'battery': return 'fas fa-battery-quarter';
      case 'connectivity': return 'fas fa-wifi';
      case 'performance': return 'fas fa-tachometer-alt';
      default: return 'fas fa-exclamation-triangle';
    }
  };

  const formatTimeToFailure = (days: number) => {
    if (days <= 1) return 'Critical - <1 day';
    if (days <= 7) return `${Math.round(days)} days`;
    if (days <= 30) return `${Math.round(days / 7)} weeks`;
    if (days <= 365) return `${Math.round(days / 30)} months`;
    return '1+ years';
  };

  const criticalPredictions = predictions.filter(p => p.riskLevel === 'critical').length;
  const highRiskPredictions = predictions.filter(p => p.riskLevel === 'high').length;
  const pendingMaintenance = schedule.filter(s => s.status === 'scheduled').length;
  const overdueMaintenance = schedule.filter(s => 
    s.status === 'scheduled' && new Date(s.scheduledDate) < new Date()
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Predictive Maintenance AI</h1>
            <p className="text-gray-600">Machine learning-powered failure prediction and maintenance scheduling</p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant={viewMode === 'predictions' ? 'default' : 'outline'}
              onClick={() => setViewMode('predictions')}
              size="sm"
            >
              <i className="fas fa-chart-line mr-2"></i>
              Predictions
            </Button>
            <Button
              variant={viewMode === 'schedule' ? 'default' : 'outline'}
              onClick={() => setViewMode('schedule')}
              size="sm"
            >
              <i className="fas fa-calendar mr-2"></i>
              Schedule
            </Button>
            <Button
              variant={viewMode === 'health' ? 'default' : 'outline'}
              onClick={() => setViewMode('health')}
              size="sm"
            >
              <i className="fas fa-heartbeat mr-2"></i>
              Health
            </Button>
          </div>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Critical Risks</p>
                  <p className="text-2xl font-bold text-red-600">{criticalPredictions}</p>
                </div>
                <i className="fas fa-exclamation-triangle text-3xl text-red-600"></i>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">High Risk Devices</p>
                  <p className="text-2xl font-bold text-orange-600">{highRiskPredictions}</p>
                </div>
                <i className="fas fa-exclamation text-3xl text-orange-600"></i>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Maintenance</p>
                  <p className="text-2xl font-bold text-blue-600">{pendingMaintenance}</p>
                </div>
                <i className="fas fa-calendar-check text-3xl text-blue-600"></i>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Overdue Items</p>
                  <p className="text-2xl font-bold text-red-600">{overdueMaintenance}</p>
                </div>
                <i className="fas fa-clock text-3xl text-red-600"></i>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Failure Predictions View */}
        {viewMode === 'predictions' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-chart-line mr-2"></i>
                Failure Predictions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {predictionsLoading ? (
                <div className="text-center py-8">
                  <i className="fas fa-spinner fa-spin text-2xl text-gray-400"></i>
                  <p className="text-gray-600 mt-2">Analyzing device failure risks...</p>
                </div>
              ) : predictions.length === 0 ? (
                <div className="text-center py-8">
                  <i className="fas fa-shield-check text-3xl text-green-500 mb-4"></i>
                  <p className="text-gray-600">No high-risk devices detected</p>
                  <p className="text-sm text-gray-500">All monitored devices are operating within normal parameters</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {predictions.map((prediction) => (
                    <div
                      key={prediction.deviceId}
                      className={`p-4 border rounded-lg ${getRiskColor(prediction.riskLevel)}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <i className={`${getFailureTypeIcon(prediction.failureType)} text-2xl`}></i>
                          <div>
                            <h3 className="font-medium text-gray-900">{prediction.deviceName}</h3>
                            <p className="text-sm text-gray-600 capitalize">
                              {prediction.deviceType} • {prediction.failureType} failure predicted
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="destructive" className={getPriorityColor(prediction.riskLevel)}>
                            {prediction.riskLevel.toUpperCase()}
                          </Badge>
                          <div className="text-sm text-gray-600 mt-1">
                            Urgency: {prediction.urgency}/10
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600">Failure Probability</p>
                          <div className="flex items-center space-x-2">
                            <Progress value={prediction.failureProbability * 100} className="flex-1" />
                            <span className="text-sm font-medium">
                              {Math.round(prediction.failureProbability * 100)}%
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Time to Failure</p>
                          <p className="font-medium">{formatTimeToFailure(prediction.timeToFailure)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Estimated Cost</p>
                          <p className="font-medium">${prediction.estimatedCost}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Contributing Factors:</p>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {prediction.contributingFactors.map((factor, index) => (
                              <li key={index} className="flex items-start">
                                <i className="fas fa-circle text-xs mt-2 mr-2"></i>
                                {factor}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Recommended Actions:</p>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {prediction.recommendedActions.map((action, index) => (
                              <li key={index} className="flex items-start">
                                <i className="fas fa-arrow-right text-xs mt-2 mr-2"></i>
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200">
                        <div className="text-xs text-gray-500">
                          Confidence: {Math.round(prediction.confidence * 100)}% • 
                          Last updated: {new Date(prediction.lastUpdated).toLocaleString()}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => emergencyMutation.mutate({
                            deviceId: prediction.deviceId,
                            reason: `Critical ${prediction.failureType} failure risk`,
                            urgency: prediction.urgency
                          })}
                          disabled={emergencyMutation.isPending || prediction.riskLevel === 'low'}
                        >
                          <i className="fas fa-calendar-plus mr-2"></i>
                          Schedule Emergency
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Maintenance Schedule View */}
        {viewMode === 'schedule' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-calendar mr-2"></i>
                Maintenance Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              {scheduleLoading ? (
                <div className="text-center py-8">
                  <i className="fas fa-spinner fa-spin text-2xl text-gray-400"></i>
                  <p className="text-gray-600 mt-2">Loading maintenance schedule...</p>
                </div>
              ) : schedule.length === 0 ? (
                <div className="text-center py-8">
                  <i className="fas fa-calendar-check text-3xl text-gray-400 mb-4"></i>
                  <p className="text-gray-600">No maintenance scheduled</p>
                  <p className="text-sm text-gray-500">Maintenance tasks will appear here when scheduled</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {schedule.map((item) => (
                    <div key={item.scheduleId} className="p-4 border rounded-lg border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded-full ${getPriorityColor(item.priority)}`}></div>
                          <div>
                            <h3 className="font-medium text-gray-900">{item.deviceName}</h3>
                            <p className="text-sm text-gray-600 capitalize">
                              {item.maintenanceType} maintenance • {item.estimatedDuration} minutes
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="mb-1">
                            {item.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <div className="text-sm text-gray-600">
                            {new Date(item.scheduledDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-gray-700 mb-3">{item.description}</p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600">Required Parts</p>
                          <div className="text-sm">
                            {item.requiredParts.join(', ')}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Estimated Cost</p>
                          <p className="font-medium">${item.estimatedCost}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Priority</p>
                          <Badge variant="outline" className={`${getPriorityColor(item.priority)} text-white`}>
                            {item.priority.toUpperCase()}
                          </Badge>
                        </div>
                      </div>

                      {item.notes && (
                        <div className="mb-3">
                          <p className="text-sm text-gray-600">Notes:</p>
                          <p className="text-sm text-gray-700">{item.notes}</p>
                        </div>
                      )}

                      <div className="flex space-x-2">
                        {item.status === 'scheduled' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatusMutation.mutate({
                                scheduleId: item.scheduleId,
                                status: 'in_progress',
                                notes: 'Maintenance started'
                              })}
                              disabled={updateStatusMutation.isPending}
                            >
                              Start
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatusMutation.mutate({
                                scheduleId: item.scheduleId,
                                status: 'postponed',
                                notes: 'Postponed by user'
                              })}
                              disabled={updateStatusMutation.isPending}
                            >
                              Postpone
                            </Button>
                          </>
                        )}
                        {item.status === 'in_progress' && (
                          <Button
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({
                              scheduleId: item.scheduleId,
                              status: 'completed',
                              notes: 'Maintenance completed successfully'
                            })}
                            disabled={updateStatusMutation.isPending}
                          >
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Device Health View */}
        {viewMode === 'health' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <i className="fas fa-list mr-2"></i>
                  Select Device
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {predictions.map((prediction) => (
                    <div
                      key={prediction.deviceId}
                      className={`p-3 border rounded cursor-pointer transition-colors ${
                        selectedDevice === prediction.deviceId 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedDevice(prediction.deviceId)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{prediction.deviceName}</h4>
                          <p className="text-sm text-gray-600 capitalize">{prediction.deviceType}</p>
                        </div>
                        <Badge variant="outline" className={getRiskColor(prediction.riskLevel)}>
                          {prediction.riskLevel}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <i className="fas fa-heartbeat mr-2"></i>
                  Device Health Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedDevice ? (
                  <div className="text-center py-8">
                    <i className="fas fa-mouse-pointer text-3xl text-gray-400 mb-4"></i>
                    <p className="text-gray-600">Select a device to view health metrics</p>
                  </div>
                ) : healthLoading ? (
                  <div className="text-center py-8">
                    <i className="fas fa-spinner fa-spin text-2xl text-gray-400"></i>
                    <p className="text-gray-600 mt-2">Loading health data...</p>
                  </div>
                ) : deviceHealth ? (
                  <div className="space-y-6">
                    {/* Overall Health Score */}
                    <div className="text-center">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Overall Health</h3>
                      <div className={`text-4xl font-bold ${getHealthColor(deviceHealth.currentHealth)}`}>
                        {Math.round(deviceHealth.currentHealth * 100)}%
                      </div>
                      <Progress value={deviceHealth.currentHealth * 100} className="mt-2" />
                    </div>

                    {/* Health Metrics Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Performance</p>
                        <div className={`text-xl font-bold ${getHealthColor(deviceHealth.performanceScore)}`}>
                          {Math.round(deviceHealth.performanceScore * 100)}%
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Signal Stability</p>
                        <div className={`text-xl font-bold ${getHealthColor(deviceHealth.signalStability)}`}>
                          {Math.round(deviceHealth.signalStability * 100)}%
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Connection Quality</p>
                        <div className={`text-xl font-bold ${getHealthColor(deviceHealth.connectionQuality)}`}>
                          {Math.round(deviceHealth.connectionQuality * 100)}%
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Degradation Rate</p>
                        <div className="text-xl font-bold text-gray-700">
                          {(deviceHealth.degradationRate * 100).toFixed(2)}%/day
                        </div>
                      </div>
                    </div>

                    {/* Additional Metrics */}
                    <div className="space-y-3">
                      {deviceHealth.batteryLevel !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Battery Level:</span>
                          <span className="font-medium">{deviceHealth.batteryLevel}%</span>
                        </div>
                      )}
                      {deviceHealth.temperature !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Temperature:</span>
                          <span className="font-medium">{deviceHealth.temperature}°C</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Operating Hours:</span>
                        <span className="font-medium">{deviceHealth.operatingHours.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Error Count:</span>
                        <span className="font-medium">{deviceHealth.errorCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Restart Count:</span>
                        <span className="font-medium">{deviceHealth.restartCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Last Updated:</span>
                        <span className="font-medium">
                          {new Date(deviceHealth.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <i className="fas fa-exclamation-triangle text-3xl text-yellow-500"></i>
                    <p className="text-gray-600 mt-2">No health data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}