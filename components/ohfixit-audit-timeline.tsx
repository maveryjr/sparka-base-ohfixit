'use client';

import React, { useEffect, useState } from 'react';

type AuditEvent = {
  type: 'consent' | 'action' | 'diagnostics';
  id: string;
  createdAt: string;
  summary?: string | null;
  status?: string | null;
  actionType?: string | null;
  outcome?: string | null;
};

export function OhFixItAuditTimeline({ chatId }: { chatId: string }) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/ohfixit/audit?chatId=${encodeURIComponent(chatId)}&limit=20`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to fetch audit');
        if (!active) return;
        setEvents(
          (data.events as any[]).map((e) => ({
            type: e.type,
            id: e.id,
            createdAt: e.createdAt,
            summary: e.summary ?? null,
            status: e.status ?? null,
            actionType: e.actionType ?? null,
            outcome: e.outcome ?? null,
          })),
        );
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || 'Audit error');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [chatId]);

  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Automation Audit</h3>
        <span className="text-xs text-neutral-500">Recent events</span>
      </div>
      {loading && <div className="text-xs text-neutral-500">Loading…</div>}
      {error && <div className="text-xs text-red-600">{error}</div>}
      <ul className="space-y-2 text-sm">
        {events.map((ev) => (
          <li key={ev.id} className="border rounded p-2">
            <div className="flex items-center justify-between">
              <div className="font-medium capitalize">{ev.type}</div>
              <div className="text-xs text-neutral-500">{new Date(ev.createdAt).toLocaleString()}</div>
            </div>
            {ev.summary && <div className="text-xs">{ev.summary}</div>}
            {ev.type === 'action' && (
              <div className="text-xs text-neutral-600 flex gap-2">
                <span>Status: {ev.status || 'n/a'}</span>
                <span>Outcome: {ev.outcome || 'n/a'}</span>
                <span>Kind: {ev.actionType || 'n/a'}</span>
              </div>
            )}
          </li>
        ))}
        {!loading && !events.length && (
          <li className="text-xs text-neutral-500">No events yet</li>
        )}
      </ul>
    </div>
  );
}

export default OhFixItAuditTimeline;
