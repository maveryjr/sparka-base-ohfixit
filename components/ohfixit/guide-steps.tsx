'use client';

import type { GuidePlan, GuideStep } from '@/lib/ai/tools/ohfixit/guide-steps';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function GuideSteps({ plan, className }: { plan: GuidePlan; className?: string }) {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  const toggle = (id: string) =>
    setCompleted((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className={cn('rounded-lg border p-4 space-y-3', className)}>
      <div className="text-sm text-muted-foreground">Guide</div>
      <div className="font-medium">{plan.summary}</div>
      <ol className="space-y-3 list-decimal list-inside">
        {plan.steps.map((step: GuideStep, idx: number) => (
          <li key={step.id} className="space-y-2">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={!!completed[step.id]}
                onChange={() => toggle(step.id)}
                aria-label={`Mark step ${idx + 1} complete`}
              />
              <div>
                <div className="font-medium">{step.title}</div>
                <div className="text-sm text-muted-foreground">{step.rationale}</div>
              </div>
            </div>
            <ul className="ml-6 list-disc space-y-1">
              {step.actions.map((a, i) => (
                <li key={i} className="text-sm">
                  {a.kind === 'open_url' && a.url ? (
                    <a className="underline" href={a.url} target="_blank" rel="noreferrer">
                      {a.text}
                    </a>
                  ) : (
                    a.text
                  )}
                </li>
              ))}
            </ul>
            {step.fallback && (
              <div className="ml-6 text-xs text-muted-foreground">{step.fallback}</div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

export default GuideSteps;
