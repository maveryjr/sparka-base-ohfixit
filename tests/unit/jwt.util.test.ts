import { describe, it, expect, beforeAll } from 'vitest';
import { signAutomationToken, verifyAutomationToken } from '@/lib/ohfixit/jwt';

describe('ohfixit jwt utils', () => {
  beforeAll(() => {
    process.env.OHFIXIT_JWT_SECRET = 'test-secret-123';
  });

  it('signs and verifies a token with expected claims', async () => {
    const token = await signAutomationToken({
      chatId: 'chat-1',
      userId: 'user-1',
      anonymousId: null,
      actionId: 'flush-dns-macos',
      approvalId: 'approv-1',
      scope: 'both',
    }, 60);

    const claims = await verifyAutomationToken(token);
    expect(claims.chatId).toBe('chat-1');
    expect(claims.userId).toBe('user-1');
    expect(claims.actionId).toBe('flush-dns-macos');
    expect(claims.approvalId).toBe('approv-1');
    expect(claims.scope).toBe('both');
  });
});
