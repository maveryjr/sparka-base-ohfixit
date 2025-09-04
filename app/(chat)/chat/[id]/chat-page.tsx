'use client';
import { getDefaultThread } from '@/lib/thread-utils';
import { useMemo } from 'react';
import { notFound } from 'next/navigation';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/react';
import type { UiToolName } from '@/lib/ai/types';
import { ChatSystem } from '@/components/chat-system';
import OhFixItApprovalPanel from '@/components/ohfixit-approval-panel';
import OhFixItAuditTimeline from '@/components/ohfixit-audit-timeline';
import { HealthCheckDashboard } from '@/components/ohfixit/health-check-dashboard';
import { toast } from 'sonner';

// moved to components/chat-system

export function ChatPage({ id }: { id: string }) {
  const trpc = useTRPC();

  const { data: chat } = useSuspenseQuery(
    trpc.chat.getChatById.queryOptions({ chatId: id || '' }),
  );
  const { data: messages } = useSuspenseQuery(
    trpc.chat.getChatMessages.queryOptions({ chatId: id || '' }),
  );

  const initialThreadMessages = useMemo(() => {
    if (!messages) return [];
    return getDefaultThread(
      messages.map((msg) => ({ ...msg, id: msg.id.toString() })),
    );
  }, [messages]);

  const initialTool = useMemo<UiToolName | null>(() => {
    const lastAssistantMessage = messages?.findLast(
      (m) => m.role === 'assistant',
    );
    if (!lastAssistantMessage || !Array.isArray(lastAssistantMessage.parts))
      return null;
    for (const part of lastAssistantMessage.parts as any[]) {
      if (
        part?.type === 'tool-deepResearch' &&
        part?.state === 'output-available' &&
        part?.output?.format === 'clarifying_questions'
      ) {
        return 'deepResearch';
      }
    }
    return null;
  }, [messages]);

  if (!id) {
    return notFound();
  }

  if (!chat) {
    return notFound();
  }

  return (
    <>
      <div className="mb-3 space-y-3">
        <OhFixItApprovalPanel chatId={chat.id} />
        <HealthCheckDashboard
          autoRun={false}
          onFixIssue={async (checkId) => {
            try {
              const res = await fetch('/api/ohfixit/health/fix', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ chatId: chat.id, checkId }),
              });
              const json = await res.json();
              if (!res.ok) {
                throw new Error(json?.error || 'Auto-fix failed');
              }
              toast.success('Auto-fix queued');
            } catch (e: any) {
              toast.error(e?.message || 'Failed to queue auto-fix');
            }
          }}
        />
        <OhFixItAuditTimeline chatId={chat.id} />
      </div>
      <ChatSystem
        id={chat.id}
        initialMessages={initialThreadMessages}
        isReadonly={false}
        initialTool={initialTool}
      />
    </>
  );
}
