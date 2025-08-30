"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type AutomationAction = import('@/lib/ai/tools/ohfixit/automation').AutomationAction;
type AutomationPlan = import('@/lib/ai/tools/ohfixit/automation').AutomationPlan;

export function AutomationPlanView({
  plan,
  className,
}: {
  plan: AutomationPlan;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<AutomationAction | null>(
    null,
  );

  return (
    <div className={cn('rounded border p-3 text-sm space-y-3', className)}>
      <div className="font-medium">{plan.summary}</div>
      <ul className="space-y-2">
        {plan.actions.map((a) => (
          <li key={a.id} className="border rounded p-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-medium">{a.title}</div>
                <div className="text-xs text-muted-foreground">
                  {a.type.replace('_', ' ')}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedAction(a);
                    setOpen(true);
                  }}
                >
                  Preview
                </Button>
                <Button size="sm" disabled title="Requires preview and consent">
                  Execute
                </Button>
              </div>
            </div>
            {'rationale' in a && a.rationale && (
              <div className="mt-1 text-xs text-muted-foreground">
                {a.rationale}
              </div>
            )}
            {'preview' in a && a.preview && (
              <div className="mt-1 text-xs text-muted-foreground">
                {a.preview}
              </div>
            )}
            {'instruction' in a && (
              <div className="mt-2 text-xs">
                <div className="font-medium">Instruction</div>
                <pre className="bg-muted p-2 rounded whitespace-pre-wrap">{a.instruction}</pre>
                {a.selector && (
                  <div className="text-muted-foreground mt-1">Selector: {a.selector}</div>
                )}
                {a.caution && (
                  <div className="text-amber-700 mt-1">Caution: {a.caution}</div>
                )}
              </div>
            )}
            {'script' in a && (
              <div className="mt-2 text-xs">
                <div className="font-medium">Script</div>
                <pre className="bg-muted p-2 rounded overflow-x-auto text-xs">
                  {a.script}
                </pre>
                <div className="text-muted-foreground mt-1">
                  Shell: {a.shell}
                  {a.os ? ` · OS: ${a.os}` : ''}
                </div>
                {a.explanation && (
                  <div className="mt-1">{a.explanation}</div>
                )}
                {a.safetyNotes && (
                  <div className="text-amber-700 mt-1">{a.safetyNotes}</div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Review action</DialogTitle>
            <DialogDescription>
              Nothing will run without your explicit approval.
            </DialogDescription>
          </DialogHeader>
          {selectedAction && (
            <div className="space-y-2 text-sm">
              <div className="font-medium">{selectedAction.title}</div>
              <div className="text-muted-foreground text-xs">
                {selectedAction.type.replace('_', ' ')}
              </div>
              {selectedAction.type === 'open_url' && (
                <div className="text-xs">
                  <div>URL: {selectedAction.url}</div>
                  {selectedAction.preview && (
                    <div className="text-muted-foreground">
                      {selectedAction.preview}
                    </div>
                  )}
                </div>
              )}
              {selectedAction.type === 'dom_instruction' && (
                <div className="text-xs">
                  <div className="font-medium">Instruction</div>
                  <pre className="bg-muted p-2 rounded whitespace-pre-wrap">{selectedAction.instruction}</pre>
                  {selectedAction.selector && (
                    <div className="text-muted-foreground mt-1">
                      Selector: {selectedAction.selector}
                    </div>
                  )}
                  {selectedAction.caution && (
                    <div className="text-amber-700 mt-1">
                      Caution: {selectedAction.caution}
                    </div>
                  )}
                </div>
              )}
              {selectedAction.type === 'script_recommendation' && (
                <div className="text-xs">
                  <div className="font-medium">Script to review</div>
                  <pre className="bg-muted p-2 rounded overflow-x-auto text-xs">
                    {selectedAction.script}
                  </pre>
                  <div className="text-muted-foreground mt-1">
                    Shell: {selectedAction.shell}
                    {selectedAction.os ? ` · OS: ${selectedAction.os}` : ''}
                  </div>
                  {selectedAction.explanation && (
                    <div className="mt-1">{selectedAction.explanation}</div>
                  )}
                  {selectedAction.safetyNotes && (
                    <div className="text-amber-700 mt-1">
                      {selectedAction.safetyNotes}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button disabled title="Execution requires consent and will be added in a later step">
              Approve & Execute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
