import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Shield, Monitor, Wifi, Zap, CheckCircle } from "lucide-react";

export default function DownloadPage() {
  const handleDownload = () => {
    // In production, this would download the actual installer
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

        {/* Download Section */}
        <div className="max-w-4xl mx-auto mb-12">
          <Card className="border-2 border-blue-200 dark:border-blue-800 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl text-blue-900 dark:text-blue-100">
                    SmartBlueprint Pro Desktop
                  </CardTitle>
                  <CardDescription className="text-lg text-blue-700 dark:text-blue-300">
                    Complete standalone Windows application
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-sm">
                  Version 1.0.0
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">
                    What's Included
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>Complete web interface</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>Integrated network monitoring</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>Real-time device discovery</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>AI-powered analytics</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>Signal heatmap visualization</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>Windows Service option</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">
                    System Requirements
                  </h3>
                  <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                    <li>• Windows 7, 8, 10, 11 (32-bit or 64-bit)</li>
                    <li>• 4 GB RAM minimum</li>
                    <li>• 500 MB disk space</li>
                    <li>• Network adapter</li>
                    <li>• Administrator privileges for installation</li>
                  </ul>
                  
                  <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      <strong>File size:</strong> ~8 KB<br/>
                      <strong>Installation time:</strong> 2-3 minutes<br/>
                      <strong>License:</strong> Commercial use allowed
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 text-center">
                <Button 
                  onClick={handleDownload}
                  size="lg" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
                >
                  <Download className="mr-2 h-5 w-5" />
                  Download SmartBlueprint Pro Desktop
                </Button>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  Free download • No registration required
                </p>
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