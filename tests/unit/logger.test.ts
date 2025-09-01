import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mocks for auth and anonymous session utilities
vi.mock('@/app/(auth)/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/anonymous-session-server', () => ({
  getAnonymousSession: vi.fn(),
  createAnonymousSession: vi.fn(),
  setAnonymousSession: vi.fn(),
}));

// Schema objects (used only for identity in mocked db)
import * as Schema from '@/lib/db/schema';

// Helper to capture insert payloads per table
type InsertCapture = {
  table:
    | typeof Schema.consentEvent
    | typeof Schema.actionLog
    | typeof Schema.diagnosticsSnapshot
    | null;
  values: any | null;
};

const insertCapture: InsertCapture = { table: null, values: null };

// Mock DB client with chainable API for insert/select
const mockDb = {
  insert: vi.fn((table: any) => ({
    values: (vals: any) => {
      insertCapture.table = table;
      insertCapture.values = vals;
      return {
        returning: () => Promise.resolve([vals]),
      };
    },
  })),
  select: vi.fn(() => ({
    from: (table: any) => ({
      where: (_: any) => ({
        orderBy: (_ob: any) => ({
          limit: async (_n: number) => {
            // Return arrays based on requested table for timeline tests
            if (table === Schema.consentEvent) {
              return consentRowsMock;
            }
            if (table === Schema.actionLog) {
              return actionRowsMock;
            }
            if (table === Schema.diagnosticsSnapshot) {
              return diagRowsMock;
            }
            return [];
          },
        }),
      }),
    }),
  })),
};

// Provide mocked db to the module under test
vi.mock('@/lib/db/client', () => ({ db: mockDb }));

// Typed access to the mocked modules
const { auth } = await import('@/app/(auth)/auth');
const {
  getAnonymousSession,
  createAnonymousSession,
  setAnonymousSession,
} = await import('@/lib/anonymous-session-server');

// Import module under test AFTER mocks are in place
const Logger = await import('@/lib/ohfixit/logger');

// Timeline rows storage controlled per test
let consentRowsMock: any[] = [];
let actionRowsMock: any[] = [];
let diagRowsMock: any[] = [];

describe('ohfixit/logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertCapture.table = null;
    insertCapture.values = null;
    consentRowsMock = [];
    actionRowsMock = [];
    diagRowsMock = [];
  });

  afterEach(() => {
    // no-op
  });

  it('logConsent includes userId and omits anonymousId when user authenticated', async () => {
    (auth as any).mockResolvedValue({ user: { id: 'user-123' } });
    (getAnonymousSession as any).mockResolvedValue({ id: 'anon-xyz' });

    const rows = await Logger.logConsent({
      chatId: 'chat-1',
      kind: 'diagnostics',
      payload: { foo: 'bar' },
    });

    expect(mockDb.insert).toHaveBeenCalledOnce();
    // Returned row mirrors inserted values
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.chatId).toBe('chat-1');
    expect(row.userId).toBe('user-123');
    expect(row.kind).toBe('diagnostics');
    const payload1 = row.payload as any;
    expect(payload1.foo).toBe('bar');
    // anonymousId is omitted when user exists
    expect('anonymousId' in payload1).toBe(false);
  });

  it('logConsent includes anonymousId and null userId when unauthenticated', async () => {
    (auth as any).mockResolvedValue(null);
    (getAnonymousSession as any).mockResolvedValue({ id: 'anon-42' });

    const rows = await Logger.logConsent({
      chatId: 'chat-2',
      kind: 'screenshot',
      payload: { consent: true },
    });

    const row = rows[0];
    const payload2 = row.payload as any;
    expect(row.userId).toBeNull();
    expect(payload2.consent).toBe(true);
    expect(payload2.anonymousId).toBe('anon-42');
  });

  it('logAction defaults status to "proposed" and summary to null', async () => {
    (auth as any).mockResolvedValue({ user: { id: 'user-9' } });
    (getAnonymousSession as any).mockResolvedValue({ id: 'anon-9' });

    const [row] = await Logger.logAction({
      chatId: 'chat-3',
      actionType: 'guide_step',
      payload: { step: 1 },
    });

    expect(row.status).toBe('proposed');
    expect(row.summary).toBeNull();
    // user wins; anonymousId omitted
    const payload3 = row.payload as any;
    expect('anonymousId' in payload3).toBe(false);
  });

  it('getAuditTimeline merges and sorts events by createdAt desc with pagination', async () => {
    // Prepare rows with interleaved timestamps
    const t1 = new Date('2024-01-01T10:00:00Z');
    const t2 = new Date('2024-01-01T10:05:00Z');
    const t3 = new Date('2024-01-01T10:03:00Z');

    consentRowsMock = [
      { id: 'c1', chatId: 'chat-X', createdAt: t1, kind: 'diagnostics', userId: 'u1', payload: {} },
    ];
    actionRowsMock = [
      { id: 'a1', chatId: 'chat-X', createdAt: t2, actionType: 'open_url', status: 'executed', userId: 'u1', payload: {}, summary: null },
    ];
    diagRowsMock = [
      { id: 'd1', chatId: 'chat-X', createdAt: t3, userId: 'u1', payload: {} },
    ];

  const result = await Logger.getAuditTimeline({ chatId: 'chat-X', limit: 2, offset: 0 });
    // Expect 2 most recent: action (t2), diagnostics (t3) or check order strictly
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('action');
    expect((result[0] as any).id).toBe('a1');
    expect(result[1].type).toBe('diagnostics');
    expect((result[1] as any).id).toBe('d1');

    // Next page (offset 2, limit 2) should return the remaining consent event
    const page2 = await Logger.getAuditTimeline({ chatId: 'chat-X', limit: 2, offset: 2 });
    expect(page2).toHaveLength(1);
    expect(page2[0].type).toBe('consent');
    expect((page2[0] as any).id).toBe('c1');
  });
});
