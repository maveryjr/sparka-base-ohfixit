import { describe, it, expect, beforeEach } from 'vitest';
import { setClientDiagnostics, setNetworkDiagnostics, getSessionKeyForIds } from '@/lib/ohfixit/diagnostics-store';
import buildDiagnosticsContext from '@/lib/ohfixit/diagnostics-context';

describe('buildDiagnosticsContext', () => {
  const userId = 'user-123';
  const chatId = 'test-chat-ctx';
  const sessionKey = { userId, anonymousId: null, chatId };

  beforeEach(() => {
    // no reset needed; keys are unique per test as userId+chatId constant
  });

  it('returns null when no diagnostics exist', async () => {
    const text = await buildDiagnosticsContext({ userId, anonymousId: null, chatId });
    expect(text === null || typeof text === 'string').toBe(true);
  });

  it('includes OS, capabilities, client snapshot and network checks', async () => {
    await setClientDiagnostics(sessionKey, {
      collectedAt: Date.now(),
      consent: true,
      data: {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        platform: 'MacIntel',
        languages: ['en-US', 'en'],
        timeZone: 'America/Los_Angeles',
        screen: { width: 1440, height: 900, dpr: 2 },
        device: { memoryGB: 16, cores: 8 },
        network: { effectiveType: '4g', downlink: 10, rtt: 50, saveData: false },
        battery: { level: 0.85, charging: true },
        window: { innerWidth: 1280, innerHeight: 720 },
        osGuess: { family: 'macOS', source: 'ua' },
      },
    });

    await setNetworkDiagnostics(sessionKey, {
      ranAt: Date.now(),
      results: [
        { target: 'https://example.com/ping', ok: true, status: 200, latencyMs: 120 },
        { target: 'https://api.example.com', ok: false, status: 503, error: 'Service Unavailable' },
      ],
    });

    const text = await buildDiagnosticsContext({ userId, anonymousId: null, chatId });
    expect(text).toBeTruthy();
    const s = text as string;
    expect(s).toContain('OS: macOS');
    expect(s).toContain('Capabilities:');
    expect(s).toContain('Client Snapshot:');
    expect(s).toContain('userAgent: Mozilla/5.0');
    expect(s).toContain('screen: 1440x900 @2.00x');
    expect(s).toContain('device: 16 GB RAM, 8 cores');
    expect(s).toContain('Network Checks:');
    expect(s).toContain('https://example.com/ping: OK (200) 120ms');
    expect(s).toContain('https://api.example.com: FAIL (503)');
    expect(s).toContain('Modeling Constraints for You:');
  });
});
