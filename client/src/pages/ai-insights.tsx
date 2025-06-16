import { AIInsightsDashboard } from '@/components/ai-insights-dashboard';

export default function AIInsights() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">AI Insights</h1>
          <p className="text-muted-foreground mt-2">
            Intelligent monitoring and predictions from your specialized AI agents
          </p>
        </div>
        
        <AIInsightsDashboard />
      </div>
    </div>
  );
}