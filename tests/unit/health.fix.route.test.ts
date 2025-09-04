import { describe, it, expect, vi } from 'vitest';

// Mock auth to always return a user
vi.mock('@/app/(auth)/auth', () => ({ auth: () => Promise.resolve({ user: { id: 'u1' } }) }));

// Mock fetch calls to the automation/action route
const fetchMock = vi.fn(async (url: any, init?: any) => {
  const body = init?.body ? JSON.parse(init.body) : {};
  if (typeof url === 'object' && 'pathname' in url) {
    // NextRequest URL object
  }
  if (String(url).includes('/api/automation/action')) {
    if (body.operation === 'preview') {
      return new Response(JSON.stringify({ approvable: true }), { status: 200 });
    }
    if (body.operation === 'approve') {
      return new Response(JSON.stringify({ approvalId: 'appr-1', expiresAt: new Date(Date.now() + 600000).toISOString() }), { status: 200 });
    }
    if (body.operation === 'execute') {
      return new Response(JSON.stringify({ status: 'queued', jobId: 'job-1' }), { status: 200 });
    }
    return new Response(JSON.stringify({ error: 'bad op' }), { status: 400 });
  }
  return new Response('{}', { status: 200 });
});

vi.stubGlobal('fetch', fetchMock);

import { POST as fixPOST } from '@/app/api/ohfixit/health/fix/route';

describe('health fix route', () => {
  it('maps dns-health to flush-dns-macos and orchestrates flow', async () => {
    const req = new Request('http://localhost/api/ohfixit/health/fix', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chatId: 'c1', checkId: 'dns-health' }),
    });

    const res = await fixPOST(req as any);
    expect(res.status).toBe(200);
    const json: any = await (res as any).json();
    expect(json.status).toBe('queued');
    expect(json.mapping.actionId).toBe('flush-dns-macos');
    expect(json.approval.approvalId).toBeTruthy();
    expect(json.execution.jobId).toBeTruthy();
  });

  it('returns 400 for unmapped check', async () => {
    const req = new Request('http://localhost/api/ohfixit/health/fix', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chatId: 'c1', checkId: 'unknown-check' }),
    });
    const res = await fixPOST(req as any);
    expect(res.status).toBe(400);
  });
});
