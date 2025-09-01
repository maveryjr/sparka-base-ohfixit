import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';

// Mock the DB client to avoid real DB calls
vi.mock('@/lib/db/client', () => {
  const selectImpl = vi.fn(() => ({
    from: () => ({
      where: () => ({
        limit: () => [{ id: 'al-1', summary: null }],
      }),
    }),
  }));
  const updateImpl = vi.fn(() => ({ where: () => ({}) }));
  const insertImpl = vi.fn(() => ({ values: () => ({}) }));
  return {
    db: {
      select: selectImpl,
      update: () => ({ set: () => ({ where: () => ({}) }) }),
      insert: () => ({ values: () => ({}) }),
    },
  };
});

// Ensure env secret is present before importing route code
beforeAll(() => {
  process.env.OHFIXIT_JWT_SECRET = 'test-secret-123';
});

// Import after mocks are set up
import { POST as reportPOST } from '@/app/api/automation/helper/report/route';
import { signAutomationToken } from '@/lib/ohfixit/jwt';

afterEach(() => {
  vi.clearAllMocks();
});

describe('helper/report route', () => {
  it('accepts a valid report with bearer token', async () => {
    const token = await signAutomationToken({ chatId: 'c1', userId: 'u1', anonymousId: null, actionId: 'flush-dns-macos', approvalId: 'ap-1', scope: 'report' }, 60);
    const req = new Request('http://localhost/api/automation/helper/report', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        actionLogId: 'al-1',
        outcome: 'success',
        artifacts: [{ type: 'log', uri: 'vercel-blob://logs/123', hash: 'abc' }],
        rollbackPoint: { method: 'script', data: { reverted: true } },
      }),
    });

    const res = await reportPOST(req as any);
    expect(res.status).toBe(200);
    const json: any = await (res as any).json();
    expect(json.status).toBe('ok');
  });
});
