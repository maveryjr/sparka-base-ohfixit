import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { listAllowlistedActions } from '@/lib/ohfixit/allowlist';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const actions = listAllowlistedActions().map((a) => ({
    id: a.id,
    title: a.title,
    os: a.os,
    category: a.category,
    description: a.implementation.description,
    reversible: a.implementation.reversible,
    estimatedTime: a.implementation.estimatedTime,
    requirements: a.implementation.requirements,
    risks: a.implementation.risks,
  }));
  return NextResponse.json({ actions });
}
