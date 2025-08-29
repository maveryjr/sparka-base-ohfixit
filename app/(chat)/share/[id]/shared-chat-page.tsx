'use client';
import { ChatSystem } from '@/components/chat-system';
import { getDefaultThread } from '@/lib/thread-utils';
import { useMemo } from 'react';
import { WithSkeleton } from '@/components/with-skeleton';
import { usePublicChat, usePublicChatMessages } from '@/hooks/use-shared-chat';
import { notFound } from 'next/navigation';

export function SharedChatPage({ id }: { id: string }) {
  const {
    data: chat,
    isLoading: isChatLoading,
    error: chatError,
  } = usePublicChat(id as string);
  const {
    data: messages,
    isLoading: isMessagesLoading,
    error: messagesError,
  } = usePublicChatMessages(id as string);

  const initialThreadMessages = useMemo(() => {
    if (!messages) return [];
    return getDefaultThread(
      messages.map((msg) => ({ ...msg, id: msg.id.toString() })),
    );
  }, [messages]);

  if (!id) {
    return notFound();
  }

  if (chatError || messagesError) {
    // TODO: Replace for error page
    return (
      <div className="flex items-center justify-center h-dvh">
        <div className="text-muted-foreground">
          This chat is not available or has been set to private
        </div>
      </div>
    );
  }

  if (!isChatLoading && !chat) {
    return notFound();
  }

  if (isMessagesLoading || isChatLoading) {
    return (
      <WithSkeleton
        isLoading={isChatLoading || isMessagesLoading}
        className="w-full h-full"
      >
        <div className="flex h-dvh w-full" />
      </WithSkeleton>
    );
  }

  if (!chat) {
    return notFound();
  }

  return (
    <>
      <WithSkeleton
        isLoading={isChatLoading || isMessagesLoading}
        className="w-full"
      >
        <ChatSystem
          id={chat.id}
          initialMessages={initialThreadMessages}
          isReadonly={true}
        />
      </WithSkeleton>
      {/* Shared chats don't need data handler */}
      {/* <DataStreamHandler id={id} /> */}
    </>
  );
}
