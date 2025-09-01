'use server';

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';
import {
  getAnonymousSession,
  createAnonymousSession,
  setAnonymousSession,
} from '@/lib/anonymous-session-server';
import { getClientIP, checkAnonymousRateLimit } from '@/lib/utils/rate-limit';
import {
  getSessionKeyForIds,
  setNetworkDiagnostics,
  type NetworkDiagnostics,
  type NetworkCheckResult,
} from '@/lib/ohfixit/diagnostics-store';

let redisClient: any = null;
if (process.env.REDIS_URL) {
  (async () => {
    try {
      const redis = await import('redis');
      redisClient = redis.createClient({ url: process.env.REDIS_URL });
      await redisClient.connect();
    } catch (e) {
      console.warn('Diagnostics network route: Redis not available', e);
      redisClient = null;
    }
  })();
}

const NetworkInput = z.object({
  chatId: z.string(),
  targets: z.array(z.string().url()).default([
    'https://vercel.com',
    'https://www.google.com/generate_204',
  ]),
});

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

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id || null;

    // Rate limit anonymous users
    if (!userId) {
      const ip = getClientIP(request);
      const rl = await checkAnonymousRateLimit(ip, redisClient);
      if (!rl.success) {
        return new NextResponse(
          JSON.stringify({ error: rl.error, type: 'RATE_LIMIT_EXCEEDED' }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              ...(rl.headers || {}),
            },
          },
        );
      }
    }

    const body = await request.json().catch(() => ({}));
    const parsed = NetworkInput.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid network diagnostics payload' },
        { status: 400 },
      );
    }

    // Ensure anonymous session exists to key the store
    let anonymous = await getAnonymousSession();
    if (!userId && !anonymous) {
      anonymous = await createAnonymousSession();
      if (anonymous) await setAnonymousSession(anonymous);
    }
    const chatId = parsed.data.chatId;
    const sessionKey = getSessionKeyForIds({ userId, anonymousId: anonymous?.id, chatId });

    const results = await Promise.all(
      parsed.data.targets.map((t) => checkTarget(t)),
    );

    const payload: NetworkDiagnostics = {
      ranAt: Date.now(),
      results,
    };

  await setNetworkDiagnostics(sessionKey as any, payload);

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    console.error('POST /api/diagnostics/network error', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
