import 'server-only';

import { tool, type Tool } from 'ai';
import { z } from 'zod';
import {
  getRecordByChat,
  type ClientDiagnostics,
} from '@/lib/ohfixit/diagnostics-store';
import { capabilityMap, detectOS } from '@/lib/ohfixit/os-capabilities';
import { db } from '@/lib/db/client';
import { deviceProfile } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/app/(auth)/auth';
import { getAnonymousSession } from '@/lib/anonymous-session-server';

export const ClientEnvInput = z.object({});

export type ClientEnvOutput = {
  client?: ClientDiagnostics;
  osCapabilities?: ReturnType<typeof capabilityMap>;
};

export function createClientEnvTool({
  userId,
  anonymousId,
  chatId,
}: {
  userId?: string | null;
  anonymousId?: string | null;
  chatId: string;
}): Tool<z.infer<typeof ClientEnvInput>, ClientEnvOutput> {
  return tool({
    description:
      'Read the latest client diagnostics snapshot for this session (requires prior user consent).',
    inputSchema: ClientEnvInput,
    execute: async (): Promise<ClientEnvOutput> => {
      let resolvedUserId = userId ?? null;
      let resolvedAnonymousId = anonymousId ?? null;
      if (!resolvedUserId) {
        try {
          const session = await auth();
          resolvedUserId = session?.user?.id || null;
        } catch {}
      }
      if (!resolvedUserId && !resolvedAnonymousId) {
        try {
          const anon = await getAnonymousSession();
          resolvedAnonymousId = anon?.id || null;
        } catch {}
      }
      const rec = await getRecordByChat({
        chatId,
        userId: resolvedUserId,
        anonymousId: resolvedAnonymousId,
      });
      if (!rec?.client || rec.client.consent !== true) {
        return {};
      }
      const ua = rec.client.data.userAgent || '';
      const platform = rec.client.data.platform;
      const os = detectOS(ua, platform);
      const caps = capabilityMap(os);

      // Upsert lightweight DeviceProfile (best effort)
      try {
        if (resolvedUserId) {
          const name = `${os} Device`;
          const existing = await db
            .select()
            .from(deviceProfile)
            .where(eq(deviceProfile.userId, resolvedUserId))
            .limit(1);
          if (existing.length > 0) {
            // simple update of capabilities + lastSeen
            await db.update(deviceProfile)
              .set({ capabilities: caps as any, lastSeenAt: new Date() })
              .where(eq(deviceProfile.id, existing[0].id));
          } else {
            await db.insert(deviceProfile).values({
              userId: resolvedUserId,
              os: os as any,
              name,
              capabilities: caps as any,
              lastSeenAt: new Date(),
              createdAt: new Date(),
              warranty: null as any,
            });
          }
        }
      } catch {}

      return { client: rec.client, osCapabilities: caps };
    },
  });
}

export default createClientEnvTool;
