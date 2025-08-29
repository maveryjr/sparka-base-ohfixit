'use client';
import { memo } from 'react';
import { Messages } from './messages';
import { MultimodalInput } from './multimodal-input';
import { CloneChatButton } from '@/components/clone-chat-button';
import { chatStore } from '@/lib/stores/chat-store';
import type { Vote } from '@/lib/db/schema';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { ChatMessage } from '@/lib/ai/types';
import { cn } from '@/lib/utils';

export interface MessagesPaneProps {
  chatId: string;
  status: UseChatHelpers<ChatMessage>['status'];
  votes: Array<Vote> | undefined;
  isReadonly: boolean;
  isVisible: boolean;
  className?: string;
}

function PureMessagesPane({
  chatId,
  status,
  votes,
  isReadonly,
  isVisible,
  className,
}: MessagesPaneProps) {
  const parentMessageId = chatStore.getState().getLastMessageId();

  return (
    <div
      className={cn('flex w-full flex-col flex-1 min-h-0 h-full', className)}
    >
      <Messages votes={votes} isReadonly={isReadonly} isVisible={isVisible} />

      <div className="relative bottom-4 w-full z-10">
        {!isReadonly ? (
          <div className="w-full mx-auto p-2 @[400px]:px-4 @[400px]:pb-4 @[400px]:md:pb-6 md:max-w-3xl">
            <MultimodalInput
              chatId={chatId}
              status={status}
              parentMessageId={parentMessageId}
            />
          </div>
        ) : (
          <CloneChatButton chatId={chatId} className="w-full" />
        )}
      </div>
    </div>
  );
}

export const MessagesPane = memo(PureMessagesPane);
