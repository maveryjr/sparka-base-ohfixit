'use client';

import type { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import { ChatIdProvider } from '@/providers/chat-id-provider';
import { MessageTreeProvider } from '@/providers/message-tree-provider';
import { DataStreamProvider } from '@/components/data-stream-provider';
import { ChatPrefetch } from '@/components/chat-prefetch';
import { AnonymousSessionInit } from '@/components/anonymous-session-init';

interface ChatProvidersProps {
  children: React.ReactNode;
  user: Session['user'] | undefined;
  session: Session | null;
}

export function ChatProviders({ children, user, session }: ChatProvidersProps) {
  return (
    <SessionProvider session={session}>
      {/* <ArtifactProvider> */}
      <DataStreamProvider>
        <ChatIdProvider>
          <AnonymousSessionInit />
          <ChatPrefetch user={user} />
          <MessageTreeProvider>{children}</MessageTreeProvider>
        </ChatIdProvider>
      </DataStreamProvider>
      {/* </ArtifactProvider> */}
    </SessionProvider>
  );
}
