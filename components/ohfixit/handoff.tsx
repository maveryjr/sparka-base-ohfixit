'use client';

import { cn } from '@/lib/utils';

export function HandoffBanner({ session, className }: { session: { id: string; chatId: string; status: string; reason?: string | null; joinLink?: string }; className?: string }) {
  return (
    <div className={cn('rounded border p-3 text-sm bg-amber-50', className)}>
      <div className="font-medium mb-1">Human handoff</div>
      <div className="text-xs text-muted-foreground">Status: {session.status}</div>
      {session.reason && (
        <div className="text-xs mt-1">Reason: {session.reason}</div>
      )}
      {session.joinLink && (
        <div className="text-xs mt-1">
          <a className="underline" href={session.joinLink}>Open support room</a>
        </div>
      )}
    </div>
  );
}

export default HandoffBanner;

