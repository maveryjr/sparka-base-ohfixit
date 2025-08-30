'use server';

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';
import { getClientIP, checkAnonymousRateLimit } from '@/lib/utils/rate-limit';
import { logAction } from '@/lib/ohfixit/logger';

let redisClient: any = null;
if (process.env.REDIS_URL) {
  (async () => {
    try {
      const redis = await import('redis');
      redisClient = redis.createClient({ url: process.env.REDIS_URL });
      await redisClient.connect();
    } catch (e) {
      console.warn('OhFixIt action-log route: Redis not available', e);
      redisClient = null;
    }
  })();
}

const ActionInput = z.object({
  chatId: z.string().uuid(),
  actionType: z.string(),
  status: z.enum(['proposed', 'approved', 'executed', 'cancelled']).optional(),
  summary: z.string().optional(),
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
    const parsed = ActionInput.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { chatId, actionType, status, summary, payload } = parsed.data;
    await logAction({ chatId, actionType, status, summary, payload });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/ohfixit/action-log error', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
