'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RotateCcw, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Trash2,
  Play,
  Loader2,
  History,
  Shield,
  Tag
} from 'lucide-react';

interface RollbackPoint {
  id: string;
  name: string;
  description: string;
  timestamp: Date;
  actions: number;
  canRollback: boolean;
  rollbackEstimatedTime: number;
  tags: string[];
  systemState: {
    platform: string;
    browserVersion?: string;
  };
}

interface RollbackExecution {
  id: string;
  rollbackPointId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'partial';
  startTime: Date;
  endTime?: Date;
  totalActions: number;
  completedActions: number;
  failedActions: number;
  progress: number;
  errors: Array<{
    actionId: string;
    error: string;
    timestamp: Date;
  }>;
  warnings: Array<{
    actionId: string;
    warning: string;
    timestamp: Date;
  }>;
}

interface RollbackManagerProps {
  onExecuteRollback: (rollbackPointId: string) => void;
  onDeleteRollbackPoint: (rollbackPointId: string) => void;
  isExecuting?: boolean;
  executingRollbackId?: string;
}

// Mock data - in real implementation, this would come from the rollback system
const SAMPLE_ROLLBACK_POINTS: RollbackPoint[] = [
  {
    id: 'rollback-1',
    name: 'Browser Cache Clear',
    description: 'Before clearing browser cache and cookies',
    timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    actions: 6,
    canRollback: true,
    rollbackEstimatedTime: 45,
    tags: ['browser', 'cache'],
    systemState: {
      platform: 'macos',
      browserVersion: 'Chrome 120.0.6099.109'
    }
  },
  {
    id: 'rollback-2',
    name: 'Network Settings Reset',
    description: 'Before resetting network configuration',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    actions: 3,
    canRollback: true,
    rollbackEstimatedTime: 120,
    tags: ['network', 'system'],
    systemState: {
      platform: 'macos'
    }
  },
  {
    id: 'rollback-3',
    name: 'System File Cleanup',
    description: 'Before cleaning temporary system files',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
    actions: 8,
    canRollback: false,
    rollbackEstimatedTime: 180,
    tags: ['system', 'cleanup'],
    systemState: {
      platform: 'macos'
    }
  }
];

const SAMPLE_EXECUTIONS: RollbackExecution[] = [
  {
    id: 'exec-1',
    rollbackPointId: 'rollback-1',
    status: 'completed',
    startTime: new Date(Date.now() - 10 * 60 * 1000),
    endTime: new Date(Date.now() - 9 * 60 * 1000),
    totalActions: 6,
    completedActions: 6,
    failedActions: 0,
    progress: 100,
    errors: [],
    warnings: []
  }
];

