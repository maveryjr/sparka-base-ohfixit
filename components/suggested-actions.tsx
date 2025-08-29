'use client';

import { motion } from 'motion/react';
import { Button } from './ui/button';
import { memo } from 'react';
import type { ModelId } from '@/lib/ai/model-id';
import { useSendMessage } from '@/lib/stores/chat-store';
import { cn } from '@/lib/utils';

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
  const suggestedActions = [
    {
      title: 'What are the advantages',
      label: 'of using Next.js?',
      action: 'What are the advantages of using Next.js?',
    },
    {
      title: 'Write code to',
      label: `demonstrate djikstra's algorithm`,
      action: `Write code to demonstrate djikstra's algorithm`,
    },
    {
      title: 'Help me write an essay',
      label: `about silicon valley`,
      action: `Help me write an essay about silicon valley`,
    },
    {
      title: 'What is the weather',
      label: 'in San Francisco?',
      action: 'What is the weather in San Francisco?',
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
              if (!sendMessage) return;

              window.history.replaceState({}, '', `/chat/${chatId}`);

              sendMessage(
                {
                  role: 'user',
                  parts: [{ type: 'text', text: suggestedAction.action }],
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
