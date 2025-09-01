import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const runSchema = z.object({
  chatId: z.string().optional(),
  checks: z.array(z.string()).optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { chatId, checks, priority } = runSchema.parse(body);

    const jobId = uuidv4();

    // TODO: enqueue health checks (browser-level now; helper-powered in Phase 2)
    // Persist job request linked to userId/chatId; return ETA based on checks

    return NextResponse.json({
      jobId,
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
