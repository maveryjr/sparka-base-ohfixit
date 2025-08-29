'use client';

import type { User } from 'next-auth';
import { ChatIdProvider } from '@/providers/chat-id-provider';
import { MessageTreeProvider } from '@/providers/message-tree-provider';
import { DataStreamProvider } from '@/components/data-stream-provider';
import { ChatPrefetch } from '@/components/chat-prefetch';
import { AnonymousSessionInit } from '@/components/anonymous-session-init';

interface ChatProvidersProps {
  children: React.ReactNode;
  user: User | undefined;
}

export function ChatProviders({ children, user }: ChatProvidersProps) {
  return (
    // <ArtifactProvider>
    <DataStreamProvider>
      <ChatIdProvider>
        <AnonymousSessionInit />
        <ChatPrefetch user={user} />
        <MessageTreeProvider>{children}</MessageTreeProvider>
      </ChatIdProvider>
    </DataStreamProvider>
    // </ArtifactProvider>
  );
}
