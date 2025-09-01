import 'server-only';

import * as jose from 'jose';

const ALG = 'HS256';
const ISS = 'ohfixit-helper';
const AUD = 'desktop-helper';

function getSecret(): Uint8Array {
  const secret = process.env.OHFIXIT_JWT_SECRET || process.env.NEXTAUTH_SECRET || '';
  if (!secret) throw new Error('Missing OHFIXIT_JWT_SECRET');
  return new TextEncoder().encode(secret);
}

export type AutomationTokenClaims = {
  chatId: string | null;
  userId: string | null;
  anonymousId: string | null;
  actionId?: string;
  approvalId?: string;
  scope?: 'execute' | 'report' | 'both';
};

export async function signAutomationToken(
  claims: AutomationTokenClaims,
  ttlSeconds: number = 60 * 10,
): Promise<string> {
  const secret = getSecret();
  const jwt = await new jose.SignJWT({ ...claims })
    .setProtectedHeader({ alg: ALG })
    .setIssuer(ISS)
    .setAudience(AUD)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds} seconds`)
    .sign(secret);
  return jwt;
}

export async function verifyAutomationToken(token: string): Promise<AutomationTokenClaims> {
  const secret = getSecret();
  const { payload } = await jose.jwtVerify(token, secret, {
    issuer: ISS,
    audience: AUD,
    algorithms: [ALG],
  });
  // Basic shape validation
  return {
    chatId: (payload as any).chatId ?? null,
    userId: (payload as any).userId ?? null,
    anonymousId: (payload as any).anonymousId ?? null,
    actionId: (payload as any).actionId,
    approvalId: (payload as any).approvalId,
    scope: ((payload as any).scope as any) ?? 'both',
  };
}
