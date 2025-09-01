import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAutomationToken } from '@/lib/ohfixit/jwt';
import { db } from '@/lib/db/client';
import { actionArtifact, actionLog, rollbackPoint } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

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
  actionLogId: z.string(),
  outcome: z.enum(['success', 'failure', 'aborted']).default('success'),
  message: z.string().optional(),
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
    const { actionLogId, outcome, artifacts, rollbackPoint: rb } = payloadSchema.parse(body);

    // ensure actionLog exists and update outcome + executionHost if not already set
    const existing = await db.select().from(actionLog).where(eq(actionLog.id, actionLogId)).limit(1);
    if (!existing.length) {
      return NextResponse.json({ error: 'Unknown actionLogId' }, { status: 400 });
    }

    await db
      .update(actionLog)
      .set({
        outcome,
        executionHost: 'desktop-helper',
        summary: existing[0].summary ?? null,
      })
      .where(eq(actionLog.id, actionLogId));

    if (artifacts.length) {
      await db.insert(actionArtifact).values(
        artifacts.map((a) => ({
          actionLogId,
          type: a.type,
          uri: a.uri,
          hash: a.hash,
        })),
      );
    }

    if (rb) {
      await db.insert(rollbackPoint).values({
        actionLogId,
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
