// Simple in-memory store for diagnostics data keyed by session (user or anonymous)
// Note: This is ephemeral and per-process. For MVP it is acceptable; future work can persist using DB.

export type ClientDiagnostics = {
  collectedAt: number;
  consent: boolean;
  data: {
    userAgent: string;
    platform?: string;
    languages?: string[];
    timeZone?: string;
    screen?: { width: number; height: number; dpr: number };
    device?: { memoryGB?: number; cores?: number };
    network?: {
      downlink?: number;
      effectiveType?: string;
      rtt?: number;
      saveData?: boolean;
    };
    battery?: {
      level?: number; // 0..1
      charging?: boolean;
    };
    window?: { innerWidth: number; innerHeight: number };
    osGuess?: { family: string; source: string };
  };
};

export type NetworkCheckResult = {
  target: string;
  ok: boolean;
  status?: number;
  latencyMs?: number;
  error?: string;
};

export type NetworkDiagnostics = {
  ranAt: number;
  results: NetworkCheckResult[];
};

type StoreRecord = {
  client?: ClientDiagnostics;
  network?: NetworkDiagnostics;
};

const store = new Map<string, StoreRecord>();

export function getRecord(sessionKey: string): StoreRecord | undefined {
  return store.get(sessionKey);
}

export function setClientDiagnostics(sessionKey: string, diag: ClientDiagnostics) {
  const rec = store.get(sessionKey) ?? {};
  rec.client = diag;
  store.set(sessionKey, rec);
}

export function setNetworkDiagnostics(sessionKey: string, net: NetworkDiagnostics) {
  const rec = store.get(sessionKey) ?? {};
  rec.network = net;
  store.set(sessionKey, rec);
}

export function getSessionKeyForIds({ userId, anonymousId }: { userId?: string | null; anonymousId?: string | null }) {
  return userId ? `u:${userId}` : anonymousId ? `a:${anonymousId}` : 'anon:unknown';
}
