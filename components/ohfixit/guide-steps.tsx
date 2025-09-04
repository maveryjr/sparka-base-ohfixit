'use client';

import type { GuidePlan, GuideStep } from '@/lib/ai/tools/ohfixit/guide-steps';
import { useMemo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { chatStore } from '@/lib/stores/chat-store';
import type { ModelId } from '@/lib/ai/model-id';
import { useChatInput } from '@/providers/chat-input-provider';

export function GuideSteps({ plan, className }: { plan: GuidePlan; className?: string }) {
  const { selectedModelId } = useChatInput();
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<Record<string, 'worked' | 'didnt' | undefined>>({});

  const sendFollowUp = useCallback((step: GuideStep, status: 'worked' | 'didnt') => {
    const text = status === 'worked'
      ? `Follow-up: Step "${step.title}" worked. Suggest the next step or confirm completion.`
      : `Follow-up: Step "${step.title}" did not work. Propose an alternative or deeper troubleshooting for this step.`;
    try {
      const { currentChatHelpers, getLastMessageId } = chatStore.getState();
      const sendMessage = currentChatHelpers?.sendMessage;
      if (!sendMessage) return;
      // Try to read selected model from provider via store latest message metadata; fallback to keeping current model selection implicit
      const parentId = getLastMessageId();
      const now = new Date();
      sendMessage({
        role: 'user',
        parts: [{ type: 'text', text }],
        metadata: {
          selectedModel: selectedModelId as ModelId,
          selectedTool: 'guideSteps',
          createdAt: now,
          parentMessageId: parentId,
          // keep currently selected tool active
        },
      });
    } catch {
      // ignore if helpers not ready
    }
  }, []);

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
      <div className="flex items-center gap-2">
        <button
          className="px-2 py-1 rounded text-xs border hover:bg-accent"
          onClick={() => {
            try {
              const { currentChatHelpers, getLastMessageId } = chatStore.getState();
              const sendMessage = currentChatHelpers?.sendMessage;
              if (!sendMessage) return;
              const parentId = getLastMessageId();
              const now = new Date();
              // Hint the system to use the guideToAutomation tool and include the plan JSON for grounding.
              sendMessage({
                role: 'user',
                parts: [{ type: 'text', text: `Convert this plan into an executable automation plan and wait for my approval before running. Plan JSON:\n${JSON.stringify(plan)}` }],
                metadata: {
                  selectedModel: selectedModelId as ModelId,
                  selectedTool: 'guideToAutomation',
                  createdAt: now,
                  parentMessageId: parentId,
                },
              });
            } catch {}
          }}
        >
          Run Automatically
        </button>
      </div>
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
                onClick={() => {
                  setFeedback((f) => ({ ...f, [step.id]: 'worked' }));
                  sendFollowUp(step, 'worked');
                }}
              >
                It worked
              </button>
              <button
                className={cn('px-2 py-1 rounded text-xs border', feedback[step.id] === 'didnt' ? 'bg-red-600 text-white border-red-700' : 'hover:bg-red-50')}
                onClick={() => {
                  setFeedback((f) => ({ ...f, [step.id]: 'didnt' }));
                  sendFollowUp(step, 'didnt');
                }}
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
