'use client';

import { cn } from '@/lib/utils';

export function ActionArtifacts({ artifacts, className }: { artifacts: Array<{ id: string; actionLogId: string; type: string; uri: string | null; hash: string | null; createdAt: string | Date }>; className?: string }) {
  return (
    <div className={cn('rounded border p-3 text-sm', className)}>
      <div className="font-medium mb-2">Action artifacts</div>
      {artifacts.length === 0 ? (
        <div className="text-xs text-muted-foreground">No artifacts found.</div>
      ) : (
        <ul className="space-y-2">
          {artifacts.map((a) => (
            <li key={a.id} className="border rounded p-2 bg-background/50">
              <div className="flex items-center gap-2">
                <span className="font-medium">{a.type}</span>
                <span className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</span>
                <span className="ml-auto text-xs">{a.hash ? a.hash.slice(0, 8) : ''}</span>
              </div>
              {a.uri && (
                <div className="text-xs mt-1 break-all">
                  <a className="underline" href={a.uri} target="_blank" rel="noreferrer">{a.uri}</a>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ActionArtifacts;

