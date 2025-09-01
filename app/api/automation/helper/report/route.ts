import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAutomationToken } from '@/lib/ohfixit/jwt';
import { db } from '@/lib/db/client';
import { actionArtifact, actionLog, rollbackPoint } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const artifactSchema = z.object({
  type: z.string(),
  uri: z.string().optional(),
  hash: z.string().optional(),
});

const rollbackSchema = z.object({
  method: z.string(),
  data: z.any().optional(),
});

const payloadSchema = z.object({
  actionLogId: z.string().optional(),
  actionId: z.string().optional(),
  success: z.boolean().optional(),
  output: z.string().optional(),
  artifacts: z.array(artifactSchema).default([]),
  rollbackPoint: rollbackSchema.optional(),
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
    const { actionLogId, actionId, success, output, artifacts, rollbackPoint: rb } = payloadSchema.parse(body);

    // Determine outcome from success boolean
    const outcome = success === false ? 'failure' : 'success';

    let finalActionLogId = actionLogId;

    // If no actionLogId provided, try to find one based on actionId and recent approvals
    if (!finalActionLogId && actionId) {
      const recentLogs = await db
        .select()
        .from(actionLog)
        .where(eq(actionLog.actionType, 'script_recommendation'))
        .orderBy(desc(actionLog.createdAt))
        .limit(10);

      const matchingLog = recentLogs.find(log => {
        const payload = log.payload as any;
        return payload?.actionId === actionId;
      });

      if (matchingLog) {
        finalActionLogId = matchingLog.id;
      }
    }

    // If still no actionLogId, create a new one
    if (!finalActionLogId) {
      const newLog = await db.insert(actionLog).values({
        chatId: claims.chatId || null,
        userId: claims.userId || null,
        actionType: 'script_recommendation',
        status: 'executed',
        outcome,
        executionHost: 'desktop-helper',
        summary: `Executed ${actionId || 'unknown action'}`,
        payload: { actionId, output, success },
      }).returning();

      finalActionLogId = newLog[0].id;
    } else {
      // Update existing action log
      await db
        .update(actionLog)
        .set({
          outcome,
          executionHost: 'desktop-helper',
          payload: { actionId, output, success },
        })
        .where(eq(actionLog.id, finalActionLogId));
    }

    if (artifacts.length) {
      await db.insert(actionArtifact).values(
        artifacts.map((a) => ({
          actionLogId: finalActionLogId,
          type: a.type,
          uri: a.uri,
          hash: a.hash,
        })),
      );
    }

    if (rb) {
      await db.insert(rollbackPoint).values({
        actionLogId: finalActionLogId,
        method: rb.method,
        data: rb.data ?? null,
      });
    }

    return NextResponse.json({ status: 'ok' });
  } catch (err: any) {
    console.error('helper/report error', err);
    return NextResponse.json({ error: err?.message ?? 'Failed to record report' }, { status: 400 });
  }
}
