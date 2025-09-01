'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface PlaybookExecution {
  id: string;
  playbookId: string;
  title: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  totalSteps: number;
  completedSteps: number;
  currentStep?: string;
  steps: Map<string, ExecutionProgress>;
  overallProgress: number;
  estimatedTimeRemaining: number;
  canRollback: boolean;
}

interface ExecutionProgress {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  progress: number;
  message?: string;
  error?: string;
  result?: any;
  screenshot?: string;
}

interface PlaybookExecutionProps {
  execution: PlaybookExecution;
  onCancel?: (executionId: string) => void;
  onRollback?: (executionId: string) => void;
  onRestart?: (executionId: string) => void;
}

export function PlaybookExecution({ 
  execution, 
  onCancel, 
  onRollback, 
  onRestart 
}: PlaybookExecutionProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [autoScroll, setAutoScroll] = useState(true);

  const toggleStepExpansion = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

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
      case 'skipped':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'cancelled':
        return <Square className="h-4 w-4 text-gray-500" />;
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
      case 'skipped': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDuration = (start: Date, end?: Date): string => {
    const endTime = end || new Date();
    const duration = Math.floor((endTime.getTime() - start.getTime()) / 1000);
    return formatTime(duration);
  };

  const steps = Array.from(execution.steps.values()).sort((a, b) => {
    // Sort by status priority (running first, then by step order)
    const statusPriority = { running: 0, failed: 1, completed: 2, pending: 3, skipped: 4 };
    return (statusPriority[a.status as keyof typeof statusPriority] || 5) - 
           (statusPriority[b.status as keyof typeof statusPriority] || 5);
  });

  // Auto-expand current/failed steps
  useEffect(() => {
    const newExpanded = new Set(expandedSteps);
    steps.forEach(step => {
      if (step.status === 'running' || step.status === 'failed') {
        newExpanded.add(step.stepId);
      }
    });
    setExpandedSteps(newExpanded);
  }, [execution.currentStep, steps]);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(execution.status)}
              {execution.title}
            </CardTitle>
            <CardDescription>
              Playbook Execution • Started {execution.startTime.toLocaleTimeString()}
            </CardDescription>
          </div>
          <Badge variant="outline" className={getStatusColor(execution.status)}>
            {execution.status.toUpperCase()}
          </Badge>
        </div>

        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Overall Progress</span>
            <span>{execution.completedSteps} / {execution.totalSteps} steps</span>
          </div>
          <Progress value={execution.overallProgress} className="h-2" />
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {execution.status === 'running' && execution.estimatedTimeRemaining > 0 && (
                `Est. ${formatTime(execution.estimatedTimeRemaining)} remaining`
              )}
              {execution.endTime && (
                `Completed in ${formatDuration(execution.startTime, execution.endTime)}`
              )}
              {execution.status === 'running' && !execution.endTime && (
                `Running for ${formatDuration(execution.startTime)}`
              )}
            </span>
            <span>{execution.overallProgress}%</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {execution.status === 'running' && onCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCancel(execution.id)}
              className="flex items-center gap-1"
            >
              <Square className="h-3 w-3" />
              Cancel
            </Button>
          )}
          
          {(execution.status === 'completed' || execution.status === 'failed') && onRestart && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRestart(execution.id)}
              className="flex items-center gap-1"
            >
              <Play className="h-3 w-3" />
              Restart
            </Button>
          )}

          {execution.canRollback && execution.status !== 'pending' && onRollback && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRollback(execution.id)}
              className="flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Rollback
            </Button>
          )}
        </div>

        {/* Steps List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Execution Steps</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoScroll(!autoScroll)}
              className="text-xs"
            >
              Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
            </Button>
          </div>

          <ScrollArea className="h-96 w-full border rounded-md">
            <div className="p-4 space-y-2">
              {steps.map((step) => (
                <Collapsible
                  key={step.stepId}
                  open={expandedSteps.has(step.stepId)}
                  onOpenChange={() => toggleStepExpansion(step.stepId)}
                >
                  <CollapsibleTrigger asChild>
                    <div className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                      step.status === 'running' ? 'bg-blue-50 border-blue-200' : 
                      step.status === 'failed' ? 'bg-red-50 border-red-200' : 
                      step.status === 'completed' ? 'bg-green-50 border-green-200' : 
                      'bg-white'
                    }`}>
                      <div className="flex items-center gap-3">
                        {expandedSteps.has(step.stepId) ? 
                          <ChevronDown className="h-4 w-4 text-gray-400" /> : 
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        }
                        {getStatusIcon(step.status)}
                        <div>
                          <div className="font-medium text-sm">Step {step.stepId}</div>
                          {step.message && (
                            <div className="text-xs text-gray-500">{step.message}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {step.status === 'running' && (
                          <Progress value={step.progress} className="w-20 h-2" />
                        )}
                        <Badge variant="outline" className={`text-xs ${getStatusColor(step.status)}`}>
                          {step.status}
                        </Badge>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="px-3 pb-3">
                    <div className="ml-10 space-y-2">
                      {step.startTime && (
                        <div className="text-xs text-gray-500">
                          Started: {step.startTime.toLocaleTimeString()}
                          {step.endTime && (
                            <span> • Duration: {formatDuration(step.startTime, step.endTime)}</span>
                          )}
                        </div>
                      )}

                      {step.error && (
                        <Alert className="border-red-200 bg-red-50">
                          <XCircle className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            <strong>Error:</strong> {step.error}
                          </AlertDescription>
                        </Alert>
                      )}

                      {step.result && (
                        <div className="bg-gray-50 p-3 rounded-md">
                          <div className="text-xs font-medium mb-1">Result:</div>
                          <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                            {typeof step.result === 'object' 
                              ? JSON.stringify(step.result, null, 2)
                              : String(step.result)
                            }
                          </pre>
                        </div>
                      )}

                      {step.screenshot && (
                        <div className="bg-gray-50 p-3 rounded-md">
                          <div className="text-xs font-medium mb-2">Screenshot:</div>
                          <img 
                            src={step.screenshot} 
                            alt="Step screenshot" 
                            className="max-w-full h-auto rounded border"
                          />
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Summary */}
        {(execution.status === 'completed' || execution.status === 'failed') && (
          <Alert className={execution.status === 'completed' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            {execution.status === 'completed' ? 
              <CheckCircle className="h-4 w-4" /> : 
              <XCircle className="h-4 w-4" />
            }
            <AlertDescription>
              <strong>
                {execution.status === 'completed' ? 'Playbook completed successfully!' : 'Playbook execution failed.'}
              </strong>
              <br />
              {execution.completedSteps} of {execution.totalSteps} steps completed
              {execution.endTime && (
                <span> in {formatDuration(execution.startTime, execution.endTime)}</span>
              )}
              {execution.canRollback && execution.status === 'failed' && (
                <span>. You can rollback the changes using the Rollback button above.</span>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
