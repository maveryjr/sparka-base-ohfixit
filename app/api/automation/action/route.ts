import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { generateActionPreview } from '@/lib/ohfixit/allowlist';
import { logAction } from '@/lib/ohfixit/logger';
import { db } from '@/lib/db/client';
import { actionLog } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { resolveActorIds } from '@/lib/ohfixit/logger';
import { signAutomationToken } from '@/lib/ohfixit/jwt';

const ActionOperation = z.enum(['preview', 'approve', 'execute', 'rollback']);

const actionRequestSchema = z.object({
  operation: ActionOperation,
  actionId: z.string(),
  parameters: z.object({}).catchall(z.any()).optional(),
  chatId: z.string().optional(),
  approvalId: z.string().optional(),
  sessionId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { operation, actionId, parameters, chatId, approvalId } = actionRequestSchema.parse(body);

    if (operation === 'preview') {
      const preview = generateActionPreview(actionId, parameters ?? {});
      // Best-effort audit log for proposed action
      await logAction({
        chatId: chatId ?? 'provisional',
        actionType: 'script_recommendation',
        status: 'proposed',
        summary: `Preview ${actionId}`,
        payload: { actionId, preview },
      }).catch(() => {});
      return NextResponse.json({
        actionId,
        preview,
        approvable: true,
        riskLevel: preview.risks.length > 0 ? 'medium' : 'low',
      });
    }

    if (operation === 'approve') {
      const id = uuidv4();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      // Validate action is allowlisted by generating a preview
      const preview = generateActionPreview(actionId, parameters ?? {});
      // Mint a token for the desktop helper to begin handshake if needed
      const { userId, anonymousId } = await resolveActorIds();
      const helperToken = await signAutomationToken(
        {
          chatId: chatId ?? null,
          userId,
          anonymousId,
          actionId,
          approvalId: id,
          scope: 'both',
        },
        60 * 10,
      );
      const reportUrl = '/api/automation/helper/report';
      // Persist approval with audit log; link to chatId/actionId
      const rows = await logAction({
        chatId: chatId ?? 'provisional',
        actionType: 'script_recommendation',
        status: 'approved',
        summary: `Approved ${actionId}`,
        payload: { actionId, approvalId: id, expiresAt: expiresAt.toISOString(), preview },
      }).catch(() => [] as any);
      const actionLogId = rows?.[0]?.id ?? null;
      return NextResponse.json({ approvalId: id, actionLogId, status: 'approved', actionId, chatId, expiresAt: expiresAt.toISOString(), helperToken, reportUrl, expiresIn: 600 });
    }

    if (operation === 'execute') {
      if (!approvalId) {
        return NextResponse.json({ error: 'approvalId is required to execute' }, { status: 400 });
      }
      // Find matching approval and ensure not expired; allow null chatId approvals
      const approvals = await db
        .select()
        .from(actionLog)
        .where(eq(actionLog.status, 'approved'))
        .orderBy(desc(actionLog.createdAt))
        .limit(100);
      const now = Date.now();
      const matched = approvals.find((row: any) => {
        const p = (row?.payload ?? {}) as Record<string, any>;
        if (!p || p.approvalId !== approvalId) return false;
        // Require actionId match if provided
        if (actionId && p.actionId && p.actionId !== actionId) return false;
        const exp = p.expiresAt ? Date.parse(p.expiresAt) : new Date(row.createdAt).getTime() + 10 * 60 * 1000;
        return !Number.isNaN(exp) && now <= exp;
      });
      if (!matched) {
        return NextResponse.json({ error: 'Approval missing or expired' }, { status: 400 });
      }
      const jobId = uuidv4();
      // Mint short-lived helper token scoped to this approval/action
      const { userId, anonymousId } = await resolveActorIds();
      const helperToken = await signAutomationToken(
        {
          chatId: chatId ?? matched.chatId ?? null,
          userId,
          anonymousId,
          actionId,
          approvalId,
          scope: 'both',
        },
        60 * 10,
      );
      const reportUrl = '/api/automation/helper/report';
      // Log the execution intent
      const rows = await logAction({
        chatId: chatId ?? 'provisional',
        actionType: 'script_recommendation',
        status: 'executed',
        summary: `Execute ${actionId}`,
        payload: { actionId, approvalId: approvalId ?? null, jobId, executionHost: 'desktop-helper' },
      }).catch(() => [] as any);
      const actionLogId = rows?.[0]?.id ?? null;
      return NextResponse.json({ status: 'queued', jobId, actionLogId, actionId, approvalId: approvalId ?? null, helperToken, reportUrl, expiresIn: 600 });
    }

    if (operation === 'rollback') {
      const jobId = uuidv4();
      const { userId, anonymousId } = await resolveActorIds();
      const helperToken = await signAutomationToken(
        {
          chatId: chatId ?? null,
          userId,
          anonymousId,
          actionId,
          approvalId: approvalId ?? undefined,
          scope: 'both',
        },
        60 * 10,
      );
      const reportUrl = '/api/automation/helper/report';
      // Enqueue rollback via desktop helper (future), reference prior rollback point
      const rows = await logAction({
        chatId: chatId ?? 'provisional',
        actionType: 'script_recommendation',
        status: 'cancelled',
        summary: `Rollback for ${actionId}`,
        payload: { actionId, approvalId: approvalId ?? null, jobId, executionHost: 'desktop-helper' },
      }).catch(() => [] as any);
      const actionLogId = rows?.[0]?.id ?? null;
      return NextResponse.json({ status: 'queued', jobId, actionLogId, rollbackOf: approvalId ?? actionId, helperToken, reportUrl, expiresIn: 600 });
    }

    return NextResponse.json({ error: 'Unsupported operation' }, { status: 400 });
  } catch (err: any) {
    console.error('Automation action error:', err);
    const message = err?.message ?? 'Failed to process automation action';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// generatePreview removed in favor of allowlist.generateActionPreview
