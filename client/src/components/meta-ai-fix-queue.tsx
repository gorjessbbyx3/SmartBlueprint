import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Brain, CheckCircle, AlertTriangle, Clock, Zap, Shield } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface AIFix {
  id: string;
  reportId: string;
  systemId: string;
  fixDescription: string;
  status: 'queued' | 'testing' | 'success' | 'failed' | 'applied';
  testResults?: {
    passed: boolean;
    errors: string[];
    performance: number;
    safetyChecks: boolean;
  };
  appliedAt?: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedImpact: string;
  createdAt: Date;
}

interface VirtualEnvironment {
  id: string;
  isRunning: boolean;
  currentTest?: string;
  memoryUsage: number;
  cpuUsage: number;
  testCount: number;
  successRate: number;
}

interface MetaAIStats {
  totalReports: number;
  totalFixes: number;
  appliedFixes: number;
  successRate: number;
  queueLength: number;
  virtualEnvironment: VirtualEnvironment;
}

export function MetaAIFixQueue({ className = '' }: { className?: string }) {
  const { data: fixes = [] } = useQuery<AIFix[]>({
    queryKey: ['/api/meta-ai/fixes'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: virtualEnv } = useQuery<VirtualEnvironment>({
    queryKey: ['/api/meta-ai/virtual-environment'],
    refetchInterval: 3000, // Refresh every 3 seconds
  });

  const { data: stats } = useQuery<MetaAIStats>({
    queryKey: ['/api/meta-ai/statistics'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const getStatusIcon = (status: AIFix['status']) => {
    switch (status) {
      case 'queued':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'testing':
        return <Zap className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'applied':
        return <Shield className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: AIFix['status']) => {
    switch (status) {
      case 'queued':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'testing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'applied':
        return 'bg-green-100 text-green-900 border-green-300';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: AIFix['priority']) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (!fixes.length && !virtualEnv?.isRunning) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">Meta-AI Monitor</CardTitle>
            <Badge variant="outline" className="text-green-700 border-green-300">
              All Systems Operational
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-gray-500">
            <Shield className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p className="text-sm">All 7 AI systems running smoothly</p>
            <p className="text-xs text-gray-400 mt-1">No fixes required</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">Meta-AI Fix Queue</CardTitle>
            {fixes.length > 0 && (
              <Badge variant="outline" className="text-purple-700 border-purple-300">
                {fixes.length} Fixes
              </Badge>
            )}
          </div>
          
          {stats && (
            <div className="text-right text-xs text-gray-600">
              <div>Success Rate: {stats.successRate.toFixed(1)}%</div>
              <div>Applied: {stats.appliedFixes}/{stats.totalFixes}</div>
            </div>
          )}
        </div>

        {/* Virtual Environment Status */}
        {virtualEnv?.isRunning && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-blue-900">Virtual Testing Environment</span>
              </div>
              <span className="text-xs text-blue-700">Running</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-blue-600 mb-1">Memory Usage</div>
                <Progress value={virtualEnv.memoryUsage} className="h-1" />
                <span className="text-blue-700">{virtualEnv.memoryUsage}%</span>
              </div>
              <div>
                <div className="text-blue-600 mb-1">CPU Usage</div>
                <Progress value={virtualEnv.cpuUsage} className="h-1" />
                <span className="text-blue-700">{virtualEnv.cpuUsage}%</span>
              </div>
            </div>
            
            {virtualEnv.currentTest && (
              <div className="mt-2 text-xs text-blue-700">
                Testing: {virtualEnv.currentTest}
              </div>
            )}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-3 max-h-96 overflow-y-auto">
        {fixes.map((fix) => (
          <div key={fix.id} className="border border-gray-200 rounded-lg p-3 bg-white hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {getStatusIcon(fix.status)}
                  <span className="text-sm font-medium text-gray-900">
                    {fix.systemId.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                  <div className={`w-2 h-2 rounded-full ${getPriorityColor(fix.priority)}`} title={`${fix.priority} priority`}></div>
                </div>
                
                <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                  {fix.fixDescription}
                </p>
                
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{new Date(fix.createdAt).toLocaleTimeString()}</span>
                  {fix.appliedAt && (
                    <span className="text-green-600">
                      Applied {new Date(fix.appliedAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
              
              <Badge className={`text-xs ${getStatusColor(fix.status)}`}>
                {fix.status.charAt(0).toUpperCase() + fix.status.slice(1)}
              </Badge>
            </div>
            
            {fix.testResults && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Performance:</span>
                    <span className="ml-1 font-medium">{fix.testResults.performance.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Safety:</span>
                    <span className={`ml-1 font-medium ${fix.testResults.safetyChecks ? 'text-green-600' : 'text-red-600'}`}>
                      {fix.testResults.safetyChecks ? 'Passed' : 'Failed'}
                    </span>
                  </div>
                </div>
                
                {fix.testResults.errors.length > 0 && (
                  <div className="mt-1">
                    <details className="text-xs">
                      <summary className="text-red-600 cursor-pointer">
                        {fix.testResults.errors.length} Error{fix.testResults.errors.length > 1 ? 's' : ''}
                      </summary>
                      <div className="mt-1 text-red-500 bg-red-50 p-2 rounded text-xs">
                        {fix.testResults.errors.map((error, index) => (
                          <div key={index}>• {error}</div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            )}
            
            <div className="mt-2 text-xs text-gray-400">
              Impact: {fix.estimatedImpact}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}