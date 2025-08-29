'use client';

import { memo } from 'react';
import { Chat } from '@/components/chat';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { ChatSync } from '@/components/chat-sync';
import { ChatInputProvider } from '@/providers/chat-input-provider';
import { ArtifactProvider } from '@/hooks/use-artifact';
import type { UiToolName, ChatMessage } from '@/lib/ai/types';

export const ChatSystem = memo(function ChatSystem({
  id,
  initialMessages,
  isReadonly,
  initialTool = null,
}: {
  id: string;
  initialMessages: Array<ChatMessage>;
  isReadonly: boolean;
  initialTool?: UiToolName | null;
}) {
  return (
    <ArtifactProvider>
      {isReadonly ? (
        <>
          <ChatSync id={id} initialMessages={initialMessages} />
          <Chat
            key={id}
            id={id}
            initialMessages={initialMessages}
            isReadonly={isReadonly}
          />
          {/* No ChatInputProvider or DataStreamHandler in readonly mode */}
        </>
      ) : (
        <ChatInputProvider
          localStorageEnabled={true}
          initialTool={initialTool ?? null}
        >
          <ChatSync id={id} initialMessages={initialMessages} />
          <Chat
            key={id}
            id={id}
            initialMessages={initialMessages}
            isReadonly={isReadonly}
          />
          <DataStreamHandler id={id} />
        </ChatInputProvider>
      )}
    </ArtifactProvider>
  );
});
