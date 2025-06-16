import { AIInsightsDashboard } from '@/components/ai-insights-dashboard';
import { SystemHealthMonitor } from '@/components/system-health-monitor';
import { NetworkDiagnosticTool } from '@/components/network-diagnostic-tool';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Home } from 'lucide-react';
import { Link } from 'wouter';

export default function AIInsights() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">AI Insights</h1>
                <p className="text-muted-foreground mt-1">
                  Intelligent monitoring and predictions from your specialized AI agents
                </p>
              </div>
            </div>
            <Link href="/">
              <Button variant="ghost" size="sm">
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
        
        <Tabs defaultValue="insights" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
            <TabsTrigger value="health">System Health</TabsTrigger>
            <TabsTrigger value="diagnostics">Network Diagnostics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="insights">
            <AIInsightsDashboard />
          </TabsContent>
          
          <TabsContent value="health">
            <SystemHealthMonitor />
          </TabsContent>
          
          <TabsContent value="diagnostics">
            <NetworkDiagnosticTool />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}