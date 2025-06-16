import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import WorkflowTest from '@/components/workflow-test';

interface SystemHealth {
  ping: boolean;
  deviceDiscovery: boolean;
  websocket: boolean;
  aiAgents: boolean;
  cloudTunnel: boolean;
}

interface UserWorkflowStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  optional: boolean;
}

export default function WorkflowDashboard() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    ping: false,
    deviceDiscovery: false,
    websocket: false,
    aiAgents: false,
    cloudTunnel: false
  });

  const [workflowSteps] = useState<UserWorkflowStep[]>([
    {
      id: 'setup-agent',
      title: 'Start Desktop Agent',
      description: 'Run desktop-agent-ping.js for local network access',
      completed: false,
      optional: false
    },
    {
      id: 'discover-devices',
      title: 'Discover Network Devices',
      description: 'Scan for printers, game consoles, smart TVs, and routers',
      completed: false,
      optional: false
    },
    {
      id: 'ping-calibration',
      title: 'Calibrate Ping System',
      description: 'Walk to known positions for location training',
      completed: false,
      optional: true
    },
    {
      id: 'enable-monitoring',
      title: 'Enable Live Monitoring',
      description: 'Start real-time device and signal monitoring',
      completed: false,
      optional: false
    },
    {
      id: 'view-insights',
      title: 'Review AI Insights',
      description: 'Check anomaly detection and optimization suggestions',
      completed: false,
      optional: true
    }
  ]);

  useEffect(() => {
    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkSystemHealth = async () => {
    const health: SystemHealth = {
      ping: false,
      deviceDiscovery: false,
      websocket: false,
      aiAgents: false,
      cloudTunnel: false
    };

    try {
      // Test ping system
      const pingResponse = await fetch('/api/ping/measure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hosts: ['127.0.0.1'], trials: 1 })
      });
      health.ping = pingResponse.ok;

      // Test device discovery
      const deviceResponse = await fetch('/api/devices');
      health.deviceDiscovery = deviceResponse.ok;

      // Test AI agents
      const aiResponse = await fetch('/api/ai/system-health');
      health.aiAgents = aiResponse.ok;

      // WebSocket test
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        health.websocket = true;
        health.cloudTunnel = true;
        socket.close();
        setSystemHealth({ ...health });
      };

      socket.onerror = () => {
        setSystemHealth({ ...health });
      };

    } catch (error) {
      setSystemHealth({ ...health });
    }
  };

  const getHealthColor = (status: boolean) => status ? 'text-green-600' : 'text-red-600';
  const getHealthIcon = (status: boolean) => status ? 'fas fa-check-circle' : 'fas fa-times-circle';

  const navigateToPage = (path: string) => {
    window.open(path, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            SmartBlueprint Pro - System Dashboard
          </h1>
          <p className="text-gray-600">
            Complete workflow management for seamless smart home device monitoring
          </p>
        </div>

        {/* System Health Monitor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <i className="fas fa-heartbeat mr-2 text-red-500"></i>
              System Health Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <i className={`${getHealthIcon(systemHealth.ping)} ${getHealthColor(systemHealth.ping)} text-2xl mb-2`}></i>
                <div className="text-sm font-medium">Ping System</div>
                <div className="text-xs text-gray-500">RTT Measurement</div>
              </div>
              <div className="text-center">
                <i className={`${getHealthIcon(systemHealth.deviceDiscovery)} ${getHealthColor(systemHealth.deviceDiscovery)} text-2xl mb-2`}></i>
                <div className="text-sm font-medium">Device Discovery</div>
                <div className="text-xs text-gray-500">Network Scanning</div>
              </div>
              <div className="text-center">
                <i className={`${getHealthIcon(systemHealth.websocket)} ${getHealthColor(systemHealth.websocket)} text-2xl mb-2`}></i>
                <div className="text-sm font-medium">WebSocket</div>
                <div className="text-xs text-gray-500">Real-time Comm</div>
              </div>
              <div className="text-center">
                <i className={`${getHealthIcon(systemHealth.aiAgents)} ${getHealthColor(systemHealth.aiAgents)} text-2xl mb-2`}></i>
                <div className="text-sm font-medium">AI Agents</div>
                <div className="text-xs text-gray-500">ML Analytics</div>
              </div>
              <div className="text-center">
                <i className={`${getHealthIcon(systemHealth.cloudTunnel)} ${getHealthColor(systemHealth.cloudTunnel)} text-2xl mb-2`}></i>
                <div className="text-sm font-medium">Cloud Tunnel</div>
                <div className="text-xs text-gray-500">Agent Bridge</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Workflow Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <i className="fas fa-route mr-2 text-blue-500"></i>
              Complete User Workflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {workflowSteps.map((step, index) => (
                <div key={step.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-semibold flex items-center">
                      {step.title}
                      {step.optional && (
                        <Badge variant="outline" className="ml-2 text-xs">Optional</Badge>
                      )}
                    </h3>
                    <p className="text-sm text-gray-600">{step.description}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <i className={`fas fa-${step.completed ? 'check-circle text-green-600' : 'circle text-gray-400'}`}></i>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigateToPage('/ping-monitoring')}>
            <CardContent className="p-4 text-center">
              <i className="fas fa-satellite-dish text-3xl text-blue-600 mb-2"></i>
              <h3 className="font-semibold">Ping Monitor</h3>
              <p className="text-xs text-gray-600">RTT distance measurement</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigateToPage('/device-discovery')}>
            <CardContent className="p-4 text-center">
              <i className="fas fa-search text-3xl text-green-600 mb-2"></i>
              <h3 className="font-semibold">Device Discovery</h3>
              <p className="text-xs text-gray-600">Network device scanning</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigateToPage('/ai-insights')}>
            <CardContent className="p-4 text-center">
              <i className="fas fa-brain text-3xl text-purple-600 mb-2"></i>
              <h3 className="font-semibold">AI Insights</h3>
              <p className="text-xs text-gray-600">Analytics & anomalies</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigateToPage('/')}>
            <CardContent className="p-4 text-center">
              <i className="fas fa-map text-3xl text-orange-600 mb-2"></i>
              <h3 className="font-semibold">Device Mapping</h3>
              <p className="text-xs text-gray-600">Interactive floor plans</p>
            </CardContent>
          </Card>
        </div>

        {/* Desktop Agent Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <i className="fas fa-desktop mr-2 text-indigo-500"></i>
              Desktop Agent Setup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                <div className="space-y-3">
                  <div>
                    <strong>Why Desktop Agent is Required:</strong>
                    <p className="text-sm text-gray-600 mt-1">
                      Browser security restrictions prevent direct network scanning. The desktop agent provides:
                      WiFi signal access, device discovery capabilities, and real-time ping measurements.
                    </p>
                  </div>
                  
                  <div>
                    <strong>Quick Start:</strong>
                    <div className="bg-gray-100 p-3 rounded mt-2">
                      <code className="text-sm">node desktop-agent-ping.js</code>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Connects automatically via WebSocket for live data streaming
                    </p>
                  </div>
                  
                  <div>
                    <strong>Agent Capabilities:</strong>
                    <ul className="text-sm text-gray-600 list-disc list-inside mt-1">
                      <li>mDNS/SSDP/UPnP device discovery</li>
                      <li>Real-time ping/RTT measurements</li>
                      <li>WiFi signal strength monitoring</li>
                      <li>Automatic cloud synchronization</li>
                    </ul>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Workflow Testing Component */}
        <WorkflowTest />
      </div>
    </div>
  );
}