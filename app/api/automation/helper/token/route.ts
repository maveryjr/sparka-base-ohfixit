import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';
import { resolveActorIds } from '@/lib/ohfixit/logger';
import { signAutomationToken } from '@/lib/ohfixit/jwt';

export const dynamic = 'force-dynamic';

const schema = z.object({
  chatId: z.string().nullable().optional(),
  actionId: z.string().optional(),
  approvalId: z.string().optional(),
  scope: z.enum(['execute', 'report', 'both']).default('both').optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { chatId, actionId, approvalId, scope } = schema.parse(body);

    const { userId, anonymousId } = await resolveActorIds();
    const token = await signAutomationToken(
      {
        chatId: chatId ?? null,
        userId,
        anonymousId,
        actionId,
        approvalId,
        scope: scope ?? 'both',
      },
      60 * 10, // 10 minutes
    );

    // The helper can call report endpoint with this token
    const reportUrl = '/api/automation/helper/report';

    return NextResponse.json({ token, reportUrl, expiresIn: 600 });
  } catch (err: any) {
    console.error('helper/token error', err);
    return NextResponse.json({ error: err?.message ?? 'Failed to mint token' }, { status: 400 });
  }
}
