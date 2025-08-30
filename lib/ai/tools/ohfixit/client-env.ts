'use server';

import { tool, type Tool } from 'ai';
import { z } from 'zod';
import {
  getRecord,
  getSessionKeyForIds,
  type ClientDiagnostics,
} from '@/lib/ohfixit/diagnostics-store';
import { capabilityMap, detectOS } from '@/lib/ohfixit/os-capabilities';
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
}: {
  userId?: string | null;
  anonymousId?: string | null;
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
      const sessionKey = getSessionKeyForIds({
        userId: resolvedUserId,
        anonymousId: resolvedAnonymousId,
      });
      const rec = getRecord(sessionKey);
      if (!rec?.client || rec.client.consent !== true) {
        return {};
      }
      const ua = rec.client.data.userAgent || '';
      const platform = rec.client.data.platform;
      const os = detectOS(ua, platform);
      return { client: rec.client, osCapabilities: capabilityMap(os) };
    },
  });
}

export default createClientEnvTool;
