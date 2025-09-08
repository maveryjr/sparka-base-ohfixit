'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { chatStore } from '@/lib/stores/chat-store';
import type { ModelId } from '@/lib/ai/model-id';
import { useChatInput } from '@/providers/chat-input-provider';

type Props = {
  chatId?: string | null;
  checks?: string[];
  className?: string;
};

type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'not_found';

export function HealthScan({ chatId = null, checks, className }: Props) {
  const { selectedModelId } = useChatInput();
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus>('queued');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const pollingRef = useRef<number | null>(null);
  const [showDetails, setShowDetails] = useState(false);

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

  function sendQuickFix(issue: string) {
    try {
      const { currentChatHelpers, getLastMessageId } = chatStore.getState();
      const sendMessage = currentChatHelpers?.sendMessage;
      if (!sendMessage) return;
      const parentId = getLastMessageId();
      const now = new Date();
      sendMessage({
        role: 'user',
        parts: [{ type: 'text', text: `Problem: ${issue}. Find and show one-click fixes I can run.` }],
        metadata: {
          selectedModel: selectedModelId as ModelId,
          selectedTool: 'oneClickFixTool',
          createdAt: now,
          parentMessageId: parentId,
        },
      });
    } catch {}
  }

  function sendGuideForCheck(check: any) {
    try {
      const { currentChatHelpers, getLastMessageId } = chatStore.getState();
      const sendMessage = currentChatHelpers?.sendMessage;
      if (!sendMessage) return;
      const parentId = getLastMessageId();
      const now = new Date();
      const goal = `Fix "${check.name || check.id}" (${check.category}). ${check.message || ''}`.slice(0, 280);
      sendMessage({
        role: 'user',
        parts: [{ type: 'text', text: `Goal: ${goal}` }],
        metadata: {
          selectedModel: selectedModelId as ModelId,
          selectedTool: 'guideSteps',
          createdAt: now,
          parentMessageId: parentId,
        },
      });
    } catch {}
  }

  async function startScan() {
    let cancelled = false;
    // Cancel any existing polling
    if (pollingRef.current) cancelAnimationFrame(pollingRef.current);
    pollingRef.current = null;
    setError(null);
    setResult(null);
    setStatus('queued');
    try {
      const requestBody: { chatId?: string; checks?: string[] } = {};
      if (chatId) requestBody.chatId = chatId;
      if (checks) requestBody.checks = checks;
      
      const res = await fetch('/api/ohfixit/health/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      if (!res.ok) throw new Error(`Failed to schedule: ${res.status}`);
      const { jobId: newJobId } = await res.json();
      if (cancelled) return;
      setJobId(newJobId);
      setStatus('running');

      const poll = async () => {
        try {
          const r = await fetch(`/api/ohfixit/health/results?jobId=${newJobId}${chatId ? `&chatId=${encodeURIComponent(chatId)}` : ''}`);
          if (!r.ok) throw new Error('failed to fetch results');
          const data = await r.json();
          setStatus((data.status || 'running') as JobStatus);
          if (data.result) setResult(data.result);
          if (data.status === 'completed' || data.status === 'failed') {
            if (pollingRef.current) cancelAnimationFrame(pollingRef.current);
            pollingRef.current = null;
            return;
          }
          pollingRef.current = requestAnimationFrame(async () => {
            setTimeout(poll, 1200);
          });
        } catch (e: any) {
          setError(e?.message || 'Polling error');
        }
      };
      poll();
    } catch (e: any) {
      setError(e?.message || 'Failed to start health scan');
      setStatus('failed');
    }
    return () => {
      cancelled = true;
      if (pollingRef.current) cancelAnimationFrame(pollingRef.current);
      pollingRef.current = null;
    };
  }

  useEffect(() => {
    startScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, JSON.stringify(checks)]);

  return (
    <div className={cn('rounded border p-3 text-sm space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div className="font-medium">Device Health Scan</div>
        <div className="flex items-center gap-2">
          <button
            className="px-2 py-1 rounded text-xs border hover:bg-accent"
            onClick={() => startScan()}
            disabled={status === 'running'}
          >
            {status === 'running' ? 'Running…' : 'Re-run'}
          </button>
          <button
            className="px-2 py-1 rounded text-xs border hover:bg-accent"
            onClick={() => setShowDetails((s) => !s)}
            disabled={!result}
          >
            {showDetails ? 'Hide details' : 'View details'}
          </button>
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
                <li key={c.id} className={cn('flex items-center gap-2 flex-wrap',
                  c.status === 'critical' ? 'text-red-600' : c.status === 'warning' ? 'text-yellow-700' : 'text-green-700'
                )}>
                  <span className="text-xs capitalize">{c.status}</span>
                  <span className="font-medium">{c.name || c.id}</span>
                  <span className="text-xs text-muted-foreground truncate">{c.message}</span>
                  {(c.status === 'critical' || c.status === 'warning') && (
                    <>
                      <button
                        className="ml-auto px-2 py-0.5 rounded text-xs border hover:bg-accent"
                        onClick={() => sendQuickFix(`${c.name || c.id}: ${c.message || ''}`)}
                      >
                        Quick fix
                      </button>
                      <button
                        className="px-2 py-0.5 rounded text-xs border hover:bg-accent"
                        onClick={() => sendGuideForCheck(c)}
                      >
                        Open guide
                      </button>
                    </>
                  )}
                </li>
              ))}
          </ul>

          {showDetails && (
            <div className="mt-3">
              <div className="text-xs text-muted-foreground mb-1">All checks</div>
              <ul className="space-y-2">
                {result.checks
                  .sort((a: any, b: any) => {
                    const rank: Record<string, number> = { critical: 0, warning: 1, healthy: 2, unknown: 3 };
                    const diff = rank[a.status] - rank[b.status];
                    return diff !== 0 ? diff : a.score - b.score;
                  })
                  .map((c: any) => (
                    <li key={c.id} className="border rounded p-2 bg-background/50">
                      <div className="flex items-center gap-2">
                        <span className={cn('text-xs capitalize', c.status === 'critical' ? 'text-red-600' : c.status === 'warning' ? 'text-yellow-700' : 'text-green-700')}>{c.status}</span>
                        <span className="font-medium">{c.name || c.id}</span>
                        <span className="text-xs text-muted-foreground">{c.category}</span>
                        <span className="ml-auto text-xs">Score: {c.score}</span>
                      </div>
                      {c.message && (
                        <div className="text-xs mt-1">{c.message}</div>
                      )}
                      {c.details && (
                        <div className="text-xs text-muted-foreground mt-1">{c.details}</div>
                      )}
                      {c.recommendation && (
                        <div className="text-xs mt-1">Recommendation: {c.recommendation}</div>
                      )}
                      {c.estimatedFixTime && (
                        <div className="text-xs text-muted-foreground mt-1">Est. fix time: {c.estimatedFixTime}</div>
                      )}
                      {(c.status === 'critical' || c.status === 'warning') && (
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            className="px-2 py-0.5 rounded text-xs border hover:bg-accent"
                            onClick={() => sendQuickFix(`${c.name || c.id}: ${c.message || ''}`)}
                          >
                            Quick fix
                          </button>
                          <button
                            className="px-2 py-0.5 rounded text-xs border hover:bg-accent"
                            onClick={() => sendGuideForCheck(c)}
                          >
                            Open guide
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default HealthScan;
