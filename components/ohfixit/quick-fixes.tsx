'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

type AllowlistedAction = {
  id: string;
  title: string;
  os: string;
  category: string;
  description: string;
  reversible: boolean;
  estimatedTime: string;
  requirements: string[];
  risks: string[];
};

async function fetcher(url: string) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.json();
}

export function QuickFixes({ chatId }: { chatId: string }) {
  const { data, error, isLoading } = useSWR<{ actions: AllowlistedAction[] }>(
    '/api/automation/allowlist',
    fetcher,
  );

  const [runningId, setRunningId] = useState<string | null>(null);

  const actions = useMemo(() => {
    const list = data?.actions ?? [];
    // Keep it simple: show a small, curated subset first
    const preferredOrder = [
      'toggle-wifi-macos',
      'flush-dns-macos',
      'restart-finder',
      'clear-recent-items',
      'clear-system-logs',
    ];
    const byPreferred = preferredOrder
      .map((id) => list.find((a) => a.id === id))
      .filter(Boolean) as AllowlistedAction[];
    // Fallback to first few if nothing matched
    return byPreferred.length ? byPreferred.slice(0, 5) : list.slice(0, 5);
  }, [data]);

  async function runOneClick(actionId: string) {
    try {
      setRunningId(actionId);
      // Approve
      const approveRes = await fetch('/api/automation/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'approve', actionId, chatId }),
      });
      const approveJson = await approveRes.json();
      if (!approveRes.ok) throw new Error(approveJson?.error || 'Approve failed');

      // Execute
      const execRes = await fetch('/api/automation/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'execute', actionId, chatId, approvalId: approveJson.approvalId }),
      });
      const execJson = await execRes.json();
      if (!execRes.ok) throw new Error(execJson?.error || 'Execute failed');

      toast.success('Fix queued');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to run fix');
    } finally {
      setRunningId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Fixes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <div className="text-sm text-red-600">Failed to load fixes</div>}
        {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}

        {actions.map((a) => (
          <div key={a.id} className="flex items-start justify-between gap-3 border rounded-md p-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="font-medium truncate">{a.title}</div>
                {!!a.estimatedTime && <Badge variant="secondary" className="text-xs">{a.estimatedTime}</Badge>}
              </div>
              <div className="text-xs text-muted-foreground line-clamp-2">{a.description}</div>
              {!!a.requirements.length && (
                <div className="text-[11px] text-muted-foreground mt-1">Req: {a.requirements.join(', ')}</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {a.risks.length > 0 && (
                <Badge variant="outline" className="text-[11px]">{a.reversible ? 'Reversible' : 'One-way'}</Badge>
              )}
              <Button size="sm" onClick={() => runOneClick(a.id)} disabled={runningId === a.id}>
                {runningId === a.id ? 'Running…' : 'Fix'}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

