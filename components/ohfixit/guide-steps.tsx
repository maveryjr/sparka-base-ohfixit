'use client';

import type { GuidePlan, GuideStep } from '@/lib/ai/tools/ohfixit/guide-steps';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

export function GuideSteps({ plan, className }: { plan: GuidePlan; className?: string }) {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<Record<string, 'worked' | 'didnt' | undefined>>({});

  const toggle = (id: string) =>
    setCompleted((prev) => ({ ...prev, [id]: !prev[id] }));

  const progress = useMemo(() => {
    const total = plan.steps.length;
    const done = plan.steps.reduce((acc, s) => acc + (completed[s.id] ? 1 : 0), 0);
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [plan.steps, completed]);

  return (
    <div className={cn('rounded-lg border p-4 space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Guide</div>
        <div className="text-xs text-muted-foreground">{progress.done}/{progress.total} • {progress.pct}%</div>
      </div>
      <div className="font-medium leading-snug">{plan.summary}</div>
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
            <div className="ml-6 flex items-center gap-2 pt-1">
              <button
                className={cn('px-2 py-1 rounded text-xs border', feedback[step.id] === 'worked' ? 'bg-green-600 text-white border-green-700' : 'hover:bg-green-50')}
                onClick={() => setFeedback((f) => ({ ...f, [step.id]: 'worked' }))}
              >
                It worked
              </button>
              <button
                className={cn('px-2 py-1 rounded text-xs border', feedback[step.id] === 'didnt' ? 'bg-red-600 text-white border-red-700' : 'hover:bg-red-50')}
                onClick={() => setFeedback((f) => ({ ...f, [step.id]: 'didnt' }))}
              >
                Didn't work
              </button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default GuideSteps;
