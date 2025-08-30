'use server';

import { tool, type Tool } from 'ai';
import { z } from 'zod';
import {
  getSessionKeyForIds,
  setNetworkDiagnostics,
  type NetworkDiagnostics,
  type NetworkCheckResult,
} from '@/lib/ohfixit/diagnostics-store';

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
}: {
  userId?: string | null;
  anonymousId?: string | null;
}): Tool<z.infer<typeof NetworkCheckInput>, NetworkCheckOutput> {
  return tool({
    description:
      'Run basic network connectivity checks to known endpoints and record results.',
    inputSchema: NetworkCheckInput,
    execute: async ({ targets }): Promise<NetworkCheckOutput> => {
      const sessionKey = getSessionKeyForIds({ userId, anonymousId });
      const results = await Promise.all(targets.map((t) => checkTarget(t)));
      const payload: NetworkDiagnostics = { ranAt: Date.now(), results };
      setNetworkDiagnostics(sessionKey, payload);
      return payload;
    },
  });
}

export default createNetworkCheckTool;
