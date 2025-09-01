import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { z } from 'zod';
import { logAction } from '@/lib/ohfixit/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const chatId = searchParams.get('chatId');

    const querySchema = z.object({ jobId: z.string().nullable(), chatId: z.string().nullable() });
    querySchema.parse({ jobId, chatId });

    // TODO: fetch real results from persistence; for now return stubbed sample
    const results = [
      { key: 'network', status: 'pass', score: 0.92, details: { latencyMs: 18, packetLoss: 0 } },
      { key: 'disk', status: 'warn', score: 0.65, details: { freeGB: 8, recommendedCleanupGB: 12 } },
      { key: 'startup', status: 'pass', score: 0.9, details: { entries: 7, recommendedDisable: 2 } },
      { key: 'services', status: 'pass', score: 0.95, details: { stoppedCritical: 0 } },
    ];

    // Optional: log fetch event (not essential, but useful for audit trail completeness)
    await logAction({
      chatId: chatId ?? 'provisional',
      actionType: 'script_recommendation',
      status: 'proposed',
      summary: 'Health results fetched',
      payload: { jobId, count: results.length },
    }).catch(() => {});

    return NextResponse.json({ jobId, chatId, results, createdAt: new Date().toISOString() });
  } catch (err: any) {
    console.error('Health results error:', err);
    return NextResponse.json({ error: err?.message ?? 'Failed to fetch health results' }, { status: 400 });
  }
}
