import { describe, it, expect } from 'vitest';
import {
  getSessionKeyForIds,
  setClientDiagnostics,
  setNetworkDiagnostics,
  getRecordByChat,
  type ClientDiagnostics,
  type NetworkDiagnostics,
} from '@/lib/ohfixit/diagnostics-store';

describe('diagnostics-store', () => {
  it('getSessionKeyForIds returns object with chatId', () => {
    const key = getSessionKeyForIds({ userId: 'u1', anonymousId: 'a1', chatId: 'c1' });
    expect(key).toEqual({ userId: 'u1', anonymousId: 'a1', chatId: 'c1' });
  });

  it('set and get records for client and network (DB-backed)', async () => {
    const chatId = 'test-chat-1';
    const userId = 'uX';
    const key = { chatId, userId, anonymousId: null };
    const client: ClientDiagnostics = {
      collectedAt: Date.now(),
      consent: true,
      data: {
        userAgent: 'test-UA',
        window: { innerWidth: 800, innerHeight: 600 },
        screen: { width: 1920, height: 1080, dpr: 2 },
      },
    };
    await setClientDiagnostics(key, client);

    const network: NetworkDiagnostics = {
      ranAt: Date.now(),
      results: [
        { target: 'https://example.com', ok: true, status: 200, latencyMs: 50 },
        { target: 'https://bad.example.com', ok: false, error: 'fetch_error' },
      ],
    };
    await setNetworkDiagnostics(key, network);

    const rec = await getRecordByChat(key);
    expect(rec).toBeDefined();
    expect(rec?.client?.data.userAgent).toBe('test-UA');
    expect(rec?.network?.results.length).toBe(2);
  });
});
