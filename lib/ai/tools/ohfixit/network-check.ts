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
  deep: z.boolean().default(false).describe('Run deeper checks for captive portal and TLS issues'),
});

export type NetworkCheckOutput = NetworkDiagnostics;

async function checkTarget(url: string): Promise<NetworkCheckResult> {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    const latencyMs = Date.now() - t0;
    return { target: url, ok: res.ok, status: res.status, latencyMs } as any;
  } catch (e: any) {
    return { target: url, ok: false, error: e?.message || 'fetch_error' } as any;
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
    execute: async ({ targets, deep }): Promise<NetworkCheckOutput> => {
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
      const results: NetworkCheckOutput['results'] = await Promise.all(targets.map((t) => checkTarget(t)));

      // Deep probes (heuristic; environment-dependent)
      if (deep) {
        // Captive portal: expecting 204 from gstatic, if 200 with HTML -> likely captive portal
        try {
          const r = await fetch('http://www.gstatic.com/generate_204', { method: 'GET', cache: 'no-store' });
          if (!(r.status === 204)) {
            results.push({ target: 'captive-portal', ok: false, status: r.status, error: 'possible_captive_portal', reason: 'Expected 204 from gstatic; got ' + r.status, } as any);
          } else {
            results.push({ target: 'captive-portal', ok: true, status: 204 } as any);
          }
        } catch (e: any) {
          results.push({ target: 'captive-portal', ok: false, error: e?.message || 'probe_failed' } as any);
        }
        // TLS sanity on a known good site
        try {
          const r2 = await fetch('https://example.com', { method: 'HEAD', cache: 'no-store' });
          results.push({ target: 'tls-handshake', ok: r2.ok, status: r2.status, reason: r2.ok ? undefined : 'tls_or_firewall_issue' } as any);
        } catch (e: any) {
          results.push({ target: 'tls-handshake', ok: false, error: e?.message || 'tls_failed', reason: 'tls_or_firewall_issue' } as any);
        }
      }
      const payload: NetworkDiagnostics = { ranAt: Date.now(), results } as any;
      await setNetworkDiagnostics({ chatId, userId: resolvedUserId, anonymousId: resolvedAnonymousId }, payload);
      return payload;
    },
  });
}

export default createNetworkCheckTool;
