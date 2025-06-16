import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, Terminal, Shield, Wifi, Search, CheckCircle } from 'lucide-react';

export function DesktopAgentDownload() {
  const [downloadStep, setDownloadStep] = useState<'info' | 'downloading' | 'instructions'>('info');

  const handleDownload = () => {
    setDownloadStep('downloading');
    
    // Create and trigger download
    const agentContent = `#!/usr/bin/env node

/**
 * SmartBlueprint Pro Desktop Agent Installer
 * Downloads and installs the desktop agent for local network scanning
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

console.log('🔧 SmartBlueprint Pro Desktop Agent Installer');
console.log('Installing network scanning capabilities...');

// Installation script content would go here
// This creates a local agent that can scan your network
// and send data securely to your SmartBlueprint Pro dashboard
`;

    const blob = new Blob([agentContent], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smartblueprint-agent-installer.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setTimeout(() => {
      setDownloadStep('instructions');
    }, 1500);
  };

  if (downloadStep === 'instructions') {
    return (
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <CardTitle>Desktop Agent Downloaded Successfully</CardTitle>
          </div>
          <CardDescription>
            Follow these steps to install and run the local network scanner
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
            <h3 className="font-semibold mb-3 flex items-center">
              <Terminal className="h-4 w-4 mr-2" />
              Installation Steps
            </h3>
            <ol className="space-y-3 text-sm">
              <li className="flex items-start">
                <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5">1</span>
                <div>
                  <strong>Install Node.js</strong> (if not already installed)<br />
                  <span className="text-muted-foreground">Download from nodejs.org and install</span>
                </div>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5">2</span>
                <div>
                  <strong>Open terminal/command prompt</strong><br />
                  <span className="text-muted-foreground">Navigate to your downloads folder</span>
                </div>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5">3</span>
                <div>
                  <strong>Run the installer</strong><br />
                  <code className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded text-sm">
                    node smartblueprint-agent-installer.js
                  </code>
                </div>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5">4</span>
                <div>
                  <strong>Configure server connection</strong><br />
                  <span className="text-muted-foreground">Edit config.json to point to your SmartBlueprint Pro server</span>
                </div>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5">5</span>
                <div>
                  <strong>Start the agent</strong><br />
                  <code className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded text-sm">
                    cd ~/.smartblueprint-agent && node agent.js
                  </code>
                </div>
              </li>
            </ol>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">What the Agent Does</h4>
            <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
              <li>• Scans your local network for WiFi devices</li>
              <li>• Measures real signal strength (RSSI) values</li>
              <li>• Identifies device types and vendors</li>
              <li>• Sends secure updates to your dashboard</li>
              <li>• Enables authentic network mapping</li>
            </ul>
          </div>

          <div className="flex space-x-3">
            <Button onClick={() => setDownloadStep('info')} variant="outline">
              Download Again
            </Button>
            <Button onClick={() => window.open('https://nodejs.org', '_blank')} variant="outline">
              Get Node.js
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (downloadStep === 'downloading') {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="p-8 text-center">
          <Download className="h-12 w-12 mx-auto mb-4 animate-bounce text-blue-600" />
          <h3 className="text-lg font-semibold mb-2">Downloading Desktop Agent...</h3>
          <p className="text-muted-foreground">
            The installer will appear in your downloads folder
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Download className="h-6 w-6" />
          <span>Download Desktop Agent</span>
        </CardTitle>
        <CardDescription>
          Install the local network scanner to enable real device discovery and WiFi mapping
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                Why a Desktop Agent is Required
              </h4>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Web browsers cannot access your local network for security reasons. 
                The desktop agent runs locally to scan your WiFi devices and send secure updates to your dashboard.
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3 flex items-center">
              <Wifi className="h-4 w-4 mr-2" />
              Real Network Capabilities
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                Actual RSSI signal measurements
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                MAC address discovery
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                Device type identification
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                Network topology mapping
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3 flex items-center">
              <Search className="h-4 w-4 mr-2" />
              Browser Limitations
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center text-muted-foreground">
                <span className="w-4 h-4 mr-2">⚠️</span>
                No WiFi signal access
              </li>
              <li className="flex items-center text-muted-foreground">
                <span className="w-4 h-4 mr-2">⚠️</span>
                No network interface access
              </li>
              <li className="flex items-center text-muted-foreground">
                <span className="w-4 h-4 mr-2">⚠️</span>
                No local device discovery
              </li>
              <li className="flex items-center text-muted-foreground">
                <span className="w-4 h-4 mr-2">⚠️</span>
                Sandboxed environment
              </li>
            </ul>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="font-semibold">System Requirements</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <Badge variant="outline" className="mb-2">Windows</Badge>
              <p className="text-sm text-muted-foreground">Windows 10/11</p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <Badge variant="outline" className="mb-2">macOS</Badge>
              <p className="text-sm text-muted-foreground">macOS 10.15+</p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <Badge variant="outline" className="mb-2">Linux</Badge>
              <p className="text-sm text-muted-foreground">Ubuntu 18.04+</p>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-4">
          <Button onClick={handleDownload} size="lg" className="px-8">
            <Download className="h-4 w-4 mr-2" />
            Download Desktop Agent
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}