'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Star,
  Share
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';

export interface FixletStep {
  id: string;
  title: string;
  description?: string;
  actions: string[];
  expectedResult?: string;
  estimatedTime: string;
  category: string;
  os?: string;
  successCriteria?: string[];
  stepOrder: number;
}

export interface Fixlet {
  id: string;
  title: string;
  description?: string;
  category: string;
  difficulty: string;
  estimatedTime: string;
  tags: string[];
  authorId: string;
  isPublic: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
  steps: FixletStep[];
}

interface ExecutionStep {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  notes?: string;
  error?: string;
}

interface FixletViewerProps {
  fixlet: Fixlet;
  isReadOnly?: boolean;
  isShared?: boolean;
  onExecute?: (fixletId: string) => Promise<void>;
  onRate?: (fixletId: string, rating: number, review?: string) => Promise<void>;
  onShare?: (fixletId: string) => void;
}

export function FixletViewer({
  fixlet,
  isReadOnly = false,
  isShared = false,
  onExecute,
  onRate,
  onShare,
}: FixletViewerProps) {
  const [executionSteps, setExecutionSteps] = useState<Map<string, ExecutionStep>>(new Map());
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [executionProgress, setExecutionProgress] = useState(0);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [userRating, setUserRating] = useState<number>(0);
  const [userReview, setUserReview] = useState('');

  const startExecution = async () => {
    setIsExecuting(true);
    setExecutionProgress(0);
    setCurrentStep(fixlet.steps[0]?.id || null);

    // Initialize execution steps
    const initialExecutionSteps = new Map<string, ExecutionStep>();
    fixlet.steps.forEach(step => {
      initialExecutionSteps.set(step.id, {
        stepId: step.id,
        status: 'pending',
      });
    });
    setExecutionSteps(initialExecutionSteps);

    try {
      await onExecute?.(fixlet.id);
      toast.success('Fixlet execution started!');
    } catch (error) {
      toast.error('Failed to start fixlet execution');
      setIsExecuting(false);
      setCurrentStep(null);
    }
  };

  const markStepCompleted = (stepId: string, success: boolean, notes?: string) => {
    setExecutionSteps(prev => {
      const updated = new Map(prev);
      const step = updated.get(stepId);
      if (step) {
        step.status = success ? 'completed' : 'failed';
        step.completedAt = new Date();
        step.notes = notes;
        if (!success) {
          step.error = 'Step failed';
        }
        updated.set(stepId, step);
      }
      return updated;
    });

    // Update progress
    const completedSteps = Array.from(executionSteps.values()).filter(
      step => step.status === 'completed' || step.status === 'failed'
    ).length;
    setExecutionProgress((completedSteps / fixlet.steps.length) * 100);

    // Move to next step
    const currentIndex = fixlet.steps.findIndex(step => step.id === stepId);
    if (currentIndex < fixlet.steps.length - 1) {
      const nextStep = fixlet.steps[currentIndex + 1];
      setCurrentStep(nextStep.id);

      // Auto-expand next step
      setExpandedSteps(prev => new Set(prev).add(nextStep.id));
    } else {
      setCurrentStep(null);
      setIsExecuting(false);
      toast.success('Fixlet execution completed!');
    }
  };

  const toggleStepExpansion = (stepId: string) => {
    setExpandedSteps(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(stepId)) {
        newExpanded.delete(stepId);
      } else {
        newExpanded.add(stepId);
      }
      return newExpanded;
    });
  };

  const getStepStatus = (stepId: string) => {
    return executionSteps.get(stepId)?.status || 'pending';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />;
      case 'running':
        return <Play className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'skipped':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
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
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleRating = async () => {
    if (userRating === 0) {
      toast.error('Please select a rating');
      return;
    }

    try {
      await onRate?.(fixlet.id, userRating, userReview || undefined);
      toast.success('Thank you for your rating!');
    } catch (error) {
      toast.error('Failed to submit rating');
    }
  };

  return (
    <div className="space-y-6">
      {/* Fixlet Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{fixlet.title}</CardTitle>
              <CardDescription className="text-base mt-2">
                {fixlet.description}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{fixlet.category}</Badge>
              <Badge variant="outline">{fixlet.difficulty}</Badge>
              <Badge variant="outline">{fixlet.estimatedTime}</Badge>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>Used {fixlet.usageCount} times</span>
              <span>Created {new Date(fixlet.createdAt).toLocaleDateString()}</span>
              {isShared && <Badge variant="secondary">Shared</Badge>}
            </div>

            <div className="flex items-center gap-2">
              {!isReadOnly && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => onShare?.(fixlet.id)}
                    className="flex items-center gap-2"
                  >
                    <Share className="h-4 w-4" />
                    Share
                  </Button>
                  <Button
                    onClick={startExecution}
                    disabled={isExecuting}
                    className="flex items-center gap-2"
                  >
                    <Play className="h-4 w-4" />
                    {isExecuting ? 'Executing...' : 'Execute Fixlet'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Execution Progress */}
      {isExecuting && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Execution Progress</span>
                <span>{Math.round(executionProgress)}%</span>
              </div>
              <Progress value={executionProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Steps ({fixlet.steps.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96 w-full">
            <div className="space-y-4">
              {fixlet.steps.map((step, index) => {
                const status = getStepStatus(step.id);
                const isExpanded = expandedSteps.has(step.id);
                const isCurrentStep = currentStep === step.id;

                return (
                  <Collapsible
                    key={step.id}
                    open={isExpanded}
                    onOpenChange={() => toggleStepExpansion(step.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                        isCurrentStep ? 'bg-blue-50 border-blue-200' :
                        status === 'completed' ? 'bg-green-50 border-green-200' :
                        status === 'failed' ? 'bg-red-50 border-red-200' :
                        'bg-white'
                      }`}>
                        <div className="flex items-center gap-3">
                          {isExpanded ?
                            <ChevronDown className="h-4 w-4 text-gray-400" /> :
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          }
                          {getStatusIcon(status)}
                          <div>
                            <div className="font-medium text-sm">
                              {index + 1}. {step.title}
                            </div>
                            <div className="text-xs text-gray-500">
                              {step.estimatedTime} • {step.category}
                              {step.os && ` • ${step.os}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs ${getStatusColor(status)}`}>
                            {status}
                          </Badge>
                          {!isReadOnly && isExecuting && isCurrentStep && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markStepCompleted(step.id, true);
                                }}
                              >
                                ✓
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markStepCompleted(step.id, false);
                                }}
                              >
                                ✗
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="px-4 pb-4">
                      <div className="ml-8 space-y-3">
                        {step.description && (
                          <div>
                            <div className="text-sm font-medium mb-1">Description:</div>
                            <p className="text-sm text-gray-700">{step.description}</p>
                          </div>
                        )}

                        <div>
                          <div className="text-sm font-medium mb-1">Actions:</div>
                          <ol className="list-decimal list-inside text-sm space-y-1">
                            {step.actions.map((action, actionIndex) => (
                              <li key={actionIndex} className="text-gray-700">{action}</li>
                            ))}
                          </ol>
                        </div>

                        {step.expectedResult && (
                          <div>
                            <div className="text-sm font-medium mb-1">Expected Result:</div>
                            <p className="text-sm text-gray-700">{step.expectedResult}</p>
                          </div>
                        )}

                        {executionSteps.get(step.id)?.notes && (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>Execution Notes:</strong> {executionSteps.get(step.id)?.notes}
                            </AlertDescription>
                          </Alert>
                        )}

                        {executionSteps.get(step.id)?.error && (
                          <Alert className="border-red-200 bg-red-50">
                            <XCircle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>Error:</strong> {executionSteps.get(step.id)?.error}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Rating Section */}
      {!isReadOnly && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Rate This Fixlet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setUserRating(star)}
                      className={`text-2xl ${star <= userRating ? 'text-yellow-400' : 'text-gray-300'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <textarea
                  value={userReview}
                  onChange={(e) => setUserReview(e.target.value)}
                  placeholder="Share your experience with this fixlet (optional)"
                  className="w-full p-3 border rounded-md resize-none"
                  rows={3}
                />
              </div>
              <Button onClick={handleRating} disabled={userRating === 0}>
                Submit Rating
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tags */}
      {fixlet.tags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {fixlet.tags.map((tag, index) => (
                <Badge key={index} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
