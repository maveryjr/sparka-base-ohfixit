import { describe, it, expect } from 'vitest';
import {
  getSessionKeyForIds,
  setClientDiagnostics,
  setNetworkDiagnostics,
  getRecord,
  type ClientDiagnostics,
  type NetworkDiagnostics,
} from '@/lib/ohfixit/diagnostics-store';

describe('diagnostics-store', () => {
  it('getSessionKeyForIds prefers user over anonymous, falls back to anon:unknown', () => {
    expect(getSessionKeyForIds({ userId: 'u1', anonymousId: 'a1' })).toBe('u:u1');
    expect(getSessionKeyForIds({ userId: null, anonymousId: 'a1' })).toBe('a:a1');
    expect(getSessionKeyForIds({ userId: undefined, anonymousId: undefined })).toBe('anon:unknown');
  });

  it('set and get records for client and network', () => {
    const key = getSessionKeyForIds({ userId: 'uX', anonymousId: null });
    const client: ClientDiagnostics = {
      collectedAt: Date.now(),
      consent: true,
      data: {
        userAgent: 'test-UA',
        window: { innerWidth: 800, innerHeight: 600 },
        screen: { width: 1920, height: 1080, dpr: 2 },
      },
    };
    setClientDiagnostics(key, client);

    const network: NetworkDiagnostics = {
      ranAt: Date.now(),
      results: [
        { target: 'https://example.com', ok: true, status: 200, latencyMs: 50 },
        { target: 'https://bad.example.com', ok: false, error: 'fetch_error' },
      ],
    };
    setNetworkDiagnostics(key, network);

    const rec = getRecord(key);
    expect(rec).toBeDefined();
    expect(rec?.client?.data.userAgent).toBe('test-UA');
    expect(rec?.network?.results.length).toBe(2);
  });
});
