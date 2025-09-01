import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { logAction } from '@/lib/ohfixit/logger';

// Very small in-memory stub store for demo/testing purposes only
const g = globalThis as any;
g.__ohfixit_health_jobs = g.__ohfixit_health_jobs || new Map<string, { status: 'queued' | 'running' | 'completed' | 'failed'; createdAt: number; result?: any }>();

const runSchema = z.object({
  chatId: z.string().optional(),
  checks: z.array(z.string()).optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { chatId, checks, priority } = runSchema.parse(body);

    const jobId = uuidv4();
    // Enqueue stub job in memory and simulate completion
    g.__ohfixit_health_jobs.set(jobId, { status: 'queued', createdAt: Date.now() });
    setTimeout(() => {
      const job = g.__ohfixit_health_jobs.get(jobId);
      if (!job) return;
      job.status = 'completed';
      job.result = {
        overallScore: 82,
        overallStatus: 'warning',
        checks: [],
        lastRunTime: new Date().toISOString(),
      };
      g.__ohfixit_health_jobs.set(jobId, job);
    }, 50);

    // Log action to audit timeline
    await logAction({
      chatId: chatId ?? 'provisional',
      actionType: 'script_recommendation',
      status: 'proposed',
      summary: 'Health checks scheduled',
      payload: { jobId, checks: checks ?? null, priority: priority ?? 'normal' },
    }).catch(() => {});

    return NextResponse.json({
      jobId,
      status: 'queued',
      acceptedChecks: checks ?? ['network', 'disk', 'startup', 'services'],
      priority: priority ?? 'normal',
      estimatedTime: '30–90 seconds',
      chatId: chatId ?? null,
    });
  } catch (err: any) {
    console.error('Health run error:', err);
    return NextResponse.json({ error: err?.message ?? 'Failed to schedule health checks' }, { status: 400 });
  }
}
