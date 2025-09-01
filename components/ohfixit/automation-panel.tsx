'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

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

type Preview = {
  description: string;
  commands: string[];
  risks: string[];
  reversible: boolean;
  estimatedTime: string;
  requirements: string[];
  previewDiff?: string;
};

async function fetcher(url: string) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.json();
}

export function AutomationPanel({ chatId }: { chatId: string }) {
  const { data, error, isLoading } = useSWR<{ actions: AllowlistedAction[] }>(
    '/api/automation/allowlist',
    fetcher,
  );
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [bundleId, setBundleId] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [approval, setApproval] = useState<{ approvalId: string; expiresAt: string; actionLogId?: string | null } | null>(null);
  const [exec, setExec] = useState<{ jobId: string; actionLogId?: string | null; helperToken?: string; reportUrl?: string; expiresIn?: number } | null>(null);
  const actions = data?.actions ?? [];

  useEffect(() => {
    if (!selectedAction && actions.length) setSelectedAction(actions[0].id);
  }, [actions, selectedAction]);

  const selected = useMemo(() => actions.find((a) => a.id === selectedAction), [actions, selectedAction]);

  async function doPreview() {
    if (!selected) return;
    const parameters = selected.id === 'clear-app-cache' && bundleId ? { bundleId } : {};
    const res = await fetch('/api/automation/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation: 'preview', actionId: selected.id, parameters, chatId }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'Preview failed');
    setPreview(json.preview);
    setApproval(null);
    setExec(null);
  }

  async function doApprove() {
    if (!selected) return;
    const res = await fetch('/api/automation/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation: 'approve', actionId: selected.id, chatId }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'Approve failed');
    setApproval({ approvalId: json.approvalId, expiresAt: json.expiresAt, actionLogId: json.actionLogId });
  }

  async function doExecute() {
    if (!selected || !approval) return;
    const res = await fetch('/api/automation/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation: 'execute', actionId: selected.id, chatId, approvalId: approval.approvalId }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'Execute failed');
    setExec({ jobId: json.jobId, actionLogId: json.actionLogId, helperToken: json.helperToken, reportUrl: json.reportUrl, expiresIn: json.expiresIn });
  }

  async function doRollback() {
    if (!selected) return;
    const res = await fetch('/api/automation/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation: 'rollback', actionId: selected.id, chatId, approvalId: approval?.approvalId }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'Rollback failed');
    // We don't track rollback job beyond response here
    setExec({ jobId: json.jobId, actionLogId: json.actionLogId, helperToken: json.helperToken, reportUrl: json.reportUrl, expiresIn: json.expiresIn });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Automation Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <div className="text-sm text-red-600">Failed to load allowlist</div>}
        {isLoading && <div className="text-sm text-muted-foreground">Loading actions…</div>}
        {!!actions.length && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
              <label className="text-sm w-36">Action</label>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger className="w-[320px]">
                  <SelectValue placeholder="Select an action" />
                </SelectTrigger>
                <SelectContent>
                  {actions.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="ml-auto flex gap-2">
                <Button size="sm" onClick={doPreview}>Preview</Button>
                <Button size="sm" variant="secondary" onClick={doApprove} disabled={!preview}>Approve</Button>
                <Button size="sm" variant="default" onClick={doExecute} disabled={!approval}>Execute</Button>
                <Button size="sm" variant="outline" onClick={doRollback}>Rollback</Button>
              </div>
            </div>

            {selected?.id === 'clear-app-cache' && (
              <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
                <label className="text-sm w-36">Bundle ID</label>
                <Input className="w-[320px]" placeholder="com.example.app" value={bundleId} onChange={(e) => setBundleId(e.target.value)} />
                <span className="text-xs text-muted-foreground">Optional: customize target app cache</span>
              </div>
            )}

            {selected && (
              <div className="text-xs text-muted-foreground space-y-1">
                <div><strong>OS:</strong> {selected.os} &nbsp; <strong>Category:</strong> {selected.category}</div>
                <div className="flex gap-2 items-center">
                  <Badge variant="outline">{selected.reversible ? 'Reversible' : 'One-way'}</Badge>
                  {selected.estimatedTime && <Badge variant="secondary">{selected.estimatedTime}</Badge>}
                </div>
              </div>
            )}

            {preview && (
              <div className="rounded-md border p-3">
                <div className="text-sm font-medium mb-2">Preview</div>
                <p className="text-sm mb-2">{preview.description}</p>
                {!!preview.requirements.length && (
                  <div className="text-xs mb-2"><strong>Requirements:</strong> {preview.requirements.join(', ')}</div>
                )}
                {!!preview.risks.length && (
                  <div className="text-xs mb-2 text-amber-600"><strong>Risks:</strong> {preview.risks.join(', ')}</div>
                )}
                <Separator className="my-2" />
                <div className="text-xs">
                  <div className="font-medium mb-1">Commands:</div>
                  <ol className="list-decimal pl-5 space-y-1">
                    {preview.commands.map((c, i) => (
                      <li key={i}><code className="bg-muted px-1 py-0.5 rounded">{c}</code></li>
                    ))}
                  </ol>
                </div>
              </div>
            )}

            {approval && (
              <div className="rounded-md border p-3">
                <div className="text-sm font-medium mb-1">Approval</div>
                <div className="text-xs">Approval ID: <code>{approval.approvalId}</code></div>
                <div className="text-xs">ActionLog ID: <code>{approval.actionLogId ?? 'n/a'}</code></div>
                <div className="text-xs">Expires: {new Date(approval.expiresAt).toLocaleString()}</div>
              </div>
            )}

            {exec && (
              <div className="rounded-md border p-3">
                <div className="text-sm font-medium mb-1">Execution</div>
                <div className="text-xs">Job ID: <code>{exec.jobId}</code></div>
                <div className="text-xs">ActionLog ID: <code>{exec.actionLogId ?? 'n/a'}</code></div>
                {exec.helperToken && (
                  <div className="text-xs break-all">Helper Token: <code>{exec.helperToken}</code></div>
                )}
                {exec.reportUrl && (
                  <div className="text-xs">Report URL: <code>{exec.reportUrl}</code></div>
                )}
                {!!exec.expiresIn && (
                  <div className="text-xs">Token TTL: {exec.expiresIn}s</div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
