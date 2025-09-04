'use client';

import { cn } from '@/lib/utils';

type Event = {
  type: 'consent' | 'action' | 'diagnostics';
  id: string;
  createdAt: string | Date;
  summary?: string | null;
  actionType?: string;
  status?: string;
  kind?: string;
  payload?: any;
};

export function AuditTrail({ events, className }: { events: Event[]; className?: string }) {
  return (
    <div className={cn('rounded border p-3 text-sm', className)}>
      <div className="font-medium mb-2">Consent & Action Timeline</div>
      {events.length === 0 ? (
        <div className="text-xs text-muted-foreground">No events yet.</div>
      ) : (
        <ul className="space-y-2">
          {events.map((e) => (
            <li key={e.id} className="border rounded p-2 bg-background/50">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">{e.type}</span>
                <span className="text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</span>
                {e.type === 'action' && (
                  <span className="text-xs">{e.actionType} • {e.status}</span>
                )}
                {e.type === 'consent' && (
                  <span className="text-xs">{e.kind}</span>
                )}
              </div>
              {e.summary && <div className="text-xs mt-1">{e.summary}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AuditTrail;

