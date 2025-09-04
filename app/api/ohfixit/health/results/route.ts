import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { z } from 'zod';
import { logAction } from '@/lib/ohfixit/logger';

// Access the in-memory stub store created by the run route
const g = globalThis as any;
g.__ohfixit_health_jobs = g.__ohfixit_health_jobs || new Map<string, { status: 'queued' | 'running' | 'completed' | 'failed'; createdAt: number; result?: any }>();

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const chatId = searchParams.get('chatId');

    const querySchema = z.object({
      jobId: z.string().nullable(),
      chatId: z.string().nullable()
    });
    querySchema.parse({ jobId, chatId });

    // Check if we have a specific job in memory
    if (jobId) {
      const job = g.__ohfixit_health_jobs.get(jobId);
      if (job) {
        return NextResponse.json({
          jobId,
          status: job.status,
          result: job.result ?? null,
          chatId,
          progress: job.status === 'running' ? 'Running health checks...' : undefined
        });
      }
    }

    // Return recent health check results for the user/chat
    const recentJobs = Array.from(g.__ohfixit_health_jobs.entries())
      .map(([id, job]) => ({ jobId: id, ...job }))
      .filter(job => {
        // Filter by user or chat context
        const matchesUser = job.userId === session.user.id;
        const matchesChat = chatId && job.chatId === chatId;
        return matchesUser || matchesChat;
      })
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 1); // Get most recent

    if (recentJobs.length > 0 && recentJobs[0].result) {
      return NextResponse.json({
        jobId: recentJobs[0].jobId,
        status: recentJobs[0].status,
        result: recentJobs[0].result,
        chatId,
        isRecent: true
      });
    }

    // No recent results, return empty state
    const emptyResult = {
      overallScore: 0,
      overallStatus: 'unknown' as const,
      totalChecks: 0,
      healthyCount: 0,
      warningCount: 0,
      criticalCount: 0,
      checks: [],
      systemInfo: null,
      lastRunTime: null,
      nextRecommendedCheck: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };

    return NextResponse.json({
      jobId: null,
      chatId,
      status: 'not_found',
      result: emptyResult,
      message: 'No health check results found. Run a health check first.'
    });
  } catch (err: any) {
    console.error('Health results error:', err);
    return NextResponse.json({
      error: err?.message ?? 'Failed to fetch health results'
    }, { status: 400 });
  }
}
