import 'server-only';

import { db } from '@/lib/db/client';
import { eq, desc } from 'drizzle-orm';
import { auth } from '@/app/(auth)/auth';
import {
  createAnonymousSession,
  getAnonymousSession,
  setAnonymousSession,
} from '@/lib/anonymous-session-server';
import {
  actionLog,
  consentEvent,
  diagnosticsSnapshot,
  chat,
  type ActionLog as ActionLogRow,
  type ConsentEvent as ConsentEventRow,
  type DiagnosticsSnapshot as DiagnosticsSnapshotRow,
} from '@/lib/db/schema';

type CommonAttrs = { chatId: string; anonymousId?: string | null };

export async function resolveActorIds(): Promise<{
  userId: string | null;
  anonymousId: string | null;
}> {
  const session = await auth();
  const userId = session?.user?.id || null;
  let anonymous = await getAnonymousSession();
  if (!userId && !anonymous) {
    anonymous = await createAnonymousSession();
    if (anonymous) await setAnonymousSession(anonymous);
  }
  return { userId, anonymousId: anonymous?.id || null };
}

export async function logConsent(
  attrs: CommonAttrs & {
    kind: 'screenshot' | 'diagnostics' | 'automation' | string;
    payload?: unknown;
  },
): Promise<ConsentEventRow[]> {
  const { userId, anonymousId } = await resolveActorIds();
  // Only attach FK to Chat when the chat row exists (provisional ids may not be persisted yet)
  let useChatId: string | null = null;
  let provisionalChatId: string | undefined = undefined;
  if (userId) {
    const exists = await db
      .select({ id: chat.id })
      .from(chat)
      .where(eq(chat.id, attrs.chatId))
      .limit(1);
    if (exists.length) {
      useChatId = attrs.chatId;
    } else {
      useChatId = null;
      provisionalChatId = attrs.chatId;
    }
  }
  const values = {
    chatId: useChatId,
    userId: userId || null,
    kind: attrs.kind,
    payload: {
      ...(attrs.payload as Record<string, unknown> | null | undefined),
      provisionalChatId,
      anonymousId: userId ? undefined : anonymousId,
    },
    createdAt: new Date(),
  } as const;
  return db.insert(consentEvent).values(values).returning();
}

export async function logAction(
  attrs: CommonAttrs & {
    actionType:
      | 'open_url'
      | 'dom_instruction'
      | 'script_recommendation'
      | 'guide_step'
      | string;
    status?: 'proposed' | 'approved' | 'executed' | 'cancelled' | string;
    summary?: string | null;
    payload?: unknown;
  },
): Promise<ActionLogRow[]> {
  const { userId, anonymousId } = await resolveActorIds();
  // Only attach FK to Chat when the chat row exists (provisional ids may not be persisted yet)
  let useChatId: string | null = null;
  let provisionalChatId: string | undefined = undefined;
  if (userId) {
    const exists = await db
      .select({ id: chat.id })
      .from(chat)
      .where(eq(chat.id, attrs.chatId))
      .limit(1);
    if (exists.length) {
      useChatId = attrs.chatId;
    } else {
      useChatId = null;
      provisionalChatId = attrs.chatId;
    }
  }
  const values = {
    chatId: useChatId,
    userId: userId || null,
    actionType: attrs.actionType,
    status: attrs.status ?? 'proposed',
    summary: attrs.summary ?? null,
    payload: {
      ...(attrs.payload as Record<string, unknown> | null | undefined),
      provisionalChatId,
      anonymousId: userId ? undefined : anonymousId,
    },
    createdAt: new Date(),
  } as const;
  return db.insert(actionLog).values(values).returning();
}

export async function snapshotDiagnostics(
  attrs: CommonAttrs & { payload: unknown },
): Promise<DiagnosticsSnapshotRow[]> {
  const { userId, anonymousId } = await resolveActorIds();
  // Only attach FK to Chat when the chat row exists (provisional ids may not be persisted yet)
  let useChatId: string | null = null;
  let provisionalChatId: string | undefined = undefined;
  if (userId) {
    const exists = await db
      .select({ id: chat.id })
      .from(chat)
      .where(eq(chat.id, attrs.chatId))
      .limit(1);
    if (exists.length) {
      useChatId = attrs.chatId;
    } else {
      useChatId = null;
      provisionalChatId = attrs.chatId;
    }
  }
  const values = {
    chatId: useChatId,
    userId: userId || null,
    payload: {
      ...(attrs.payload as Record<string, unknown> | null | undefined),
      provisionalChatId,
      anonymousId: userId ? undefined : anonymousId,
    },
    createdAt: new Date(),
  } as const;
  return db.insert(diagnosticsSnapshot).values(values).returning();
}

export type AuditEvent =
  | ({ type: 'consent' } & ConsentEventRow)
  | ({ type: 'action' } & ActionLogRow)
  | ({ type: 'diagnostics' } & DiagnosticsSnapshotRow);

export async function getAuditTimeline({
  chatId,
  limit = 50,
  offset = 0,
}: {
  chatId: string;
  limit?: number;
  offset?: number;
}): Promise<AuditEvent[]> {
  // Fetch separately and merge-sort by createdAt desc
  const [consents, actions, snapshots] = await Promise.all([
    db
      .select()
      .from(consentEvent)
      .where(eq(consentEvent.chatId, chatId))
      .orderBy(desc(consentEvent.createdAt))
      .limit(limit + offset),
    db
      .select()
      .from(actionLog)
      .where(eq(actionLog.chatId, chatId))
      .orderBy(desc(actionLog.createdAt))
      .limit(limit + offset),
    db
      .select()
      .from(diagnosticsSnapshot)
      .where(eq(diagnosticsSnapshot.chatId, chatId))
      .orderBy(desc(diagnosticsSnapshot.createdAt))
      .limit(limit + offset),
  ]);

  const tagged: AuditEvent[] = [
    ...consents.map((c) => ({ type: 'consent' as const, ...c })),
    ...actions.map((a) => ({ type: 'action' as const, ...a })),
    ...snapshots.map((d) => ({ type: 'diagnostics' as const, ...d })),
  ];

  tagged.sort((a, b) => {
    const ta = new Date(a.createdAt as any).getTime();
    const tb = new Date(b.createdAt as any).getTime();
    return tb - ta;
  });

  return tagged.slice(offset, offset + limit);
}