export function RollbackManager({ 
  onExecuteRollback, 
  onDeleteRollbackPoint, 
  isExecuting, 
  executingRollbackId 
}: RollbackManagerProps) {
  const [selectedTab, setSelectedTab] = useState('points');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'partial':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <RotateCcw className="h-6 w-6 text-blue-500" />
          <h2 className="text-2xl font-bold">Rollback Manager</h2>
        </div>
        <p className="text-gray-600">
          Manage and execute rollbacks for automated actions
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="points" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Rollback Points ({SAMPLE_ROLLBACK_POINTS.length})
          </TabsTrigger>
          <TabsTrigger value="executions" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Executions ({SAMPLE_EXECUTIONS.length})
          </TabsTrigger>
        </TabsList>

        {/* Rollback Points Tab */}
        <TabsContent value="points" className="space-y-4">
          {SAMPLE_ROLLBACK_POINTS.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <History className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No rollback points</h3>
                <p className="text-gray-500 text-center">
                  Rollback points are automatically created before executing automation actions
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {SAMPLE_ROLLBACK_POINTS.map((point) => (
                <Card key={point.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <History className="h-5 w-5" />
                          {point.name}
                        </CardTitle>
                        <CardDescription>{point.description}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {point.canRollback ? (
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                            <Shield className="h-3 w-3 mr-1" />
                            Rollback Available
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                            <XCircle className="h-3 w-3 mr-1" />
                            Non-reversible
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Point Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Created:</span>
                        <div className="text-gray-600">{formatRelativeTime(point.timestamp)}</div>
                      </div>
                      <div>
                        <span className="font-medium">Actions:</span>
                        <div className="text-gray-600">{point.actions}</div>
                      </div>
                      <div>
                        <span className="font-medium">Est. Time:</span>
                        <div className="text-gray-600">{formatTime(point.rollbackEstimatedTime)}</div>
                      </div>
                      <div>
                        <span className="font-medium">Platform:</span>
                        <div className="text-gray-600">{point.systemState.platform}</div>
                      </div>
                    </div>

                    {/* Tags */}
                    {point.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {point.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            <Tag className="h-2 w-2 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* System State */}
                    {point.systemState.browserVersion && (
                      <div className="text-xs text-gray-500">
                        <strong>Browser:</strong> {point.systemState.browserVersion}
                      </div>
                    )}

                    {/* Warning for non-reversible actions */}
                    {!point.canRollback && (
                      <Alert className="border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Non-reversible Actions</AlertTitle>
                        <AlertDescription>
                          This rollback point contains actions that cannot be automatically reversed.
                          Manual intervention may be required.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="text-xs text-gray-500">
                        Created {point.timestamp.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDeleteRollbackPoint(point.id)}
                          className="flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                        <Button
                          onClick={() => onExecuteRollback(point.id)}
                          disabled={!point.canRollback || isExecuting}
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          {isExecuting && executingRollbackId === point.id ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Rolling back...
                            </>
                          ) : (
                            <>
                              <RotateCcw className="h-3 w-3" />
                              Execute Rollback
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Executions Tab */}
        <TabsContent value="executions" className="space-y-4">
          {SAMPLE_EXECUTIONS.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Play className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No rollback executions</h3>
                <p className="text-gray-500 text-center">
                  Rollback execution history will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {SAMPLE_EXECUTIONS.map((execution) => {
                const rollbackPoint = SAMPLE_ROLLBACK_POINTS.find(p => p.id === execution.rollbackPointId);
                
                return (
                  <Card key={execution.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {getStatusIcon(execution.status)}
                            Rollback Execution
                          </CardTitle>
                          <CardDescription>
                            {rollbackPoint?.name || 'Unknown rollback point'}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className={getStatusColor(execution.status)}>
                          {execution.status.toUpperCase()}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Progress */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Progress</span>
                          <span>{execution.completedActions} / {execution.totalActions} actions</span>
                        </div>
                        <Progress value={execution.progress} className="h-2" />
                      </div>

                      {/* Execution Details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Started:</span>
                          <div className="text-gray-600">{execution.startTime.toLocaleTimeString()}</div>
                        </div>
                        <div>
                          <span className="font-medium">Duration:</span>
                          <div className="text-gray-600">
                            {execution.endTime 
                              ? formatTime(Math.floor((execution.endTime.getTime() - execution.startTime.getTime()) / 1000))
                              : 'Running...'
                            }
                          </div>
                        </div>
                        <div>
                          <span className="font-medium">Completed:</span>
                          <div className="text-green-600">{execution.completedActions}</div>
                        </div>
                        <div>
                          <span className="font-medium">Failed:</span>
                          <div className="text-red-600">{execution.failedActions}</div>
                        </div>
                      </div>

                      {/* Errors */}
                      {execution.errors.length > 0 && (
                        <Alert className="border-red-200 bg-red-50">
                          <XCircle className="h-4 w-4" />
                          <AlertTitle>Errors ({execution.errors.length})</AlertTitle>
                          <AlertDescription>
                            <ScrollArea className="h-24 w-full mt-2">
                              <div className="space-y-1">
                                {execution.errors.map((error, index) => (
                                  <div key={index} className="text-xs">
                                    <strong>{error.actionId}:</strong> {error.error}
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Warnings */}
                      {execution.warnings.length > 0 && (
                        <Alert className="border-yellow-200 bg-yellow-50">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Warnings ({execution.warnings.length})</AlertTitle>
                          <AlertDescription>
                            <ScrollArea className="h-24 w-full mt-2">
                              <div className="space-y-1">
                                {execution.warnings.map((warning, index) => (
                                  <div key={index} className="text-xs">
                                    <strong>{warning.actionId}:</strong> {warning.warning}
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
