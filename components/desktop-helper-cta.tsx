'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ExternalLink, Monitor, Download, RefreshCw, Play } from 'lucide-react';
import Link from 'next/link';

type HelperStatus = {
  connected: boolean;
  version?: string;
  capabilities?: string[];
  error?: string;
  lastCheck?: string;
};

function useDesktopHelperStatus() {
  const [status, setStatus] = useState<HelperStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const resp = await fetch('http://127.0.0.1:8765/status', { signal: controller.signal, mode: 'cors' });
      clearTimeout(timeoutId);
      if (!resp.ok) throw new Error('Helper not responding');
      const raw = await resp.json();
      setStatus({ connected: true, version: raw.version, capabilities: raw.capabilities, lastCheck: new Date().toISOString() });
    } catch (e) {
      setStatus({ connected: false, error: 'Failed to check status' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, loading, refresh };
}

function getPlatform(): 'mac' | 'windows' | 'linux' | 'unknown' {
  if (typeof navigator === 'undefined') return 'unknown';
  const p = navigator.platform.toLowerCase();
  const ua = navigator.userAgent.toLowerCase();
  if (p.includes('mac') || ua.includes('mac os')) return 'mac';
  if (p.includes('win')) return 'windows';
  if (p.includes('linux')) return 'linux';
  return 'unknown';
}

export function DesktopHelperCta({ className }: { className?: string }) {
  const { status, loading, refresh } = useDesktopHelperStatus();
  const platform = useMemo(() => getPlatform(), []);

  const latestReleaseUrl = 'https://github.com/maveryjr/sparka-base-ohfixit/releases/latest';
  const downloadBase = process.env.NEXT_PUBLIC_HELPER_DOWNLOAD_BASE || latestReleaseUrl;

  const fileForPlatform = (p: 'mac' | 'windows' | 'linux' | 'unknown') => {
    // Adjust names to match your CI/release artifacts.
    switch (p) {
      case 'mac':
        return 'ohfixit-desktop-helper-macos.dmg';
      case 'windows':
        return 'ohfixit-desktop-helper-windows.msi';
      case 'linux':
        return 'ohfixit-desktop-helper-linux.AppImage';
      default:
        return '';
    }
  };

  const hrefForPlatform = (p: 'mac' | 'windows' | 'linux' | 'unknown') => {
    if (!downloadBase || downloadBase === latestReleaseUrl) return latestReleaseUrl;
    const file = fileForPlatform(p);
    if (!file) return latestReleaseUrl;
    // Allow hosting in the repo under /public/downloads
    return `${downloadBase.replace(/\/$/, '')}/${file}`;
  };

  const primaryCta = useMemo(() => {
    if (platform === 'mac') {
      return { label: 'Download for macOS (DMG)', href: hrefForPlatform('mac') };
    }
    if (platform === 'windows') {
      return { label: 'Download for Windows (MSI)', href: hrefForPlatform('windows') } as const;
    }
    if (platform === 'linux') {
      return { label: 'Download for Linux (AppImage)', href: hrefForPlatform('linux') } as const;
    }
    return { label: 'View Downloads', href: latestReleaseUrl };
  }, [platform]);

  const isConnected = !!status?.connected;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={isConnected ? 'ghost' : 'default'} size="sm" className={className}>
          <Monitor className="h-4 w-4 mr-2" />
          {isConnected ? 'Desktop Helper' : 'Get Desktop Helper'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-sm">
          {isConnected ? 'Desktop Helper Connected' : 'Install Desktop Helper'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild disabled={(primaryCta as any).disabled}>
          <a href={primaryCta.href} target="_blank" rel="noreferrer">
            <Download className="h-4 w-4 mr-2" /> {primaryCta.label}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            try {
              window.location.href = 'ohfixit://open?from=web';
            } catch (e) {
              // noop
            }
          }}
        >
          <Play className="h-4 w-4 mr-2" /> Open Desktop Helper
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/desktop">
            <ExternalLink className="h-4 w-4 mr-2" /> Setup & Instructions
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => refresh()}>
          <RefreshCw className={"h-4 w-4 mr-2 " + (loading ? 'animate-spin' : '')} />
          {loading ? 'Checking…' : 'Retry Connection'}
        </DropdownMenuItem>
        {status?.version && (
          <div className="px-2 pb-2 pt-1 text-xs text-muted-foreground">Version: v{status.version}</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
