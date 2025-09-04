import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAutomationToken } from '@/lib/ohfixit/jwt';
import { db } from '@/lib/db/client';
import { actionLog, rollbackPoint } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const rollbackRequestSchema = z.object({
  actionLogId: z.string(),
  rollbackId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const authz = req.headers.get('authorization') || '';
    const m = authz.match(/^Bearer\s+(.+)$/i);
    if (!m) return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
    const token = m[1];

    const claims = await verifyAutomationToken(token);
    if (!claims) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await req.json();
    const { actionLogId, rollbackId } = rollbackRequestSchema.parse(body);

    // Find the action log entry
    const actionLogEntry = await db
      .select()
      .from(actionLog)
      .where(eq(actionLog.id, actionLogId))
      .limit(1);

    if (!actionLogEntry.length) {
      return NextResponse.json({ error: 'Action log not found' }, { status: 404 });
    }

    const log = actionLogEntry[0];
    
    // Check if user has permission to rollback this action
    if (log.userId !== claims.userId && log.chatId !== claims.chatId) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Find associated rollback point
    const rollbackData = await db
      .select()
      .from(rollbackPoint)
      .where(eq(rollbackPoint.actionLogId, actionLogId))
      .limit(1);

    if (!rollbackData.length) {
      return NextResponse.json({ 
        error: 'No rollback point found for this action',
        reversible: false 
      }, { status: 400 });
    }

    const rollback = rollbackData[0];
    const payload = log.payload as any;
    const actionId = payload?.actionId;

    if (!actionId) {
      return NextResponse.json({ error: 'Invalid action payload' }, { status: 400 });
    }

    // Create rollback instruction for desktop helper
    const rollbackInstruction = {
      action: 'rollback',
      actionId,
      actionLogId,
      rollbackId: rollbackId || rollback.id,
      rollbackMethod: rollback.method,
      rollbackData: rollback.data,
      timestamp: new Date().toISOString(),
    };

    // Update the action log to indicate rollback initiated
    await db
      .update(actionLog)
      .set({
        status: 'rolling_back',
        payload: {
          ...payload,
          rollbackInitiated: new Date().toISOString(),
        },
      })
      .where(eq(actionLog.id, actionLogId));

    return NextResponse.json({
      status: 'rollback_initiated',
      rollbackInstruction,
      message: `Rollback initiated for ${log.actionType}`,
    });
  } catch (err: any) {
    console.error('rollback error', err);
    return NextResponse.json({ error: err?.message ?? 'Failed to initiate rollback' }, { status: 500 });
  }
}

