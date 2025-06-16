import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface PetDetection {
  id: string;
  petType: 'dog' | 'cat' | 'bird' | 'rabbit' | 'other';
  confidence: number;
  location: { x: number; y: number };
  timestamp: string;
  detectionMethod: 'motion_pattern' | 'device_interaction' | 'sensor_trigger' | 'camera_vision';
  deviceTriggers: string[];
  movementPattern: {
    speed: number;
    direction: number;
    pathType: 'linear' | 'circular' | 'erratic' | 'stationary';
    repeatability: number;
    timeOfDay: number[];
    zones: string[];
  };
  size: 'small' | 'medium' | 'large';
  activityLevel: number;
}

interface PetDevice {
  deviceId: string;
  deviceType: 'feeder' | 'water_fountain' | 'camera' | 'door' | 'toy' | 'tracker' | 'litter_box';
  petAssociated: string[];
  lastInteraction: string;
  interactionFrequency: number;
  brand: string;
  location: { x: number; y: number };
}

interface PetBehaviorAnalysis {
  healthScore: number;
  insights: string[];
  recommendations: string[];
}

export default function PetRecognition() {
  const [selectedPet, setSelectedPet] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch detected pets
  const { data: petsData, isLoading: petsLoading } = useQuery({
    queryKey: ['/api/pets/detected'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch pet devices
  const { data: devicesData, isLoading: devicesLoading } = useQuery({
    queryKey: ['/api/pets/devices'],
    refetchInterval: 30000
  });

  // Fetch behavior analysis for selected pet
  const { data: behaviorData, isLoading: behaviorLoading } = useQuery({
    queryKey: ['/api/pets', selectedPet, 'behavior'],
    enabled: !!selectedPet,
    refetchInterval: 60000
  });

  // Analyze pets from current devices
  const analyzePetsMutation = useMutation({
    mutationFn: async () => {
      const devicesResponse = await fetch('/api/devices');
      const devices = await devicesResponse.json();
      
      const response = await fetch('/api/pets/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devices: devices.devices || [] })
      });
      
      if (!response.ok) throw new Error('Analysis failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pets/detected'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pets/devices'] });
    }
  });

  const pets: PetDetection[] = petsData?.pets || [];
  const petDevices: PetDevice[] = devicesData?.devices || [];

  const getPetIcon = (petType: string) => {
    switch (petType) {
      case 'dog': return 'fas fa-dog';
      case 'cat': return 'fas fa-cat';
      case 'bird': return 'fas fa-dove';
      case 'rabbit': return 'fas fa-rabbit';
      default: return 'fas fa-paw';
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'feeder': return 'fas fa-utensils';
      case 'water_fountain': return 'fas fa-tint';
      case 'camera': return 'fas fa-camera';
      case 'door': return 'fas fa-door-open';
      case 'toy': return 'fas fa-dice';
      case 'tracker': return 'fas fa-map-marker-alt';
      case 'litter_box': return 'fas fa-box';
      default: return 'fas fa-microchip';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pet Recognition AI</h1>
            <p className="text-gray-600">Intelligent pet detection through device interactions and movement patterns</p>
          </div>
          <Button 
            onClick={() => analyzePetsMutation.mutate()}
            disabled={analyzePetsMutation.isPending}
            className="flex items-center space-x-2"
          >
            <i className="fas fa-search"></i>
            <span>{analyzePetsMutation.isPending ? 'Analyzing...' : 'Analyze Pets'}</span>
          </Button>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Detected Pets</p>
                  <p className="text-2xl font-bold text-gray-900">{pets.length}</p>
                </div>
                <i className="fas fa-paw text-3xl text-blue-600"></i>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pet Devices</p>
                  <p className="text-2xl font-bold text-gray-900">{petDevices.length}</p>
                </div>
                <i className="fas fa-home text-3xl text-green-600"></i>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Monitoring</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {pets.filter(p => p.activityLevel > 0.5).length}
                  </p>
                </div>
                <i className="fas fa-heartbeat text-3xl text-red-600"></i>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Detected Pets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-paw mr-2"></i>
                Detected Pets
              </CardTitle>
            </CardHeader>
            <CardContent>
              {petsLoading ? (
                <div className="text-center py-8">
                  <i className="fas fa-spinner fa-spin text-2xl text-gray-400"></i>
                  <p className="text-gray-600 mt-2">Loading pet detections...</p>
                </div>
              ) : pets.length === 0 ? (
                <div className="text-center py-8">
                  <i className="fas fa-search text-3xl text-gray-400 mb-4"></i>
                  <p className="text-gray-600">No pets detected yet</p>
                  <p className="text-sm text-gray-500">Click "Analyze Pets" to scan for pet devices</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pets.map((pet) => (
                    <div
                      key={pet.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedPet === pet.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedPet(pet.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <i className={`${getPetIcon(pet.petType)} text-2xl text-gray-700`}></i>
                          <div>
                            <h3 className="font-medium text-gray-900 capitalize">
                              {pet.petType} ({pet.size})
                            </h3>
                            <p className="text-sm text-gray-600">
                              {pet.detectionMethod.replace('_', ' ')} detection
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-medium ${getConfidenceColor(pet.confidence)}`}>
                            {Math.round(pet.confidence * 100)}%
                          </div>
                          <Badge variant="outline" className="mt-1">
                            Activity: {Math.round(pet.activityLevel * 100)}%
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="mt-3 text-sm text-gray-600">
                        <div className="flex items-center space-x-4">
                          <span>Speed: {pet.movementPattern.speed.toFixed(1)} m/s</span>
                          <span>Pattern: {pet.movementPattern.pathType}</span>
                          <span>Devices: {pet.deviceTriggers.length}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pet Devices */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-microchip mr-2"></i>
                Pet Devices
              </CardTitle>
            </CardHeader>
            <CardContent>
              {devicesLoading ? (
                <div className="text-center py-8">
                  <i className="fas fa-spinner fa-spin text-2xl text-gray-400"></i>
                  <p className="text-gray-600 mt-2">Loading pet devices...</p>
                </div>
              ) : petDevices.length === 0 ? (
                <div className="text-center py-8">
                  <i className="fas fa-home text-3xl text-gray-400 mb-4"></i>
                  <p className="text-gray-600">No pet devices found</p>
                  <p className="text-sm text-gray-500">Pet devices will appear here when detected</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {petDevices.map((device) => (
                    <div key={device.deviceId} className="p-4 border rounded-lg border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <i className={`${getDeviceIcon(device.deviceType)} text-xl text-gray-700`}></i>
                          <div>
                            <h3 className="font-medium text-gray-900 capitalize">
                              {device.deviceType.replace('_', ' ')}
                            </h3>
                            <p className="text-sm text-gray-600">{device.brand}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">
                            {device.interactionFrequency}/day
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(device.lastInteraction).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Behavior Analysis */}
        {selectedPet && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-chart-line mr-2"></i>
                Behavior Analysis - {pets.find(p => p.id === selectedPet)?.petType}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {behaviorLoading ? (
                <div className="text-center py-8">
                  <i className="fas fa-spinner fa-spin text-2xl text-gray-400"></i>
                  <p className="text-gray-600 mt-2">Analyzing behavior patterns...</p>
                </div>
              ) : behaviorData ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Health Score */}
                  <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Health Score</h3>
                    <div className={`text-4xl font-bold ${getHealthScoreColor(behaviorData.healthScore)}`}>
                      {Math.round(behaviorData.healthScore * 100)}%
                    </div>
                    <Progress 
                      value={behaviorData.healthScore * 100} 
                      className="mt-2"
                    />
                  </div>

                  {/* Insights */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Insights</h3>
                    <div className="space-y-2">
                      {behaviorData.insights.length > 0 ? behaviorData.insights.map((insight, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <i className="fas fa-lightbulb text-yellow-500 mt-1"></i>
                          <span className="text-sm text-gray-700">{insight}</span>
                        </div>
                      )) : (
                        <p className="text-sm text-gray-500">No specific insights available</p>
                      )}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Recommendations</h3>
                    <div className="space-y-2">
                      {behaviorData.recommendations.length > 0 ? behaviorData.recommendations.map((rec, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <i className="fas fa-arrow-right text-blue-500 mt-1"></i>
                          <span className="text-sm text-gray-700">{rec}</span>
                        </div>
                      )) : (
                        <p className="text-sm text-gray-500">No recommendations at this time</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <i className="fas fa-exclamation-triangle text-2xl text-yellow-500"></i>
                  <p className="text-gray-600 mt-2">Unable to load behavior analysis</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}