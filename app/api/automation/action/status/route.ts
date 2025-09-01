import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { actionLog } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const actionLogId = searchParams.get('actionLogId');
    if (!jobId && !actionLogId) {
      return NextResponse.json({ error: 'jobId or actionLogId is required' }, { status: 400 });
    }

    // Fetch recent logs and search in memory to avoid JSON querying complexity
    const rows = await db.select().from(actionLog).orderBy(desc(actionLog.createdAt)).limit(200);
    const found = rows.find((row: any) => {
      if (actionLogId && row.id === actionLogId) return true;
      if (jobId) {
        const p = (row?.payload ?? {}) as Record<string, any>;
        return p?.jobId === jobId;
      }
      return false;
    });

    if (!found) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    const payload = (found.payload ?? {}) as Record<string, any>;
    return NextResponse.json({
      actionLogId: found.id,
      jobId: payload?.jobId ?? null,
      status: found.status,
      outcome: found.outcome ?? null,
      executionHost: found.executionHost ?? null,
      createdAt: found.createdAt,
      summary: found.summary ?? null,
    });
  } catch (err: any) {
    console.error('automation status error:', err);
    return NextResponse.json({ error: err?.message ?? 'Failed to fetch status' }, { status: 400 });
  }
}
