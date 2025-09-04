import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { HealthFixRequestSchema, resolveHealthFix } from '@/lib/ohfixit/health-fix-map';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { chatId, checkId } = HealthFixRequestSchema.parse(body);

    const mapping = resolveHealthFix(checkId);
    if (!mapping) {
      return NextResponse.json({ error: `No auto-fix available for check '${checkId}'` }, { status: 400 });
    }

    // 1) Preview (best-effort; UI might have shown it already)
    const previewRes = await fetch(new URL('/api/automation/action', request.url), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ operation: 'preview', actionId: mapping.actionId, parameters: mapping.parameters ?? {}, chatId }),
      cache: 'no-store',
    });
    if (!previewRes.ok) {
      const err = await previewRes.json().catch(() => ({}));
      return NextResponse.json({ error: 'Preview failed', details: err }, { status: 400 });
    }

    // 2) Approve
    const approveRes = await fetch(new URL('/api/automation/action', request.url), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ operation: 'approve', actionId: mapping.actionId, chatId }),
      cache: 'no-store',
    });
    if (!approveRes.ok) {
      const err = await approveRes.json().catch(() => ({}));
      return NextResponse.json({ error: 'Approve failed', details: err }, { status: 400 });
    }
    const approveJson = await approveRes.json();

    // 3) Execute
    const executeRes = await fetch(new URL('/api/automation/action', request.url), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ operation: 'execute', actionId: mapping.actionId, chatId, approvalId: approveJson.approvalId }),
      cache: 'no-store',
    });
    if (!executeRes.ok) {
      const err = await executeRes.json().catch(() => ({}));
      return NextResponse.json({ error: 'Execute failed', details: err }, { status: 400 });
    }
    const execJson = await executeRes.json();

    return NextResponse.json({
      status: 'queued',
      checkId,
      mapping,
      approval: approveJson,
      execution: execJson,
    });
  } catch (err: any) {
    console.error('Health auto-fix error:', err);
    return NextResponse.json({ error: err?.message ?? 'Failed to run auto-fix' }, { status: 400 });
  }
}
