'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, AlertTriangle, Play, Shield, Clock, Zap } from 'lucide-react';

interface AutomationAction {
  type: 'open_url' | 'dom_instruction' | 'script_recommendation';
  id: string;
  title: string;
  url?: string;
  target?: string;
  rationale?: string;
  preview?: string;
  instruction?: string;
  caution?: string;
  shell?: string;
  os?: string;
  script?: string;
  explanation?: string;
  dryRun?: boolean;
  safetyNotes?: string;
}

interface AutomationPlan {
  summary: string;
  actions: AutomationAction[];
}

interface AutomationResultProps {
  plan: AutomationPlan;
  onApprove: (actionId: string) => void;
  onExecute: (actionId: string) => void;
}

export function AutomationResult({ plan, onApprove, onExecute }: AutomationResultProps) {
  const [approvedActions, setApprovedActions] = useState<Set<string>>(new Set());
  const [executingActions, setExecutingActions] = useState<Set<string>>(new Set());

  const handleApprove = (actionId: string) => {
    setApprovedActions(prev => new Set(prev).add(actionId));
    onApprove(actionId);
  };

  const handleExecute = (actionId: string) => {
    setExecutingActions(prev => new Set(prev).add(actionId));
    onExecute(actionId);
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'open_url':
        return <Zap className="w-4 h-4" />;
      case 'dom_instruction':
        return <Shield className="w-4 h-4" />;
      case 'script_recommendation':
        return <Play className="w-4 h-4" />;
      default:
        return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getRiskColor = (type: string) => {
    switch (type) {
      case 'script_recommendation':
        return 'destructive'; // Red for scripts (higher risk)
      case 'open_url':
        return 'secondary'; // Gray for URLs (low risk)
      case 'dom_instruction':
        return 'default'; // Blue for instructions (medium risk)
      default:
        return 'secondary';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-600" />
          Safe Automation Plan
        </CardTitle>
        <p className="text-sm text-muted-foreground">{plan.summary}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {plan.actions.map((action, index) => (
          <div key={action.id} className="border rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {getActionIcon(action.type)}
                <h4 className="font-medium">{action.title}</h4>
                <Badge variant={getRiskColor(action.type) as any} className="text-xs">
                  {action.type.replace('_', ' ')}
                </Badge>
              </div>

              <div className="flex items-center gap-1">
                {action.type === 'script_recommendation' && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {action.shell || 'bash'}
                  </Badge>
                )}
                {approvedActions.has(action.id) && (
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Approved
                  </Badge>
                )}
                {executingActions.has(action.id) && (
                  <Badge variant="default" className="text-xs">
                    <Play className="w-3 h-3 mr-1" />
                    Executing...
                  </Badge>
                )}
              </div>
            </div>

            {/* Action details */}
            <div className="space-y-2 mb-4">
              {action.explanation && (
                <p className="text-sm text-muted-foreground">{action.explanation}</p>
              )}

              {action.url && (
                <div className="text-sm">
                  <span className="font-medium">URL: </span>
                  <code className="bg-muted px-1 py-0.5 rounded text-xs">{action.url}</code>
                </div>
              )}

              {action.script && (
                <div className="text-sm">
                  <span className="font-medium">Command: </span>
                  <code className="bg-muted px-2 py-1 rounded text-xs block font-mono whitespace-pre-wrap">
                    {action.script}
                  </code>
                </div>
              )}

              {action.instruction && (
                <div className="text-sm">
                  <span className="font-medium">Instruction: </span>
                  <span className="text-muted-foreground">{action.instruction}</span>
                </div>
              )}

              {action.safetyNotes && (
                <div className="flex items-start gap-2 p-2 bg-blue-50 rounded">
                  <AlertTriangle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-800">{action.safetyNotes}</p>
                </div>
              )}

              {action.caution && (
                <div className="flex items-start gap-2 p-2 bg-yellow-50 rounded">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-yellow-800">{action.caution}</p>
                </div>
              )}
            </div>

            <Separator className="my-3" />

            {/* Action buttons */}
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Action {index + 1} of {plan.actions.length}
              </div>

              <div className="flex gap-2">
                {!approvedActions.has(action.id) ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleApprove(action.id)}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleExecute(action.id)}
                    disabled={executingActions.has(action.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Play className="w-4 h-4 mr-1" />
                    {executingActions.has(action.id) ? 'Executing...' : 'Execute'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}

        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
          <Shield className="w-5 h-5 text-green-600" />
          <p className="text-sm text-green-800">
            <strong>All actions require your explicit approval</strong> and will be executed safely
            through the Desktop Helper with full audit logging.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
