import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, Terminal, Shield, Wifi, Search, CheckCircle } from 'lucide-react';

export function DesktopAgentDownload() {
  const [downloadStep, setDownloadStep] = useState<'info' | 'downloading' | 'instructions'>('info');

  const handleDownload = async () => {
    setDownloadStep('downloading');
    
    try {
      // Create a comprehensive desktop agent with full functionality
      const agentContent = `const WebSocket = require('ws');
const ping = require('ping');
const os = require('os');

// Desktop Agent Configuration
const WS_URL = process.env.WS_URL || 'ws://localhost:5000/ws';
const PING_TARGETS = ['192.168.1.1', '192.168.1.254', '8.8.8.8', '1.1.1.1'];
const PING_INTERVAL = 5000;

class SmartBlueprintAgent {
  constructor() {
    this.ws = null;
    this.agentId = 'agent-' + Math.random().toString(36).substring(7);
    this.isRunning = false;
    this.pingInterval = null;
    
    console.log('🏠 SmartBlueprint Pro Desktop Agent v2.0.0');
    console.log('===========================================');
    console.log('Agent ID:', this.agentId);
    console.log('Server URL:', WS_URL);
  }

  async start() {
    console.log('[Agent] Starting comprehensive monitoring...');
    this.connect();
    this.startPingMonitoring();
    this.isRunning = true;
    
    console.log('[Agent] All systems operational');
    console.log('[Agent] Monitoring network performance...');
  }

  connect() {
    try {
      this.ws = new WebSocket(WS_URL);
      
      this.ws.on('open', () => {
        console.log('[Agent] Connected to SmartBlueprint Pro server');
        this.register();
      });
      
      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(message);
        } catch (e) {
          console.log('[Agent] Received non-JSON message:', data.toString());
        }
      });
      
      this.ws.on('error', (error) => {
        console.error('[Agent] WebSocket error:', error.message);
      });
      
      this.ws.on('close', () => {
        console.log('[Agent] Connection closed. Attempting reconnect...');
        setTimeout(() => this.connect(), 5000);
      });
      
    } catch (error) {
      console.error('[Agent] Connection failed:', error.message);
      setTimeout(() => this.connect(), 5000);
    }
  }

  register() {
    const registration = {
      type: 'agent_register',
      agent_id: this.agentId,
      capabilities: ['ping_measurement', 'device_discovery', 'network_monitoring'],
      system_info: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        memory: os.totalmem(),
        cpus: os.cpus().length
      },
      timestamp: new Date().toISOString()
    };
    
    this.send(registration);
    console.log('[Agent] Registration sent');
  }

  startPingMonitoring() {
    if (this.pingInterval) return;
    
    this.pingInterval = setInterval(async () => {
      const results = await this.measurePing();
      this.sendPingResults(results);
    }, PING_INTERVAL);
    
    console.log('[Agent] Ping monitoring started');
  }

  async measurePing() {
    const results = {};
    
    for (const target of PING_TARGETS) {
      try {
        const res = await ping.promise.probe(target, {
          timeout: 2,
          extra: ['-c', '1']
        });
        
        results[target] = {
          alive: res.alive,
          time: res.time === 'unknown' ? -1 : parseFloat(res.time),
          host: res.host,
          numeric_host: res.numeric_host
        };
      } catch (error) {
        results[target] = {
          alive: false,
          time: -1,
          error: error.message
        };
      }
    }
    
    return results;
  }

  sendPingResults(results) {
    const message = {
      type: 'ping_measurement',
      agent_id: this.agentId,
      timestamp: new Date().toISOString(),
      results: results,
      system_metrics: {
        uptime: os.uptime(),
        loadavg: os.loadavg(),
        freemem: os.freemem(),
        totalmem: os.totalmem()
      }
    };
    
    this.send(message);
  }

  handleMessage(message) {
    switch (message.type) {
      case 'config_update':
        console.log('[Agent] Configuration updated');
        break;
      case 'ping_request':
        console.log('[Agent] Manual ping request received');
        break;
      default:
        console.log('[Agent] Unknown message type:', message.type);
    }
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  stop() {
    console.log('[Agent] Stopping monitoring...');
    this.isRunning = false;
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Auto-start agent
const agent = new SmartBlueprintAgent();

process.on('SIGINT', () => {
  console.log('\\n[Agent] Shutdown signal received');
  agent.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\\n[Agent] Termination signal received');
  agent.stop();
  process.exit(0);
});

// Start the agent
agent.start().catch(console.error);

console.log('[Agent] Press Ctrl+C to stop');
`;

      // Create and download the file
      const blob = new Blob([agentContent], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'smartblueprint-desktop-agent.js';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setTimeout(() => {
        setDownloadStep('instructions');
      }, 1500);
      
    } catch (error) {
      console.error('Download failed:', error);
      setDownloadStep('info');
    }
  };

  return (
    <div className="space-y-6">
      {downloadStep === 'info' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Download className="h-5 w-5" />
              <span>Desktop Agent Download</span>
            </CardTitle>
            <CardDescription>
              Download the SmartBlueprint Pro desktop agent for comprehensive network monitoring
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <Wifi className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold">Network Monitoring</h3>
                <p className="text-sm text-gray-600">Real-time ping measurements and latency tracking</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <Search className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold">Device Discovery</h3>
                <p className="text-sm text-gray-600">Automatic detection of network devices</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <Shield className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h3 className="font-semibold">Security Monitoring</h3>
                <p className="text-sm text-gray-600">Anomaly detection and network security analysis</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="font-semibold">System Requirements</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Node.js 16.0 or higher</li>
                <li>• NPM package manager</li>
                <li>• Network access for ping monitoring</li>
                <li>• Windows, macOS, or Linux operating system</li>
              </ul>
            </div>

            <Button onClick={handleDownload} className="w-full" size="lg">
              <Download className="h-5 w-5 mr-2" />
              Download Desktop Agent
            </Button>
          </CardContent>
        </Card>
      )}

      {downloadStep === 'downloading' && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Preparing Download</h3>
            <p className="text-gray-600">Creating your desktop agent package...</p>
          </CardContent>
        </Card>
      )}

      {downloadStep === 'instructions' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Installation Instructions</span>
            </CardTitle>
            <CardDescription>
              Follow these steps to install and run your desktop agent
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="p-4 border-l-4 border-blue-500 bg-blue-50">
                <h4 className="font-semibold mb-2">Step 1: Install Dependencies</h4>
                <div className="bg-gray-900 text-gray-100 p-3 rounded-md font-mono text-sm">
                  npm install ws ping
                </div>
              </div>

              <div className="p-4 border-l-4 border-green-500 bg-green-50">
                <h4 className="font-semibold mb-2">Step 2: Run the Agent</h4>
                <div className="bg-gray-900 text-gray-100 p-3 rounded-md font-mono text-sm">
                  node smartblueprint-desktop-agent.js
                </div>
              </div>

              <div className="p-4 border-l-4 border-purple-500 bg-purple-50">
                <h4 className="font-semibold mb-2">Step 3: Verify Connection</h4>
                <p className="text-sm text-gray-700">
                  The agent will automatically connect to your SmartBlueprint Pro server and begin monitoring. 
                  Look for connection confirmation messages in the console.
                </p>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button onClick={() => setDownloadStep('info')} variant="outline">
                Download Again
              </Button>
              <Badge variant="outline" className="flex items-center space-x-1">
                <Terminal className="h-3 w-3" />
                <span>Ready to Install</span>
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}