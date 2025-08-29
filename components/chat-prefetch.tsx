'use client';

import { useEffect, useRef } from 'react';
import type { User } from 'next-auth';
import { useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/react';
import { useGetAllChats } from '@/hooks/chat-sync-hooks';

interface ChatPrefetchProps {
  user: User | undefined;
}

export function ChatPrefetch({ user }: ChatPrefetchProps) {
  const { data: chats } = useGetAllChats(10);
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const hasPrefetched = useRef(false);

  useEffect(() => {
    // Only prefetch for authenticated users with chats
    if (hasPrefetched.current || !user || !chats?.length) return;

    console.log('Prefetching chat messages for authenticated user');
    hasPrefetched.current = true;

    // Prefetch messages for each chat in the background
    const prefetchPromises = chats.map((chat) => {
      const queryOptions = trpc.chat.getChatMessages.queryOptions({
        chatId: chat.id,
      });
      return queryClient.prefetchQuery(queryOptions);
    });

    // Execute all prefetch operations in parallel
    Promise.allSettled(prefetchPromises)
      .then(() => {
        console.log(
          `Successfully prefetched messages for ${chats.length} chats`,
        );
      })
      .catch((error) => {
        console.error('Error prefetching chat messages:', error);
      });
  }, [chats, user, queryClient, trpc.chat.getChatMessages]);

  return null;
}
