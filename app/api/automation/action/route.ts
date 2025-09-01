import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { generateActionPreview } from '@/lib/ohfixit/allowlist';
import { logAction } from '@/lib/ohfixit/logger';

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
      // TODO: persist approval with expiry, link to chatId/actionId
      await logAction({
        chatId: chatId ?? 'provisional',
        actionType: 'script_recommendation',
        status: 'approved',
        summary: `Approved ${actionId}`,
        payload: { actionId, approvalId: id },
      }).catch(() => {});
      return NextResponse.json({ approvalId: id, status: 'approved', actionId, chatId, expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() });
    }

    if (operation === 'execute') {
      const jobId = uuidv4();
      // TODO: enqueue execution to desktop helper; create ActionLog entry with preview + pending outcome
      await logAction({
        chatId: chatId ?? 'provisional',
        actionType: 'script_recommendation',
        status: 'executed',
        summary: `Execute ${actionId}`,
        payload: { actionId, approvalId: approvalId ?? null, jobId },
      }).catch(() => {});
      return NextResponse.json({ status: 'queued', jobId, actionId, approvalId: approvalId ?? null });
    }

    if (operation === 'rollback') {
      const jobId = uuidv4();
      // TODO: enqueue rollback via desktop helper, reference prior rollback point
      await logAction({
        chatId: chatId ?? 'provisional',
        actionType: 'script_recommendation',
        status: 'cancelled',
        summary: `Rollback for ${actionId}`,
        payload: { actionId, approvalId: approvalId ?? null, jobId },
      }).catch(() => {});
      return NextResponse.json({ status: 'queued', jobId, rollbackOf: approvalId ?? actionId });
    }

    return NextResponse.json({ error: 'Unsupported operation' }, { status: 400 });
  } catch (err: any) {
    console.error('Automation action error:', err);
    const message = err?.message ?? 'Failed to process automation action';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// generatePreview removed in favor of allowlist.generateActionPreview
