'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function collectSnapshot() {
  try {
    const nav = navigator as any;
    const connection = nav?.connection || nav?.mozConnection || nav?.webkitConnection;
    const ua = navigator.userAgent;
    const platform = navigator.platform;
    const languages = navigator.languages;
    const language = navigator.language;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const screenInfo = typeof screen !== 'undefined' ? { width: screen.width, height: screen.height, dpr: window.devicePixelRatio } : undefined;
    const device = { memoryGB: (typeof nav?.deviceMemory === 'number' ? nav.deviceMemory : undefined), cores: (typeof nav?.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : undefined) };
    const network = connection ? {
      downlink: connection.downlink,
      effectiveType: connection.effectiveType,
      rtt: connection.rtt,
      saveData: connection.saveData,
    } : undefined;

    return {
      consent: true,
      data: {
        userAgent: ua,
        platform,
        languages,
        language,
        timeZone,
        screen: screenInfo,
        device,
        network,
        window: typeof window !== 'undefined' ? { innerWidth: window.innerWidth, innerHeight: window.innerHeight } : undefined,
      },
    };
  } catch (e) {
    return { consent: true, data: {} };
  }
}

export function CollectClientDiagnostics({ open, onOpenChange }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<any | null>(null);

  useEffect(() => {
    if (open) setPreview(collectSnapshot());
  }, [open]);

  const handleAccept = useCallback(async () => {
    setSubmitting(true);
    try {
      const payload = collectSnapshot();
      const res = await fetch('/api/diagnostics/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }));
        throw new Error(err.error || 'Failed to submit diagnostics');
      }
      toast.success('Diagnostics collected for this session');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to collect diagnostics');
    } finally {
      setSubmitting(false);
    }
  }, [onOpenChange]);

  const redactUA = useMemo(() => {
    const ua = preview?.data?.userAgent as string | undefined;
    if (!ua) return 'n/a';
    // Basic redaction: remove parentheses blocks which may contain build info
    return ua.replace(/\([^\)]*\)/g, '(...)');
  }, [preview]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Share device diagnostics (optional)</DialogTitle>
          <DialogDescription>
            With your consent, we collect a brief snapshot of your browser and network to help OhFixIt diagnose issues. No cookies or browsing history are collected.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="rounded border p-3 bg-muted/30">
            <div className="font-medium mb-1">Preview</div>
            <ul className="space-y-1">
              <li>Platform: {preview?.data?.platform ?? 'Unknown'}</li>
              <li>User Agent: <span className="break-words">{redactUA}</span></li>
              <li>Language: {preview?.data?.language ?? 'Unknown'}</li>
              <li>Timezone: {preview?.data?.timeZone ?? 'Unknown'}</li>
              <li>Screen: {preview?.data?.screen ? `${preview.data.screen.width}x${preview.data.screen.height} @${preview.data.screen.dpr}x` : 'Unknown'}</li>
              {preview?.data?.network && (
                <li>Network: {preview.data.network.effectiveType} · {preview.data.network.downlink} Mbps · rtt {preview.data.network.rtt}ms</li>
              )}
            </ul>
          </div>
          <div className="text-xs text-muted-foreground">
            You can revoke this at any time by reloading and declining. Data is stored temporarily for this session only.
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>Not now</Button>
            <Button onClick={handleAccept} disabled={submitting}>
              {submitting ? 'Submitting…' : 'I consent and share'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CollectClientDiagnostics;
