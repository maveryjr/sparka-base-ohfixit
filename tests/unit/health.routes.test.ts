import { describe, it, expect, vi } from 'vitest';

// Mock auth to always return a user for run route
vi.mock('@/app/(auth)/auth', () => ({ auth: () => Promise.resolve({ user: { id: 'u1' } }) }));

import { POST as runPOST } from '@/app/api/ohfixit/health/run/route';
import { GET as resultsGET } from '@/app/api/ohfixit/health/results/route';

describe('health run/results routes', () => {
  it('schedules a job and fetches results', async () => {
    const runReq = new Request('http://localhost/api/ohfixit/health/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chatId: 'c1' }),
    });
    const runRes = await runPOST(runReq as any);
    expect(runRes.status).toBe(200);
    const runJson: any = await (runRes as any).json();
    expect(runJson.jobId).toBeTruthy();

    // Allow the stub job to complete
    await new Promise((r) => setTimeout(r, 60));

    const resultReq = new Request(`http://localhost/api/ohfixit/health/results?jobId=${runJson.jobId}`);
    const resultRes = await resultsGET(resultReq as any);
    expect(resultRes.status).toBe(200);
    const resultJson: any = await (resultRes as any).json();
    expect(resultJson.status).toBe('completed');
  });
});
