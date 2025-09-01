'use client';

import useSWR from 'swr';
import { useMemo } from 'react';

type ConsentEvent = {
  id: string;
  chatId: string;
  userId: string | null;
  kind: string;
  payload: any;
  createdAt: string | Date;
};

type ActionLog = {
  id: string;
  chatId: string;
  userId: string | null;
  actionType: string;
  status: string;
  summary: string | null;
  payload: any;
  createdAt: string | Date;
};

type DiagnosticsSnapshot = {
  id: string;
  chatId: string;
  userId: string | null;
  payload: any;
  createdAt: string | Date;
};

type AuditEvent =
  | ({ type: 'consent' } & ConsentEvent)
  | ({ type: 'action' } & ActionLog)
  | ({ type: 'diagnostics' } & DiagnosticsSnapshot);

const fetcher = async (url: string) => {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) {
    // Return an empty set on error to avoid UI crashes from parse errors
    return { events: [] } as { events: AuditEvent[] };
  }
  const ct = r.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    return r.json();
  }
  // Fallback if server misconfigured
  return { events: [] } as { events: AuditEvent[] };
};

export function AuditTimeline({ chatId }: { chatId: string }) {
  const { data, error, isLoading } = useSWR<{ events: AuditEvent[] }>(
    `/api/ohfixit/audit?chatId=${encodeURIComponent(chatId)}&limit=50`,
    fetcher,
    { refreshInterval: 15000 },
  );

  const events = useMemo(() => data?.events ?? [], [data]);

  if (error) return null;
  if (isLoading) return null;
  if (!events.length) return null;

  return (
    <div className="w-full mx-auto md:max-w-3xl px-2 @[400px]:px-4">
      <div className="rounded-md border border-border/50 bg-muted/30 p-2 md:p-3 mb-2">
        <div className="text-xs text-muted-foreground mb-2">Audit trail</div>
        <ul className="space-y-1">
          {events.map((e) => {
            const ts = new Date(e.createdAt as any).toLocaleString();
            if (e.type === 'consent') {
              return (
                <li key={`consent-${e.id}`} className="text-xs">
                  <span className="font-medium">Consent</span> — {e.kind}
                  <span className="text-muted-foreground"> • {ts}</span>
                </li>
              );
            }
            if (e.type === 'action') {
              return (
                <li key={`action-${e.id}`} className="text-xs">
                  <span className="font-medium">Action</span> — {e.actionType}
                  {e.status ? <span className="ml-1">[{e.status}]</span> : null}
                  {e.summary ? <span className="ml-1">— {e.summary}</span> : null}
                  <span className="text-muted-foreground"> • {ts}</span>
                </li>
              );
            }
            return (
              <li key={`diag-${e.id}`} className="text-xs">
                <span className="font-medium">Diagnostics snapshot</span>
                <span className="text-muted-foreground"> • {ts}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
