import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Brain, TrendingUp, Shield, Bot, MapPin, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AgentInsight {
  type: 'anomaly' | 'prediction' | 'automation' | 'coaching';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  actionable: boolean;
  action: string;
  confidence: number;
  deviceId?: number;
  timestamp: Date;
  agentName?: string;
  agentType?: string;
}

interface AgentStatus {
  name: string;
  type: string;
  status: string;
  insights: AgentInsight[];
  lastProcessed?: Date;
}

const severityColors = {
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
};

const typeIcons = {
  anomaly: AlertTriangle,
  prediction: TrendingUp,
  automation: Bot,
  coaching: Brain
};

const agentIcons = {
  'offline-detection': Shield,
  'signal-prediction': TrendingUp,
  'network-anomaly': AlertTriangle,
  'self-healing': Bot,
  'user-coaching': Brain,
  'mapping-intelligence': MapPin
};

export function AIInsightsDashboard() {
  const [selectedAgent, setSelectedAgent] = useState<string>('all');

  const { data: agentStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['/api/ai-agents/status'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: allInsights, isLoading: insightsLoading, refetch: refetchInsights } = useQuery({
    queryKey: ['/api/ai-agents/insights/all'],
    refetchInterval: 15000 // Refresh every 15 seconds
  });

  const handleRefresh = () => {
    refetchStatus();
    refetchInsights();
  };

  if (statusLoading || insightsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading AI insights...</p>
        </div>
      </div>
    );
  }

  const agents: AgentStatus[] = agentStatus?.agents || [];
  const insights: AgentInsight[] = allInsights?.insights || [];

  const filteredInsights = selectedAgent === 'all' 
    ? insights 
    : insights.filter(insight => insight.agentName === selectedAgent);

  const criticalInsights = insights.filter(i => i.severity === 'critical').length;
  const highInsights = insights.filter(i => i.severity === 'high').length;
  const activeAgents = agents.filter(a => a.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bot className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Active Agents</p>
                <p className="text-2xl font-bold">{activeAgents}/{agents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium">Critical Alerts</p>
                <p className="text-2xl font-bold text-red-600">{criticalInsights}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium">High Priority</p>
                <p className="text-2xl font-bold text-orange-600">{highInsights}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Total Insights</p>
                <p className="text-2xl font-bold">{insights.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Tabs defaultValue="insights" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="insights">Recent Insights</TabsTrigger>
            <TabsTrigger value="agents">Agent Status</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>AI Insights Feed</CardTitle>
                  <CardDescription>
                    Real-time insights from your intelligent monitoring agents
                  </CardDescription>
                </div>
                <select 
                  value={selectedAgent} 
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="px-3 py-2 border rounded-md bg-background"
                >
                  <option value="all">All Agents</option>
                  {agents.map(agent => (
                    <option key={agent.name} value={agent.name}>
                      {agent.type.replace('-', ' ')} Agent
                    </option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {filteredInsights.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No insights available yet</p>
                      <p className="text-sm">AI agents are monitoring your network...</p>
                    </div>
                  ) : (
                    filteredInsights.map((insight, index) => {
                      const TypeIcon = typeIcons[insight.type];
                      const AgentIcon = agentIcons[insight.agentType as keyof typeof agentIcons] || Bot;
                      
                      return (
                        <Card key={index} className="border-l-4 border-l-blue-500">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <TypeIcon className="h-4 w-4" />
                                <h4 className="font-semibold">{insight.title}</h4>
                                <Badge className={severityColors[insight.severity]}>
                                  {insight.severity}
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <AgentIcon className="h-3 w-3" />
                                <span>{insight.agentType?.replace('-', ' ')}</span>
                                <span>•</span>
                                <span>{formatDistanceToNow(new Date(insight.timestamp))} ago</span>
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-3">
                              {insight.description}
                            </p>
                            
                            {insight.actionable && insight.action && (
                              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                                <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
                                  Recommended Action:
                                </p>
                                <p className="text-sm text-blue-700 dark:text-blue-400">
                                  {insight.action}
                                </p>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between mt-3 pt-2 border-t">
                              <span className="text-xs text-muted-foreground">
                                Confidence: {Math.round(insight.confidence * 100)}%
                              </span>
                              {insight.deviceId && (
                                <Badge variant="outline">
                                  Device #{insight.deviceId}
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => {
              const AgentIcon = agentIcons[agent.name as keyof typeof agentIcons] || Bot;
              const recentInsights = agent.insights.slice(0, 3);
              
              return (
                <Card key={agent.name}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AgentIcon className="h-5 w-5" />
                        <CardTitle className="text-lg">
                          {agent.type.replace('-', ' ')} Agent
                        </CardTitle>
                      </div>
                      <Badge 
                        variant={agent.status === 'active' ? 'default' : 'secondary'}
                        className={agent.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {agent.status}
                      </Badge>
                    </div>
                    <CardDescription>
                      {agent.lastProcessed && (
                        <>Last active: {formatDistanceToNow(new Date(agent.lastProcessed))} ago</>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Total Insights:</span>
                        <span className="font-medium">{agent.insights.length}</span>
                      </div>
                      
                      {recentInsights.length > 0 && (
                        <>
                          <Separator />
                          <div>
                            <p className="text-sm font-medium mb-2">Recent Activity:</p>
                            <div className="space-y-1">
                              {recentInsights.map((insight, idx) => (
                                <div key={idx} className="text-xs text-muted-foreground">
                                  • {insight.title}
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Insight Distribution</CardTitle>
                <CardDescription>Breakdown by type and severity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(
                    insights.reduce((acc, insight) => {
                      acc[insight.type] = (acc[insight.type] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([type, count]) => {
                    const TypeIcon = typeIcons[type as keyof typeof typeIcons];
                    const percentage = insights.length > 0 ? (count / insights.length) * 100 : 0;
                    
                    return (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <TypeIcon className="h-4 w-4" />
                          <span className="capitalize">{type}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8">{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Agent Performance</CardTitle>
                <CardDescription>Insights generated per agent</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {agents.map((agent) => {
                    const maxInsights = Math.max(...agents.map(a => a.insights.length), 1);
                    const percentage = (agent.insights.length / maxInsights) * 100;
                    const AgentIcon = agentIcons[agent.name as keyof typeof agentIcons] || Bot;
                    
                    return (
                      <div key={agent.name} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <AgentIcon className="h-4 w-4" />
                          <span className="text-sm">{agent.type.replace('-', ' ')}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8">{agent.insights.length}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}