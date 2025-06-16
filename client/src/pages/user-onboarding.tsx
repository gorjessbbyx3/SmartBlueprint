import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { DesktopAgentDownload } from '@/components/desktop-agent-download';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  required: boolean;
  action?: () => void;
}

interface SystemStatus {
  desktopAgent: boolean;
  networkAccess: boolean;
  webSocketConnection: boolean;
  databaseConnection: boolean;
}

export default function UserOnboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    desktopAgent: false,
    networkAccess: false,
    webSocketConnection: false,
    databaseConnection: false
  });

  const [steps] = useState<OnboardingStep[]>([
    {
      id: 'system-check',
      title: 'System Requirements Check',
      description: 'Verify all system components are operational',
      status: 'pending',
      required: true
    },
    {
      id: 'desktop-agent',
      title: 'Desktop Agent Setup',
      description: 'Install and configure the local network agent for authentic device discovery',
      status: 'pending',
      required: true
    },
    {
      id: 'network-discovery',
      title: 'Network Device Discovery',
      description: 'Scan your local network for smart devices using authentic protocols',
      status: 'pending',
      required: true
    },
    {
      id: 'ping-calibration',
      title: 'RTT Distance Calibration',
      description: 'Calibrate ping-based distance measurement for meter-level accuracy',
      status: 'pending',
      required: false
    },
    {
      id: 'platform-integration',
      title: 'Smart Home Platform Integration',
      description: 'Connect to your Philips Hue, Nest, or Alexa devices with real API credentials',
      status: 'pending',
      required: false
    },
    {
      id: 'monitoring-setup',
      title: 'Live Monitoring Activation',
      description: 'Enable real-time device monitoring and AI-powered analytics',
      status: 'pending',
      required: true
    }
  ]);

  useEffect(() => {
    checkSystemStatus();
    const interval = setInterval(checkSystemStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkSystemStatus = async () => {
    const status: SystemStatus = {
      desktopAgent: false,
      networkAccess: false,
      webSocketConnection: false,
      databaseConnection: false
    };

    try {
      // Check WebSocket connection
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        status.webSocketConnection = true;
        socket.close();
      };

      // Check database connection
      const dbResponse = await fetch('/api/devices');
      status.databaseConnection = dbResponse.ok;

      // Check network access through device discovery
      try {
        const networkResponse = await fetch('/api/device-discovery/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ protocols: ['arp'], timeout: 3000 })
        });
        status.networkAccess = networkResponse.ok;
        status.desktopAgent = networkResponse.ok; // Indicates agent is responding
      } catch (error) {
        status.networkAccess = false;
        status.desktopAgent = false;
      }

    } catch (error) {
      console.error('System status check failed:', error);
    }

    setSystemStatus(status);
  };



  const startNetworkDiscovery = async () => {
    try {
      const response = await fetch('/api/device-discovery/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocols: ['mdns', 'ssdp', 'arp'],
          timeout: 15000
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Network discovery completed:', data);
      }
    } catch (error) {
      console.error('Network discovery failed:', error);
    }
  };

  const startPingCalibration = () => {
    window.open('/ping-monitoring', '_blank');
  };

  const openPlatformIntegration = () => {
    window.open('/platforms', '_blank');
  };

  const getStepStatus = (stepId: string) => {
    switch (stepId) {
      case 'system-check':
        return systemStatus.databaseConnection && systemStatus.webSocketConnection ? 'completed' : 'pending';
      case 'desktop-agent':
        return systemStatus.desktopAgent ? 'completed' : 'blocked';
      case 'network-discovery':
        return systemStatus.networkAccess ? 'completed' : systemStatus.desktopAgent ? 'pending' : 'blocked';
      default:
        return 'pending';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'in_progress': return 'text-blue-600';
      case 'blocked': return 'text-red-600';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return 'fas fa-check-circle';
      case 'in_progress': return 'fas fa-spinner fa-spin';
      case 'blocked': return 'fas fa-exclamation-triangle';
      default: return 'fas fa-circle';
    }
  };

  const completedSteps = steps.filter(step => getStepStatus(step.id) === 'completed').length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to SmartBlueprint Pro
          </h1>
          <p className="text-gray-600">
            Complete setup for authentic smart home device monitoring and optimization
          </p>
        </div>

        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Setup Progress</span>
              <Badge variant="outline">{completedSteps}/{steps.length} Complete</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progressPercentage} className="mb-4" />
            <p className="text-sm text-gray-600">
              {completedSteps === steps.length 
                ? 'Setup complete! Your system is ready for authentic device monitoring.'
                : `${steps.length - completedSteps} steps remaining to complete setup.`
              }
            </p>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Components Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <i className={`fas fa-database text-2xl mb-2 ${systemStatus.databaseConnection ? 'text-green-600' : 'text-red-600'}`}></i>
                <div className="text-sm font-medium">Database</div>
                <div className="text-xs text-gray-500">
                  {systemStatus.databaseConnection ? 'Connected' : 'Disconnected'}
                </div>
              </div>
              <div className="text-center">
                <i className={`fas fa-plug text-2xl mb-2 ${systemStatus.webSocketConnection ? 'text-green-600' : 'text-red-600'}`}></i>
                <div className="text-sm font-medium">WebSocket</div>
                <div className="text-xs text-gray-500">
                  {systemStatus.webSocketConnection ? 'Active' : 'Inactive'}
                </div>
              </div>
              <div className="text-center">
                <i className={`fas fa-desktop text-2xl mb-2 ${systemStatus.desktopAgent ? 'text-green-600' : 'text-red-600'}`}></i>
                <div className="text-sm font-medium">Desktop Agent</div>
                <div className="text-xs text-gray-500">
                  {systemStatus.desktopAgent ? 'Running' : 'Not Running'}
                </div>
              </div>
              <div className="text-center">
                <i className={`fas fa-network-wired text-2xl mb-2 ${systemStatus.networkAccess ? 'text-green-600' : 'text-red-600'}`}></i>
                <div className="text-sm font-medium">Network Access</div>
                <div className="text-xs text-gray-500">
                  {systemStatus.networkAccess ? 'Available' : 'Limited'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Setup Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => {
            const status = getStepStatus(step.id);
            return (
              <Card key={step.id} className={`${status === 'completed' ? 'border-green-200 bg-green-50' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          status === 'completed' ? 'bg-green-600 text-white' :
                          status === 'blocked' ? 'bg-red-100 text-red-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {status === 'completed' ? (
                            <i className="fas fa-check"></i>
                          ) : (
                            <span className="font-bold">{index + 1}</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold flex items-center">
                          {step.title}
                          {step.required && (
                            <Badge variant="outline" className="ml-2 text-xs">Required</Badge>
                          )}
                        </h3>
                        <p className="text-sm text-gray-600">{step.description}</p>
                        <div className="flex items-center mt-1">
                          <i className={`${getStatusIcon(status)} ${getStatusColor(status)} mr-2`}></i>
                          <span className={`text-xs ${getStatusColor(status)}`}>
                            {status === 'completed' ? 'Completed' :
                             status === 'blocked' ? 'Requires Desktop Agent' :
                             'Ready to Start'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {step.id === 'network-discovery' && status === 'pending' && (
                        <Button onClick={startNetworkDiscovery} size="sm">
                          Start Discovery
                        </Button>
                      )}
                      {step.id === 'ping-calibration' && (
                        <Button onClick={startPingCalibration} variant="outline" size="sm">
                          Open Calibration
                        </Button>
                      )}
                      {step.id === 'platform-integration' && (
                        <Button onClick={openPlatformIntegration} variant="outline" size="sm">
                          Connect Platforms
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Desktop Agent Download Section */}
                  {step.id === 'desktop-agent' && status !== 'completed' && (
                    <div className="mt-6 pt-6 border-t">
                      <DesktopAgentDownload />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Data Integrity Notice */}
        <Alert>
          <AlertDescription>
            <strong>Data Integrity Guarantee:</strong> SmartBlueprint Pro operates exclusively with authentic data from real network sources. 
            No mock, demo, or placeholder content is used anywhere in the system. All device discovery, measurements, 
            and analytics are based on genuine network data and require proper authentication or desktop agent connectivity.
          </AlertDescription>
        </Alert>

        {/* Quick Actions */}
        {completedSteps === steps.length && (
          <Card>
            <CardHeader>
              <CardTitle>Your System is Ready!</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  onClick={() => window.open('/', '_blank')} 
                  className="h-20 flex flex-col items-center justify-center"
                >
                  <i className="fas fa-map text-xl mb-1"></i>
                  <span>Device Mapping</span>
                </Button>
                <Button 
                  onClick={() => window.open('/ping-monitoring', '_blank')} 
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center"
                >
                  <i className="fas fa-satellite-dish text-xl mb-1"></i>
                  <span>Ping Monitor</span>
                </Button>
                <Button 
                  onClick={() => window.open('/ai-insights', '_blank')} 
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center"
                >
                  <i className="fas fa-brain text-xl mb-1"></i>
                  <span>AI Analytics</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}