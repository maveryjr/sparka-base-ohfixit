import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Monitor, Download, Link as LinkIcon, Shield, ListChecks } from 'lucide-react';
import { DesktopHelperActions } from '@/components/desktop-helper-actions';
import Link from 'next/link';

export const metadata = {
  title: 'Desktop Helper – Oh Fix It',
  description: 'Download and connect the OhFixIt Desktop Helper for native OS automation.',
};

function platformLabel() {
  if (typeof navigator === 'undefined') return 'your OS';
  const p = navigator.platform.toLowerCase();
  const ua = navigator.userAgent.toLowerCase();
  if (p.includes('mac') || ua.includes('mac os')) return 'macOS';
  if (p.includes('win')) return 'Windows';
  if (p.includes('linux')) return 'Linux';
  return 'your OS';
}

const latestReleaseUrl = 'https://github.com/maveryjr/sparka-base-ohfixit/releases/latest';
const downloadBase = process.env.NEXT_PUBLIC_HELPER_DOWNLOAD_BASE || latestReleaseUrl;

function platformFile() {
  const p = platformLabel();
  switch (p) {
    case 'macOS':
      return 'ohfixit-desktop-helper-macos.dmg';
    case 'Windows':
      return 'ohfixit-desktop-helper-windows.msi';
    case 'Linux':
      return 'ohfixit-desktop-helper-linux.AppImage';
    default:
      return '';
  }
}

function downloadHref() {
  const file = platformFile();
  if (!file || downloadBase === latestReleaseUrl) return latestReleaseUrl;
  return `${downloadBase.replace(/\/$/, '')}/${file}`;
}

export default function DesktopHelperPage() {
  const label = platformLabel();
  return (
    <div className="mx-auto max-w-3xl p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" /> Desktop Helper
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Install the OhFixIt Desktop Helper to enable native OS-level actions with consent, including network resets, printer fixes, and more.
          </p>
          <div className="flex flex-wrap gap-2">
            <a href={downloadHref()} target="_blank" rel="noreferrer">
              <Button>
                <Download className="h-4 w-4 mr-2" /> Download for {label}
              </Button>
            </a>
            <Link href="/">
              <Button variant="outline">
                <LinkIcon className="h-4 w-4 mr-2" /> Back to Chat
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <div className="font-medium flex items-center gap-2"><ListChecks className="h-4 w-4" /> Quick Setup</div>
              <ol className="list-decimal pl-5 text-sm space-y-1 text-muted-foreground">
                <li>Download the installer for your platform</li>
                <li>Run the app and keep it open</li>
                <li>Return to chat and click “Retry Connection”</li>
              </ol>
            </div>
            <div className="space-y-2">
              <div className="font-medium flex items-center gap-2"><Shield className="h-4 w-4" /> Privacy & Safety</div>
              <ul className="list-disc pl-5 text-sm space-y-1 text-muted-foreground">
                <li>Actions are always previewed and require explicit approval</li>
                <li>Audit logs and rollback points are recorded when applicable</li>
              </ul>
            </div>
          </div>

          <div className="pt-3">
            <DesktopHelperActions />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
