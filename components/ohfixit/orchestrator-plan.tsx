'use client';

import { cn } from '@/lib/utils';
import { chatStore } from '@/lib/stores/chat-store';
import type { ModelId } from '@/lib/ai/model-id';
import { useChatInput } from '@/providers/chat-input-provider';

type Item = { id: string; kind: string; tool: string; rationale: string; prompt: string };

export function OrchestratorPlan({ summary, items, className }: { summary: string; items: Item[]; className?: string }) {
  const { selectedModelId } = useChatInput();

  function trigger(item: Item) {
    try {
      const { currentChatHelpers, getLastMessageId } = chatStore.getState();
      const sendMessage = currentChatHelpers?.sendMessage;
      if (!sendMessage) return;
      const parentId = getLastMessageId();
      const now = new Date();
      sendMessage({
        role: 'user',
        parts: [{ type: 'text', text: item.prompt }],
        metadata: {
          selectedModel: selectedModelId as ModelId,
          selectedTool: item.tool as any,
          createdAt: now,
          parentMessageId: parentId,
        },
      });
    } catch {}
  }

  return (
    <div className={cn('rounded border p-3 text-sm', className)}>
      <div className="font-medium mb-2">{summary}</div>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.id} className="border rounded p-2 bg-background/50">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase text-muted-foreground">{it.kind}</span>
              <span className="text-xs text-muted-foreground">{it.tool}</span>
              <span className="ml-auto text-xs">{it.rationale}</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button className="px-2 py-1 rounded text-xs border hover:bg-accent" onClick={() => trigger(it)}>
                Run
              </button>
              <div className="text-xs text-muted-foreground">{it.prompt.slice(0, 120)}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default OrchestratorPlan;

