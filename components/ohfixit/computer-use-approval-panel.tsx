'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle, Eye, Play, RotateCcw } from 'lucide-react';
import { createModuleLogger } from '@/lib/logger';

const log = createModuleLogger('computer-use-approval-panel');

interface ComputerUsePlan {
  id: string;
  task: string;
  targetApplication?: string;
  safetyCheck: boolean;
  steps: Array<{
    id: string;
    description: string;
    action: string;
    requiresApproval: boolean;
    risk: 'low' | 'medium' | 'high';
    rollbackStrategy?: string;
  }>;
  estimatedDuration: string;
  rollbackAvailable: boolean;
  createdAt: string;
}

interface ComputerUseApprovalPanelProps {
  plan: ComputerUsePlan;
  onApprove: (plan: ComputerUsePlan) => Promise<void>;
  onReject: (plan: ComputerUsePlan) => Promise<void>;
  onExecuteStep: (stepId: string) => Promise<void>;
  onRollback: (plan: ComputerUsePlan) => Promise<void>;
}

export function ComputerUseApprovalPanel({
  plan,
  onApprove,
  onReject,
  onExecuteStep,
  onRollback,
}: ComputerUseApprovalPanelProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [failedSteps, setFailedSteps] = useState<Set<string>>(new Set());

  const handleApprove = async () => {
    try {
      setIsExecuting(true);
      await onApprove(plan);
    } catch (error) {
      log.error({ error }, 'Failed to approve computer use plan');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleReject = async () => {
    try {
      await onReject(plan);
    } catch (error) {
      log.error({ error }, 'Failed to reject computer use plan');
    }
  };

  const handleExecuteStep = async (stepId: string) => {
    try {
      setIsExecuting(true);
      await onExecuteStep(stepId);
      setCompletedSteps(prev => new Set([...prev, stepId]));
    } catch (error) {
      log.error({ error, stepId }, 'Failed to execute step');
      setFailedSteps(prev => new Set([...prev, stepId]));
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRollback = async () => {
    try {
      setIsExecuting(true);
      await onRollback(plan);
    } catch (error) {
      log.error({ error }, 'Failed to rollback');
    } finally {
      setIsExecuting(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStepStatus = (stepId: string) => {
    if (completedSteps.has(stepId)) return 'completed';
    if (failedSteps.has(stepId)) return 'failed';
    return 'pending';
  };

  const getStepIcon = (stepId: string) => {
    const status = getStepStatus(stepId);
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Play className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Computer Use Plan Review
            </CardTitle>
            <CardDescription>
              Review and approve the automated computer actions before execution
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Plan ID: {plan.id}</Badge>
            <Badge variant="secondary">{plan.estimatedDuration}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Plan Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Task Summary</h4>
          <p className="text-sm text-gray-700 mb-2">{plan.task}</p>
          {plan.targetApplication && (
            <p className="text-sm text-gray-600">
              Target Application: <span className="font-medium">{plan.targetApplication}</span>
            </p>
          )}
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Safety Check: {plan.safetyCheck ? 'Enabled' : 'Disabled'}</span>
            </div>
            <div className="flex items-center gap-1">
              <RotateCcw className="h-4 w-4 text-blue-600" />
              <span className="text-sm">Rollback Available: {plan.rollbackAvailable ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          <h4 className="font-semibold">Execution Steps</h4>
          {plan.steps.map((step, index) => (
            <div
              key={step.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                {getStepIcon(step.id)}
                <div>
                  <p className="font-medium">{step.description}</p>
                  <p className="text-sm text-gray-600">Action: {step.action}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getRiskColor(step.risk)}>
                  {step.risk} risk
                </Badge>
                {step.requiresApproval && (
                  <Badge variant="outline">
                    <Eye className="h-3 w-3 mr-1" />
                    Approval Required
                  </Badge>
                )}
                {step.rollbackStrategy && (
                  <Badge variant="outline">
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Rollback Ready
                  </Badge>
                )}
                {step.requiresApproval && getStepStatus(step.id) === 'pending' && (
                  <Button
                    size="sm"
                    onClick={() => handleExecuteStep(step.id)}
                    disabled={isExecuting}
                  >
                    Execute
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleRollback}
              disabled={!plan.rollbackAvailable || isExecuting}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Rollback
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={isExecuting}
            >
              Reject Plan
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isExecuting}
            >
              {isExecuting ? 'Executing...' : 'Approve & Execute'}
            </Button>
          </div>
        </div>

        {/* Safety Notice */}
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h5 className="font-medium text-amber-800">Safety Notice</h5>
              <p className="text-sm text-amber-700 mt-1">
                All actions will be logged for audit purposes. You can rollback changes if something goes wrong.
                Only approved, safe actions will be executed.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
