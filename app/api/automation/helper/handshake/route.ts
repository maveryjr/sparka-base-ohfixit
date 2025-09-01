import { NextRequest, NextResponse } from 'next/server';
import { verifyAutomationToken } from '@/lib/ohfixit/jwt';

export const dynamic = 'force-dynamic';

// In-memory helper presence store (per process; replace with durable store if needed)
const g = globalThis as any;
g.__ohfixit_helpers = g.__ohfixit_helpers || new Map<string, { lastSeenAt: number; scope: string; claims: any }>();

export async function POST(req: NextRequest) {
  try {
    const authz = req.headers.get('authorization') || '';
    const m = authz.match(/^Bearer\s+(.+)$/i);
    if (!m) return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
    const token = m[1];

    const claims = await verifyAutomationToken(token);
    const key = [claims.userId || 'anon', claims.chatId || 'null', claims.approvalId || 'none'].join('::');
    g.__ohfixit_helpers.set(key, { lastSeenAt: Date.now(), scope: claims.scope || 'both', claims });

    return NextResponse.json({ status: 'ok', scope: claims.scope || 'both', claims });
  } catch (err: any) {
    console.error('helper/handshake error', err);
    return NextResponse.json({ error: err?.message ?? 'Failed to handshake' }, { status: 400 });
  }
}
