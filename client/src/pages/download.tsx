import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Shield, Monitor, Wifi, Zap, CheckCircle } from "lucide-react";

export default function DownloadPage() {
  const handleDownloadGUI = () => {
    // Download the enhanced Windows GUI application
    window.open('/download/SmartBlueprint-Pro-Windows-Enhanced.tar.gz', '_blank');
  };

  const handleDownloadLegacy = () => {
    // Download the legacy terminal-only version
    window.open('/download/SmartBlueprint-Pro-Setup.exe', '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Download SmartBlueprint Pro Desktop
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
            Get the complete smart home monitoring platform as a standalone Windows application. 
            No cloud dependencies, no technical setup required.
          </p>
        </div>

        {/* Download Options */}
        <div className="max-w-6xl mx-auto mb-12 grid md:grid-cols-2 gap-8">
          
          {/* Windows GUI Application - NEW PRIMARY OPTION */}
          <Card className="border-2 border-green-200 dark:border-green-800 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl text-green-900 dark:text-green-100">
                    Windows GUI Application
                  </CardTitle>
                  <CardDescription className="text-green-700 dark:text-green-300">
                    Native Windows app with visual interface
                  </CardDescription>
                </div>
                <Badge className="bg-green-600 text-white text-sm">
                  NEW
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Native Windows application window</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Complete React web interface embedded</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Python ML services run in background</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">No terminal windows visible</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Menu system with keyboard shortcuts</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Complete offline operation</span>
                </div>
              </div>
              
              <Button 
                onClick={handleDownloadGUI}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                size="lg"
              >
                <Download className="mr-2 h-5 w-5" />
                Download GUI Application
              </Button>
              
              <div className="mt-4 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <p>• Electron-wrapped React frontend</p>
                <p>• Express.js + Python backends</p>
                <p>• Native Windows integration</p>
                <p>• Size: ~210KB package</p>
              </div>
            </CardContent>
          </Card>

          {/* Legacy Desktop Application */}
          <Card className="border-2 border-blue-200 dark:border-blue-800 shadow-xl opacity-75">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl text-blue-900 dark:text-blue-100">
                    Legacy Terminal Version
                  </CardTitle>
                  <CardDescription className="text-blue-700 dark:text-blue-300">
                    Command-line interface version
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-sm">
                  Legacy
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Terminal-based interface</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Network monitoring agent</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">AI-powered analytics</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Offline functionality</span>
                </div>
              </div>
              
              <Button 
                onClick={handleDownloadLegacy}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                variant="outline"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Legacy Version
              </Button>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
                ~50 MB • One-click installer
              </p>
            </CardContent>
          </Card>

          {/* Desktop Agent Only */}
          <Card className="border-2 border-green-200 dark:border-green-800 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl text-green-900 dark:text-green-100">
                    Desktop Agent Only
                  </CardTitle>
                  <CardDescription className="text-green-700 dark:text-green-300">
                    Lightweight monitoring agent
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-sm">
                  Advanced
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Network device discovery</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Real-time monitoring</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Cloud synchronization</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Command line interface</span>
                </div>
              </div>
              
              <Button 
                onClick={() => window.open('/download/desktop-agent-enhanced.js', '_blank')}
                variant="outline"
                className="w-full border-green-600 text-green-600 hover:bg-green-50"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Agent
              </Button>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
                ~20 KB • Node.js required
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Comparison Table */}
        <div className="max-w-4xl mx-auto mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Choose the Right Option</CardTitle>
              <CardDescription className="text-center">
                Compare features to find what works best for your setup
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold text-slate-900 dark:text-slate-100">Feature</th>
                      <th className="text-center p-3 font-semibold text-blue-900 dark:text-blue-100">Complete App</th>
                      <th className="text-center p-3 font-semibold text-green-900 dark:text-green-100">Agent Only</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    <tr className="border-b">
                      <td className="p-3 text-slate-600 dark:text-slate-300">Web Interface</td>
                      <td className="p-3 text-center">
                        <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-slate-400">Web Only</span>
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 text-slate-600 dark:text-slate-300">Network Monitoring</td>
                      <td className="p-3 text-center">
                        <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                      </td>
                      <td className="p-3 text-center">
                        <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 text-slate-600 dark:text-slate-300">Offline Functionality</td>
                      <td className="p-3 text-center">
                        <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-slate-400">No</span>
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 text-slate-600 dark:text-slate-300">Setup Complexity</td>
                      <td className="p-3 text-center text-green-600 font-medium">Easy</td>
                      <td className="p-3 text-center text-orange-600 font-medium">Technical</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 text-slate-600 dark:text-slate-300">File Size</td>
                      <td className="p-3 text-center text-slate-600 dark:text-slate-300">~50 MB</td>
                      <td className="p-3 text-center text-slate-600 dark:text-slate-300">~20 KB</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-slate-600 dark:text-slate-300">Best For</td>
                      <td className="p-3 text-center text-blue-600 font-medium">Everyone</td>
                      <td className="p-3 text-center text-green-600 font-medium">Developers</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Shield className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle>Completely Offline</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 dark:text-slate-300">
                No cloud dependencies. All data stays on your computer. Works without internet connection.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Monitor className="h-8 w-8 text-green-600 mb-2" />
              <CardTitle>Native Windows App</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 dark:text-slate-300">
                Professional installer, desktop shortcuts, and system integration. Feels like any Windows program.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Zap className="h-8 w-8 text-purple-600 mb-2" />
              <CardTitle>Instant Setup</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 dark:text-slate-300">
                Double-click to install. No configuration needed. Network monitoring starts automatically.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Installation Steps */}
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Easy Installation</CardTitle>
            <CardDescription className="text-center">
              Get up and running in under 5 minutes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-300">1</span>
                </div>
                <h3 className="font-semibold mb-2">Download</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Click the download button to get the installer file
                </p>
              </div>
              <div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold text-green-600 dark:text-green-300">2</span>
                </div>
                <h3 className="font-semibold mb-2">Install</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Run the installer as Administrator. Choose your installation location
                </p>
              </div>
              <div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold text-purple-600 dark:text-purple-300">3</span>
                </div>
                <h3 className="font-semibold mb-2">Launch</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Double-click the desktop shortcut. Your network will be scanned automatically
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto mt-12">
          <h2 className="text-2xl font-bold text-center mb-8 text-slate-900 dark:text-slate-100">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Do I need the web version if I have the desktop app?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 dark:text-slate-300">
                  No. The desktop app includes everything from the web version plus the monitoring agent. 
                  It's completely self-contained.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I use this on multiple computers?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 dark:text-slate-300">
                  Yes. Install on as many computers as needed. Each installation monitors its own network 
                  and maintains separate data.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Is my data secure?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 dark:text-slate-300">
                  Completely. All data stays on your computer. No information is sent to external servers. 
                  The app works entirely offline.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}