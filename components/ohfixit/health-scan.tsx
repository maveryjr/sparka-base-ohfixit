'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  chatId?: string | null;
  checks?: string[];
  className?: string;
};

type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'not_found';

export function HealthScan({ chatId = null, checks, className }: Props) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus>('queued');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const pollingRef = useRef<number | null>(null);

  const summary = useMemo(() => {
    if (!result) return null;
    return {
      overallScore: result.overallScore,
      overallStatus: result.overallStatus,
      counts: {
        healthy: result.healthyCount,
        warning: result.warningCount,
        critical: result.criticalCount,
      },
      totalChecks: result.totalChecks,
    };
  }, [result]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        // Kick off health scan job
        const res = await fetch('/api/ohfixit/health/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId, checks }),
        });
        if (!res.ok) throw new Error(`Failed to schedule: ${res.status}`);
        const { jobId: newJobId } = await res.json();
        if (cancelled) return;
        setJobId(newJobId);
        setStatus('running');

        // Poll for results
        const poll = async () => {
          try {
            const r = await fetch(`/api/ohfixit/health/results?jobId=${newJobId}${chatId ? `&chatId=${encodeURIComponent(chatId)}` : ''}`);
            if (!r.ok) throw new Error('failed to fetch results');
            const data = await r.json();
            if (cancelled) return;
            setStatus((data.status || 'running') as JobStatus);
            if (data.result) setResult(data.result);
            if (data.status === 'completed' || data.status === 'failed') {
              if (pollingRef.current) cancelAnimationFrame(pollingRef.current);
              pollingRef.current = null;
              return;
            }
            pollingRef.current = requestAnimationFrame(async () => {
              // modest delay between polls
              setTimeout(poll, 1200);
            });
          } catch (e: any) {
            if (cancelled) return;
            setError(e?.message || 'Polling error');
          }
        };
        poll();
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || 'Failed to start health scan');
        setStatus('failed');
      }
    }

    run();

    return () => {
      cancelled = true;
      if (pollingRef.current) cancelAnimationFrame(pollingRef.current);
      pollingRef.current = null;
    };
  }, [chatId, checks]);

  return (
    <div className={cn('rounded border p-3 text-sm space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div className="font-medium">Device Health Scan</div>
        <div className="text-xs text-muted-foreground">
          {status === 'running' && 'Running…'}
          {status === 'queued' && 'Queued'}
          {status === 'completed' && 'Completed'}
          {status === 'failed' && 'Failed'}
          {status === 'not_found' && 'No recent results'}
        </div>
      </div>

      {!result && status !== 'failed' && (
        <div className="text-muted-foreground text-xs">Preparing checks and collecting results…</div>
      )}

      {error && (
        <div className="text-xs text-red-600">{error}</div>
      )}

      {summary && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded bg-muted/30 p-2">
            <div className="text-xs text-muted-foreground">Overall</div>
            <div className="text-base font-medium">{summary.overallScore} / 100</div>
            <div className="text-xs capitalize">{summary.overallStatus}</div>
          </div>
          <div className="rounded bg-muted/30 p-2">
            <div className="text-xs text-muted-foreground">Checks</div>
            <div className="text-base font-medium">{summary.totalChecks}</div>
            <div className="text-xs">H {summary.counts.healthy} • W {summary.counts.warning} • C {summary.counts.critical}</div>
          </div>
        </div>
      )}

      {result?.checks?.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">Top issues</div>
          <ul className="space-y-1">
            {result.checks
              .sort((a: any, b: any) => {
                const rank: Record<string, number> = { critical: 0, warning: 1, healthy: 2, unknown: 3 };
                const diff = rank[a.status] - rank[b.status];
                return diff !== 0 ? diff : a.score - b.score;
              })
              .slice(0, 3)
              .map((c: any) => (
                <li key={c.id} className={cn('flex items-center gap-2',
                  c.status === 'critical' ? 'text-red-600' : c.status === 'warning' ? 'text-yellow-700' : 'text-green-700'
                )}>
                  <span className="text-xs capitalize">{c.status}</span>
                  <span className="font-medium">{c.name || c.id}</span>
                  <span className="text-xs text-muted-foreground truncate">{c.message}</span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default HealthScan;

