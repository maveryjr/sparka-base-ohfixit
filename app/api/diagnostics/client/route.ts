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
  setClientDiagnostics,
  type ClientDiagnostics,
} from '@/lib/ohfixit/diagnostics-store';
import { detectOS } from '@/lib/ohfixit/os-capabilities';

// Simple per-route Redis client for rate limits (optional)
let redisClient: any = null;
if (process.env.REDIS_URL) {
  (async () => {
    try {
      const redis = await import('redis');
      redisClient = redis.createClient({ url: process.env.REDIS_URL });
      await redisClient.connect();
    } catch (e) {
      console.warn('Diagnostics client route: Redis not available', e);
      redisClient = null;
    }
  })();
}

const ClientDiagnosticsInput = z.object({
  chatId: z.string(),
  consent: z.boolean().default(false),
  data: z.object({
    userAgent: z.string().default(''),
    platform: z.string().optional(),
    languages: z.array(z.string()).optional(),
    timeZone: z.string().optional(),
    screen: z
      .object({ width: z.number(), height: z.number(), dpr: z.number() })
      .optional(),
    device: z
      .object({ memoryGB: z.number().optional(), cores: z.number().optional() })
      .optional(),
    network: z
      .object({
        downlink: z.number().optional(),
        effectiveType: z.string().optional(),
        rtt: z.number().optional(),
        saveData: z.boolean().optional(),
      })
      .optional(),
    battery: z
      .object({ level: z.number().optional(), charging: z.boolean().optional() })
      .optional(),
    window: z
      .object({ innerWidth: z.number(), innerHeight: z.number() })
      .optional(),
  }),
});

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

    const body = await request.json();
    const parsed = ClientDiagnosticsInput.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid client diagnostics payload' },
        { status: 400 },
      );
    }

    const consentGiven = parsed.data.consent === true;
    if (!consentGiven) {
      return NextResponse.json({ ok: false, reason: 'no-consent' });
    }

    // Ensure anonymous session exists to key the store
    let anonymous = await getAnonymousSession();
    if (!userId && !anonymous) {
      anonymous = await createAnonymousSession();
      if (anonymous) await setAnonymousSession(anonymous);
    }
    const chatId = parsed.data.chatId;
    const sessionKey = getSessionKeyForIds({ userId, anonymousId: anonymous?.id, chatId });

    const { userAgent, platform } = parsed.data.data;
    const family = detectOS(userAgent || '', platform);

    const payload: ClientDiagnostics = {
      collectedAt: Date.now(),
      consent: true,
      data: {
        ...parsed.data.data,
        osGuess: { family, source: 'ua+platform' },
      },
    };

    await setClientDiagnostics(sessionKey, payload);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/diagnostics/client error', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
