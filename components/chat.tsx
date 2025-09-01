'use client';
import { useQuery } from '@tanstack/react-query';
import { ChatHeader } from '@/components/chat-header';
import { cn } from '@/lib/utils';
import { Artifact } from './artifact';
import { MessagesPane } from './messages-pane';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { useTRPC } from '@/trpc/react';
import { useSession } from 'next-auth/react';
import { usePhase2 } from '@/providers/phase2-provider';
import { Phase2Integration } from '@/components/ohfixit/phase2-integration';

import { useSidebar } from '@/components/ui/sidebar';
import type { ChatMessage } from '@/lib/ai/types';
import {
  useChatStatus,
  useMessageIds,
  chatStore,
  useChatId,
} from '@/lib/stores/chat-store';
import { useCallback } from 'react';
import type { UseChatHelpers } from '@ai-sdk/react';

export function Chat({
  id,
  initialMessages,
  isReadonly,
}: {
  id: string;
  initialMessages: Array<ChatMessage>;
  isReadonly: boolean;
}) {
  const trpc = useTRPC();
  const { data: session } = useSession();
  const isLoading = id !== useChatId();

  const messageIds = useMessageIds();
  const status = useChatStatus();
  const stopAsync: UseChatHelpers<ChatMessage>['stop'] =
    useCallback(async () => {
      const helpers = chatStore.getState().currentChatHelpers;
      if (!helpers?.stop) return;
      return helpers.stop();
    }, []);
  // regenerate no longer needs to be drilled; components call the store directly

  const { data: votes } = useQuery({
    ...trpc.vote.getVotes.queryOptions({ chatId: id }),
    enabled:
      messageIds.length >= 2 && !isReadonly && !!session?.user && !isLoading,
  });

  const { state } = useSidebar();
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);
  const { showPhase2Hub } = usePhase2();

  const handleFeatureSelect = (feature: string) => {
    // Handle feature selection - could trigger chat messages or actions
    console.log('Phase 2 feature selected:', feature);
  };

  return (
    <>
      <div
        className={cn(
          '@container flex flex-col min-w-0 h-dvh bg-background md:max-w-[calc(100vw-var(--sidebar-width))] max-w-screen',
          state === 'collapsed' && 'md:max-w-screen',
        )}
      >
        <ChatHeader
          chatId={id}
          isReadonly={isReadonly}
          hasMessages={messageIds.length > 0}
          user={session?.user}
        />

        {showPhase2Hub && (
          <div className="border-b bg-muted/30 p-4 max-h-[60vh] overflow-y-auto">
            <Phase2Integration 
              chatId={id}
              onFeatureSelect={handleFeatureSelect}
            />
          </div>
        )}

        <MessagesPane
          chatId={id}
          status={status}
          votes={votes}
          isReadonly={isReadonly}
          isVisible={!isArtifactVisible}
          className="bg-background"
        />
      </div>

      <Artifact
        chatId={id}
        status={status}
        stop={stopAsync}
        votes={votes}
        isReadonly={isReadonly}
        isAuthenticated={!!session?.user}
      />
    </>
  );
}
