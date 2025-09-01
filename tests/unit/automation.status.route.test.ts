import { describe, it, expect, vi, afterEach } from 'vitest';

// Mock the DB client to return a list of action logs
vi.mock('@/lib/db/client', () => {
  return {
    db: {
      select: vi.fn(() => ({
        from: () => ({
          orderBy: () => ({
            limit: () => ([
              {
                id: 'al-123',
                status: 'executed',
                outcome: 'success',
                executionHost: 'desktop-helper',
                summary: 'Execute flush-dns',
                createdAt: new Date(),
                payload: { jobId: 'job-123' },
              },
            ]),
          }),
        }),
      })),
    },
  };
});

import { GET as statusGET } from '@/app/api/automation/action/status/route';

afterEach(() => {
  vi.clearAllMocks();
});

describe('automation status route', () => {
  it('returns status by jobId', async () => {
    const req = new Request('http://localhost/api/automation/action/status?jobId=job-123');
    const res = await statusGET(req as any);
    expect(res.status).toBe(200);
    const json: any = await (res as any).json();
    expect(json.jobId).toBe('job-123');
    expect(json.status).toBe('executed');
    expect(json.outcome).toBe('success');
  });
});
