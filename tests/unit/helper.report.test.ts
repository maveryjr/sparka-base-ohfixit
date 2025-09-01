import { describe, it, expect, vi, beforeAll } from 'vitest';
import { verifyAutomationToken, signAutomationToken } from '@/lib/ohfixit/jwt';

describe('helper token basic behavior', () => {
  beforeAll(() => {
    process.env.OHFIXIT_JWT_SECRET = 'test-secret-123';
  });

  it('rejects invalid token', async () => {
    await expect(verifyAutomationToken('invalid.token.here')).rejects.toBeTruthy();
  });

  it('accepts a signed token', async () => {
    const token = await signAutomationToken({ chatId: null, userId: null, anonymousId: 'anon-1' }, 60);
    const claims = await verifyAutomationToken(token);
    expect(claims.anonymousId).toBe('anon-1');
  });
});
