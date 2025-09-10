'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Monitor, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DesktopHelperStatusProps {
  className?: string;
}

interface StatusResponse {
  connected: boolean;
  version?: string;
  capabilities?: string[];
  error?: string;
  lastCheck: string;
  endpoint?: string;
}

export function DesktopHelperStatus({ className }: DesktopHelperStatusProps) {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const resp = await fetch('http://127.0.0.1:8765/status', { signal: controller.signal, mode: 'cors' });
      clearTimeout(timeoutId);
      if (!resp.ok) throw new Error('Helper not responding');
      const raw = await resp.json();
      const data: StatusResponse = {
        connected: true,
        version: raw.version || 'unknown',
        capabilities: raw.capabilities || [],
        lastCheck: new Date().toISOString(),
        endpoint: 'http://127.0.0.1:8765'
      };
      setStatus(data);
      setLastCheckTime(new Date());
    } catch (error) {
      console.error('Failed to check desktop helper status:', error);
      setStatus({
        connected: false,
        error: 'Failed to check status',
        lastCheck: new Date().toISOString(),
      });
      setLastCheckTime(new Date());
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check status on mount and set up periodic checking
  useEffect(() => {
    checkStatus();
    
    // Check every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    
    return () => clearInterval(interval);
  }, [checkStatus]);

  const getStatusColor = () => {
    if (isLoading) return 'text-muted-foreground';
    return status?.connected ? 'text-green-500' : 'text-red-500';
  };

  const getStatusText = () => {
    if (isLoading) return 'Checking...';
    if (!status) return 'Unknown';
    
    if (status.connected) {
      return `Connected${status.version ? ` (v${status.version})` : ''}`;
    } else {
      return status.error || 'Not connected';
    }
  };

  const getTooltipContent = () => {
    if (isLoading) {
      return (
        <div className="text-center">
          <div className="font-medium">Desktop Helper</div>
          <div className="text-xs text-muted-foreground mt-1">
            Checking connection status...
          </div>
        </div>
      );
    }

    if (!status) {
      return (
        <div className="text-center">
          <div className="font-medium">Desktop Helper</div>
          <div className="text-xs text-muted-foreground mt-1">
            Status unknown
          </div>
        </div>
      );
    }

    return (
      <div className="text-center max-w-xs">
        <div className="font-medium">Desktop Helper</div>
        <div className="text-xs text-muted-foreground mt-1">
          Status: {status.connected ? 'Connected' : 'Disconnected'}
        </div>
        {status.version && (
          <div className="text-xs text-muted-foreground">
            Version: {status.version}
          </div>
        )}
        {status.endpoint && (
          <div className="text-xs text-muted-foreground">
            Endpoint: {status.endpoint}
          </div>
        )}
        {status.capabilities && status.capabilities.length > 0 && (
          <div className="text-xs text-muted-foreground mt-1">
            Capabilities: {status.capabilities.join(', ')}
          </div>
        )}
        {status.error && (
          <div className="text-xs text-red-400 mt-1">
            Error: {status.error}
          </div>
        )}
        {lastCheckTime && (
          <div className="text-xs text-muted-foreground mt-1">
            Last checked: {lastCheckTime.toLocaleTimeString()}
          </div>
        )}
        <div className="text-xs text-muted-foreground mt-2 border-t pt-1">
          Click to refresh status
        </div>
      </div>
    );
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn('h-8 px-2 gap-1.5', className)}
          onClick={checkStatus}
          disabled={isLoading}
        >
          <Monitor className="h-4 w-4" />
          <div className={cn('w-2 h-2 rounded-full transition-colors', {
            'bg-current animate-pulse': isLoading,
            'bg-green-500': !isLoading && status?.connected,
            'bg-red-500': !isLoading && !status?.connected,
          })} />
          <span className="hidden sm:inline text-xs">
            {isLoading ? 'Checking...' : status?.connected ? 'Connected' : 'Disconnected'}
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {getTooltipContent()}
      </TooltipContent>
    </Tooltip>
  );
}
