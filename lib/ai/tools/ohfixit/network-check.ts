import 'server-only';

import { tool, type Tool } from 'ai';
import { z } from 'zod';
import {
  setNetworkDiagnostics,
  type NetworkDiagnostics,
  type NetworkCheckResult,
} from '@/lib/ohfixit/diagnostics-store';
import { auth } from '@/app/(auth)/auth';
import { getAnonymousSession } from '@/lib/anonymous-session-server';

export const NetworkCheckInput = z.object({
  targets: z
    .array(z.string().url())
    .default(['https://vercel.com', 'https://www.google.com/generate_204'])
    .describe('List of URLs to test'),
});

export type NetworkCheckOutput = NetworkDiagnostics;

async function checkTarget(url: string): Promise<NetworkCheckResult> {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    const latencyMs = Date.now() - t0;
    return { target: url, ok: res.ok, status: res.status, latencyMs };
  } catch (e: any) {
    return { target: url, ok: false, error: e?.message || 'fetch_error' };
  }
}

export function createNetworkCheckTool({
  userId,
  anonymousId,
  chatId,
}: {
  userId?: string | null;
  anonymousId?: string | null;
  chatId: string;
}): Tool<z.infer<typeof NetworkCheckInput>, NetworkCheckOutput> {
  return tool({
    description:
      'Run basic network connectivity checks to known endpoints and record results.',
    inputSchema: NetworkCheckInput,
    execute: async ({ targets }): Promise<NetworkCheckOutput> => {
      // Resolve session identifiers similarly to clientEnv tool to avoid using a fallback key
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
      const results = await Promise.all(targets.map((t) => checkTarget(t)));
      const payload: NetworkDiagnostics = { ranAt: Date.now(), results };
      await setNetworkDiagnostics({ chatId, userId: resolvedUserId, anonymousId: resolvedAnonymousId }, payload);
      return payload;
    },
  });
}

export default createNetworkCheckTool;
