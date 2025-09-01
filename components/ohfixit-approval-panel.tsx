'use client';

import React, { useEffect, useMemo, useState } from 'react';

type AllowlistAction = {
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

type ActionPreview = {
  description: string;
  commands: string[];
  risks: string[];
  reversible: boolean;
  estimatedTime: string;
  requirements: string[];
  previewDiff?: string;
};

export function OhFixItApprovalPanel({ chatId }: { chatId: string }) {
  const [actions, setActions] = useState<AllowlistAction[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [preview, setPreview] = useState<ActionPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approval, setApproval] = useState<{
    approvalId: string;
    helperToken: string;
    actionLogId: string | null;
    expiresAt: string;
    reportUrl: string;
  } | null>(null);
  const [status, setStatus] = useState<string>('');
  const [rollbackInfo, setRollbackInfo] = useState<{ method?: string; data?: any } | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/automation/allowlist')
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        setActions((data?.actions ?? []) as AllowlistAction[]);
        if (!selected && data?.actions?.length) setSelected(data.actions[0].id);
      })
      .catch((e) => setError(e?.message ?? 'Failed to load actions'));
    return () => {
      active = false;
    };
  }, [selected]);

  const selectedAction = useMemo(
    () => actions.find((a) => a.id === selected) || null,
    [actions, selected],
  );

  async function doPreview() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    setPreview(null);
    setStatus('');
    try {
      const res = await fetch('/api/automation/action', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ operation: 'preview', actionId: selected, chatId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Preview failed');
      setPreview(data.preview as ActionPreview);
    } catch (e: any) {
      setError(e?.message || 'Preview error');
    } finally {
      setLoading(false);
    }
  }

  async function doApprove() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    setStatus('');
    try {
      const res = await fetch('/api/automation/action', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ operation: 'approve', actionId: selected, chatId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Approve failed');
      setApproval({
        approvalId: data.approvalId,
        helperToken: data.helperToken,
        actionLogId: data.actionLogId,
        expiresAt: data.expiresAt,
        reportUrl: data.reportUrl,
      });
      setStatus('Approved. Helper token minted. You can execute now.');
    } catch (e: any) {
      setError(e?.message || 'Approve error');
    } finally {
      setLoading(false);
    }
  }

  async function doExecute() {
    if (!selected || !approval?.approvalId) return;
    setLoading(true);
    setError(null);
    setStatus('');
    try {
      const res = await fetch('/api/automation/action', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ operation: 'execute', actionId: selected, chatId, approvalId: approval.approvalId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Execute failed');
      setStatus(`Execution queued with jobId ${data.jobId}`);
    } catch (e: any) {
      setError(e?.message || 'Execute error');
    } finally {
      setLoading(false);
    }
  }

  async function doRollback() {
    setLoading(true);
    setError(null);
    setStatus('');
    try {
      const res = await fetch('/api/automation/action', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ operation: 'rollback', actionId: selected, chatId, approvalId: approval?.approvalId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Rollback failed');
      setStatus(`Rollback queued with jobId ${data.jobId}`);
      if (data.rollbackPoint) {
        setRollbackInfo({ method: data.rollbackPoint.method, data: data.rollbackPoint.data });
      }
    } catch (e: any) {
      setError(e?.message || 'Rollback error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-md border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Do It For Me</h3>
        <span className="text-xs text-neutral-500">OhFixIt Automation</span>
      </div>
      <div className="flex gap-2 items-center">
        <label htmlFor="ohfixit-action" className="text-sm">Action</label>
        <select
          id="ohfixit-action"
          className="border rounded px-2 py-1 text-sm"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {actions.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title}
            </option>
          ))}
        </select>
        <button
          onClick={doPreview}
          disabled={!selected || loading}
          className="text-sm border rounded px-2 py-1"
        >
          Preview
        </button>
        <button
          onClick={doApprove}
          disabled={!selected || loading}
          className="text-sm border rounded px-2 py-1"
        >
          Approve
        </button>
        <button
          onClick={doExecute}
          disabled={!selected || !approval?.approvalId || loading}
          className="text-sm border rounded px-2 py-1"
        >
          Execute
        </button>
        <button
          onClick={doRollback}
          disabled={!selected || loading}
          className="text-sm border rounded px-2 py-1"
        >
          Undo
        </button>
      </div>
      {selectedAction && (
        <div className="text-xs text-neutral-600">
          <div>{selectedAction.description}</div>
          <div className="mt-1">Risks: {selectedAction.risks.join(', ') || 'None'}</div>
        </div>
      )}
      {preview && (
        <div className="rounded bg-neutral-50 p-2 text-xs">
          <div className="font-medium mb-1">Preview</div>
          <div className="mb-1">Estimated: {preview.estimatedTime} • Reversible: {preview.reversible ? 'Yes' : 'No'}</div>
          <div className="mb-1">Commands:</div>
          <ul className="list-disc pl-5">
            {preview.commands.map((c, i) => (
              <li key={i}><code>{c}</code></li>
            ))}
          </ul>
          {preview.previewDiff && (
            <pre className="mt-2 overflow-auto whitespace-pre-wrap">{preview.previewDiff}</pre>
          )}
        </div>
      )}
      {!!status && <div className="text-xs text-green-600">{status}</div>}
      {!!error && <div className="text-xs text-red-600">{error}</div>}
      {rollbackInfo && (
        <div className="text-[10px] text-neutral-600 break-all">
          Rollback method: {rollbackInfo.method || 'n/a'}
        </div>
      )}
      {approval && (
        <div className="text-[10px] text-neutral-500 break-all">
          Token: {approval.helperToken.substring(0, 24)}... • Expires: {new Date(approval.expiresAt).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

export default OhFixItApprovalPanel;
