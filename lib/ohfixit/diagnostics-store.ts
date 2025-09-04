
import { db } from '@/lib/db/client';
import { diagnosticsSnapshot, chat } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

// Persistent store for diagnostics data using Drizzle ORM

export type ClientDiagnostics = {
  collectedAt: number;
  consent: boolean;
  data: {
    userAgent: string;
    platform?: string;
    languages?: string[];
    timeZone?: string;
    screen?: { width: number; height: number; dpr: number };
    device?: { memoryGB?: number; cores?: number };
    network?: {
      downlink?: number;
      effectiveType?: string;
      rtt?: number;
      saveData?: boolean;
    };
    battery?: {
      level?: number; // 0..1
      charging?: boolean;
    };
    window?: { innerWidth: number; innerHeight: number };
    osGuess?: { family: string; source: string };
  };
};

export type NetworkCheckResult = {
  target: string;
  ok: boolean;
  status?: number;
  latencyMs?: number;
  error?: string;
  reason?: string;
};

export type NetworkDiagnostics = {
  ranAt: number;
  results: NetworkCheckResult[];
};


export type StoreRecord = {
  client?: ClientDiagnostics;
  network?: NetworkDiagnostics;
};

// Diagnostics are stored per userId or anonymousId (and optionally chatId)
// For MVP, we use userId/anonymousId only (chatId can be null)




// New DB-backed functions require chatId
export async function getRecordByChat({ chatId, userId, anonymousId }: { chatId: string; userId?: string | null; anonymousId?: string | null }): Promise<StoreRecord | undefined> {
  const rows = await db
    .select()
    .from(diagnosticsSnapshot)
    .where(
      eq(diagnosticsSnapshot.chatId, chatId)
    )
    .orderBy(desc(diagnosticsSnapshot.createdAt))
    .limit(1);
  if (!rows.length) return undefined;
  const payload = rows[0].payload as any;
  return {
    client: payload?.client,
    network: payload?.network,
  };
}

export async function setClientDiagnostics(
  { chatId, userId, anonymousId }: { chatId: string; userId?: string | null; anonymousId?: string | null },
  diag: ClientDiagnostics,
) {
  // Only attach FK to Chat when the chat row exists (provisional ids may not be persisted yet)
  let useChatId: string | null = null;
  let provisionalChatId: string | undefined = undefined;
  if (userId) {
    const exists = await db.select({ id: chat.id }).from(chat).where(eq(chat.id, chatId)).limit(1);
    if (exists.length) {
      useChatId = chatId;
    } else {
      useChatId = null;
      provisionalChatId = chatId;
    }
  }
  await db.insert(diagnosticsSnapshot).values({
    chatId: useChatId,
    userId: userId || null,
    payload: { client: diag, anonymousId, provisionalChatId },
    createdAt: new Date(),
  });
}

export async function setNetworkDiagnostics(
  { chatId, userId, anonymousId }: { chatId: string; userId?: string | null; anonymousId?: string | null },
  net: NetworkDiagnostics,
) {
  // Only attach FK to Chat when the chat row exists (provisional ids may not be persisted yet)
  let useChatId: string | null = null;
  let provisionalChatId: string | undefined = undefined;
  if (userId) {
    const exists = await db.select({ id: chat.id }).from(chat).where(eq(chat.id, chatId)).limit(1);
    if (exists.length) {
      useChatId = chatId;
    } else {
      useChatId = null;
      provisionalChatId = chatId;
    }
  }
  await db.insert(diagnosticsSnapshot).values({
    chatId: useChatId,
    userId: userId || null,
    payload: { network: net, anonymousId, provisionalChatId },
    createdAt: new Date(),
  });
}

export function getSessionKeyForIds({ userId, anonymousId, chatId }: { userId?: string | null; anonymousId?: string | null; chatId: string }) {
  // For DB, just return the object for compatibility
  return { userId, anonymousId, chatId };
}
