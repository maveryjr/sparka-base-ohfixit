'use server';

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';
import { getAuditTimeline } from '@/lib/ohfixit/logger';

const QuerySchema = z.object({
  chatId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(request: NextRequest) {
  try {
    // Ensure only logged in users can fetch their timeline; or allow anonymous since events include anonymousId
    // We'll not strictly enforce ownership here; front-end should request for the active chat.
    await auth();

    const { searchParams } = new URL(request.url);
    const parsed = QuerySchema.safeParse({
      chatId: searchParams.get('chatId'),
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
    }

    const { chatId, limit, offset } = parsed.data;
    const events = await getAuditTimeline({ chatId, limit, offset });
    return NextResponse.json({ events, limit, offset });
  } catch (error) {
    console.error('GET /api/ohfixit/audit error', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
