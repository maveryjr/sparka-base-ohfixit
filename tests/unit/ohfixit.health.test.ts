import { describe, it, expect, vi, beforeAll } from 'vitest';
import { HealthCheckEngine } from '@/lib/ohfixit/health-check-engine';

describe('OhFixIt HealthCheckEngine', () => {
  beforeAll(() => {
    vi.stubGlobal('navigator', {
      platform: 'MacIntel',
      appVersion: '5.0 (Macintosh)',
      userAgent: 'Mozilla/5.0',
      storage: { estimate: vi.fn().mockResolvedValue({ quota: 1_000_000, usage: 100_000 }) },
    } as any);
    vi.stubGlobal('performance', { now: () => 1000 } as any);
    vi.stubGlobal('fetch', vi.fn(async () => {
      return new Response(null, { status: 200, headers: { date: new Date().toUTCString() } });
    }));
  });

  it('runs checks and returns a summary', async () => {
    const engine = new HealthCheckEngine();
    const summary = await engine.runAllChecks();
    expect(summary).toBeTruthy();
    expect(typeof summary.overallScore).toBe('number');
    expect(Array.isArray(summary.checks)).toBe(true);
    expect(summary.checks.length).toBeGreaterThan(0);
  });
});
