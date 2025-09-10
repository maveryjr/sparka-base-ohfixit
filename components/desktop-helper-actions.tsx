'use client';

import { Button } from '@/components/ui/button';
import { Play, RefreshCw } from 'lucide-react';

export function DesktopHelperActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        onClick={() => {
          try { window.location.href = 'ohfixit://open?from=web'; } catch {}
        }}
      >
        <Play className="h-4 w-4 mr-2" /> Open Desktop Helper
      </Button>
      <Button
        variant="outline"
        onClick={() => {
          try {
            const controller = new AbortController();
            setTimeout(() => controller.abort(), 1500);
            fetch('http://127.0.0.1:8765/status', { signal: controller.signal, mode: 'cors', cache: 'no-store' });
          } catch {}
        }}
      >
        <RefreshCw className="h-4 w-4 mr-2" /> Retry Connection
      </Button>
    </div>
  );
}

