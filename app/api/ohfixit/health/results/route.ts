import { NextRequest, NextResponse } from 'next/server';

// Access the in-memory stub store created by the run route
const g = globalThis as any;
g.__ohfixit_health_jobs = g.__ohfixit_health_jobs || new Map<string, { status: 'queued' | 'running' | 'completed' | 'failed'; createdAt: number; result?: any }>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }
    const job = g.__ohfixit_health_jobs.get(jobId);
    if (!job) {
      return NextResponse.json({ error: 'job not found' }, { status: 404 });
    }
    return NextResponse.json({ jobId, status: job.status, result: job.result ?? null });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch results' }, { status: 400 });
  }
}
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
