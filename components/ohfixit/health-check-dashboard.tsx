'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  HardDrive, 
  Wifi, 
  Zap, 
  Globe, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  Info,
  Wrench
} from 'lucide-react';
import { healthCheckEngine, type HealthCheckSummary, type HealthCheckResult } from '@/lib/ohfixit/health-check-engine';
import { toast } from 'sonner';

interface HealthCheckDashboardProps {
  onFixIssue?: (checkId: string) => void;
  autoRun?: boolean;
}

export function HealthCheckDashboard({ onFixIssue, autoRun = false }: HealthCheckDashboardProps) {
  const [summary, setSummary] = useState<HealthCheckSummary | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (autoRun) {
      runHealthChecks();
    }
  }, [autoRun]);

  const runHealthChecks = async () => {
    setIsRunning(true);
    try {
      const result = await healthCheckEngine.runAllChecks();
      setSummary(result);
      toast.success('Health check completed');
    } catch (error) {
      toast.error('Health check failed');
      console.error('Health check error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: HealthCheckResult['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: HealthCheckResult['status']) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getCategoryIcon = (category: HealthCheckResult['category']) => {
    switch (category) {
      case 'system':
        return <HardDrive className="h-4 w-4" />;
      case 'network':
        return <Wifi className="h-4 w-4" />;
      case 'security':
        return <Shield className="h-4 w-4" />;
      case 'performance':
        return <Zap className="h-4 w-4" />;
      case 'browser':
        return <Globe className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const filteredChecks = summary?.checks.filter(check => 
    selectedCategory === 'all' || check.category === selectedCategory
  ) || [];

  const categories = [
    { id: 'all', name: 'All Checks', icon: Info },
    { id: 'system', name: 'System', icon: HardDrive },
    { id: 'network', name: 'Network', icon: Wifi },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'performance', name: 'Performance', icon: Zap },
    { id: 'browser', name: 'Browser', icon: Globe }
  ];

  if (!summary && !isRunning) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            System Health Check
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Run a comprehensive health check to identify potential issues before they become problems.
          </p>
        </CardHeader>
        <CardContent>
          <Button onClick={runHealthChecks} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Run Health Check
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Health Score */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              System Health Score
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={runHealthChecks}
              disabled={isRunning}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
              {isRunning ? 'Checking...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {summary && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="text-3xl font-bold">{summary.overallScore}/100</div>
                <div className="flex-1">
                  <Progress value={summary.overallScore} className="h-3" />
                </div>
                <Badge 
                  variant={summary.overallStatus === 'healthy' ? 'default' : 
                          summary.overallStatus === 'warning' ? 'secondary' : 'destructive'}
                  className="text-sm"
                >
                  {summary.overallStatus.charAt(0).toUpperCase() + summary.overallStatus.slice(1)}
                </Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-semibold text-green-600">{summary.healthyCount}</div>
                  <div className="text-sm text-muted-foreground">Healthy</div>
                </div>
                <div>
                  <div className="text-2xl font-semibold text-yellow-600">{summary.warningCount}</div>
                  <div className="text-sm text-muted-foreground">Warnings</div>
                </div>
                <div>
                  <div className="text-2xl font-semibold text-red-600">{summary.criticalCount}</div>
                  <div className="text-sm text-muted-foreground">Critical</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last checked: {summary.lastRunTime.toLocaleTimeString()}
                </div>
                <div>
                  Next check: {summary.nextRecommendedCheck.toLocaleDateString()}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Fixes */}
      {summary && summary.checks.some(c => c.fixable && (c.status === 'warning' || c.status === 'critical')) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Quick Fixes Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.checks
                .filter(check => check.fixable && (check.status === 'warning' || check.status === 'critical'))
                .slice(0, 3)
                .map(check => (
                  <div key={check.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(check.status)}
                      <div>
                        <div className="font-medium">{check.name}</div>
                        <div className="text-sm text-muted-foreground">{check.message}</div>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => onFixIssue?.(check.id)}
                      disabled={!onFixIssue}
                    >
                      Fix Now
                    </Button>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Results */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Results</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid w-full grid-cols-6">
              {categories.map(category => {
                const Icon = category.icon;
                const count = category.id === 'all' 
                  ? summary?.totalChecks 
                  : summary?.checks.filter(c => c.category === category.id).length;
                
                return (
                  <TabsTrigger key={category.id} value={category.id} className="text-xs">
                    <Icon className="h-3 w-3 mr-1" />
                    {category.name}
                    {count && <Badge variant="outline" className="ml-1 text-xs">{count}</Badge>}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value={selectedCategory} className="mt-4">
              <div className="space-y-3">
                {filteredChecks.map(check => (
                  <Card key={check.id} className="border-l-4" style={{
                    borderLeftColor: check.status === 'healthy' ? '#10b981' :
                                   check.status === 'warning' ? '#f59e0b' :
                                   check.status === 'critical' ? '#ef4444' : '#6b7280'
                  }}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(check.category)}
                            {getStatusIcon(check.status)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{check.name}</h4>
                              <Badge variant="outline" className="text-xs">
                                {check.category}
                              </Badge>
                              <div className="text-sm text-muted-foreground">
                                Score: {check.score}/100
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{check.message}</p>
                            
                            {check.details && (
                              <p className="text-xs text-muted-foreground mb-2">{check.details}</p>
                            )}
                            
                            {check.recommendation && (
                              <div className="bg-muted p-2 rounded text-xs">
                                <strong>Recommendation:</strong> {check.recommendation}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          {check.estimatedFixTime && (
                            <Badge variant="secondary" className="text-xs">
                              {check.estimatedFixTime}
                            </Badge>
                          )}
                          {check.fixable && (check.status === 'warning' || check.status === 'critical') && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => onFixIssue?.(check.id)}
                              disabled={!onFixIssue}
                            >
                              Fix
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* System Information */}
      {summary?.systemInfo && (
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Platform:</strong> {summary.systemInfo.platform}
              </div>
              <div>
                <strong>Architecture:</strong> {summary.systemInfo.arch}
              </div>
              <div>
                <strong>Memory:</strong> {summary.systemInfo.memory.total ? 
                  `${(summary.systemInfo.memory.total / (1024 * 1024 * 1024)).toFixed(1)} GB` : 
                  'Unknown'}
              </div>
              <div>
                <strong>Storage:</strong> {summary.systemInfo.storage.total ? 
                  `${(summary.systemInfo.storage.total / (1024 * 1024 * 1024)).toFixed(1)} GB` : 
                  'Unknown'}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
