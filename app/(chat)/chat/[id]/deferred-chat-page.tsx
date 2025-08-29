'use client';

import { ChatPage } from '@/app/(chat)/chat/[id]/chat-page';
import { WithSkeleton } from '@/components/with-skeleton';
import { useChatId } from '@/providers/chat-id-provider';
import { useDeferredValue } from 'react';
import { ChatHome } from '../../chat-home';
import { notFound } from 'next/navigation';
import { SharedChatPage } from '../../share/[id]/shared-chat-page';

export function DeferredChatPage() {
  const { id, type } = useChatId();

  const { id: deferredId, type: deferredType } = useDeferredValue({
    id,
    type,
  });

  if (!id) {
    return notFound();
  }

  // Show skeleton when deferred values don't match current values
  if (deferredId !== id || deferredType !== type) {
    return (
      <div className="flex h-dvh w-full">
        <WithSkeleton isLoading={true} className="w-full h-full">
          <div className="flex h-dvh w-full" />
        </WithSkeleton>
      </div>
    );
  }

  // Render appropriate page based on type
  if (deferredType === 'provisional') {
    return <ChatHome id={deferredId} />;
  }

  if (deferredType === 'shared') {
    return <SharedChatPage id={deferredId} />;
  }

  if (deferredType === 'chat') {
    return <ChatPage id={deferredId} />;
  }

  return notFound();
}
