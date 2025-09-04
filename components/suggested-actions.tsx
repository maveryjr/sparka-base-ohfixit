'use client';

import { motion } from 'motion/react';
import { Button } from './ui/button';
import { memo, useCallback } from 'react';
import type { ModelId } from '@/lib/ai/model-id';
import { useSendMessage } from '@/lib/stores/chat-store';
import { cn } from '@/lib/utils';
import { usePhase2 } from '@/providers/phase2-provider';

interface SuggestedActionsProps {
  chatId: string;
  selectedModelId: ModelId;
  className?: string;
}

function PureSuggestedActions({
  chatId,
  selectedModelId,
  className,
}: SuggestedActionsProps) {
  const sendMessage = useSendMessage();
  const { setActiveFeature, setShowPhase2Hub } = usePhase2();

  const openAssist = useCallback((feature: string) => {
    setActiveFeature(feature);
    setShowPhase2Hub(true);
  }, [setActiveFeature, setShowPhase2Hub]);

  const suggestedActions = [
    {
      title: 'Run a quick',
      label: 'health scan',
      action: 'Please run a quick device and browser health scan.',
      kind: 'message' as const,
    },
    {
      title: 'Open the',
      label: 'Automation Panel',
      action: () => openAssist('automation-panel'),
      kind: 'assist' as const,
    },
    {
      title: 'Browse issue',
      label: 'playbooks',
      action: () => openAssist('issue-playbooks'),
      kind: 'assist' as const,
    },
    {
      title: 'Capture &',
      label: 'redact screenshot',
      action: () => openAssist('redaction-assist'),
      kind: 'assist' as const,
    },
  ];

  return (
    <div
      data-testid="suggested-actions"
      className={cn('grid sm:grid-cols-2 gap-2 w-full', className)}
    >
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.05 * index }}
          key={`suggested-action-${suggestedAction.title}-${index}`}
          className={index > 1 ? 'hidden sm:block' : 'block'}
        >
          <Button
            variant="ghost"
            onClick={async () => {
              if (suggestedAction.kind === 'assist') {
                const fn = suggestedAction.action as () => void;
                fn();
                return;
              }

              if (!sendMessage) return;
              window.history.replaceState({}, '', `/chat/${chatId}`);
              const text = suggestedAction.action as string;
              sendMessage(
                {
                  role: 'user',
                  parts: [{ type: 'text', text }],
                  metadata: {
                    selectedModel: selectedModelId,
                    createdAt: new Date(),
                    parentMessageId: null,
                  },
                },
                {
                  body: {
                    data: {
                      deepResearch: false,
                      webSearch: false,
                      reason: false,
                      generateImage: false,
                      writeOrCode: false,
                    },
                  },
                },
              );
            }}
            className="text-left border rounded-xl px-4 py-3.5 text-sm flex-1 gap-1 sm:flex-col w-full h-auto justify-start items-start"
          >
            <span className="font-medium">{suggestedAction.title}</span>
            <span className="text-muted-foreground">
              {suggestedAction.label}
            </span>
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(PureSuggestedActions, () => true);
