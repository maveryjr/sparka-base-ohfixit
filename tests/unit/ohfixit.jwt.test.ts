import { describe, it, expect, beforeAll } from 'vitest';
import { signAutomationToken, verifyAutomationToken } from '@/lib/ohfixit/jwt';

describe('OhFixIt helper JWT', () => {
  beforeAll(() => {
    process.env.OHFIXIT_JWT_SECRET = process.env.OHFIXIT_JWT_SECRET || 'test-secret';
  });

  it('signs and verifies tokens', async () => {
    const token = await signAutomationToken({ chatId: 'c1', userId: 'u1', anonymousId: null, actionId: 'flush-dns-macos', approvalId: 'a1', scope: 'both' }, 60);
    expect(typeof token).toBe('string');
    const claims = await verifyAutomationToken(token);
    expect(claims.chatId).toBe('c1');
    expect(claims.userId).toBe('u1');
    expect(claims.actionId).toBe('flush-dns-macos');
    expect(claims.approvalId).toBe('a1');
    expect(claims.scope).toBe('both');
  });
});
