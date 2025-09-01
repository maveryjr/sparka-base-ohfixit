// Route Handler runs on the server by default; no 'use server' directive needed.

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';
import { getClientIP, checkAnonymousRateLimit } from '@/lib/utils/rate-limit';
import { logConsent } from '@/lib/ohfixit/logger';

let redisClient: any = null;
if (process.env.REDIS_URL) {
  (async () => {
    try {
      const redis = await import('redis');
      redisClient = redis.createClient({ url: process.env.REDIS_URL });
      await redisClient.connect();
    } catch (e) {
      console.warn('OhFixIt consent route: Redis not available', e);
      redisClient = null;
    }
  })();
}

const ConsentInput = z.object({
  chatId: z.string().uuid(),
  kind: z.enum(['screenshot', 'diagnostics', 'automation']).or(z.string()),
  payload: z.unknown().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id || null;

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
    const parsed = ConsentInput.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { chatId, kind, payload } = parsed.data;
    await logConsent({ chatId, kind, payload });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/ohfixit/consent error', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
