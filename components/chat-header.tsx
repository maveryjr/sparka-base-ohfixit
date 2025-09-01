'use client';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { Button } from '@/components/ui/button';
import { GitIcon } from './icons';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { ShareButton } from './share-button';
import { Share, LogIn } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { SidebarUserNav } from './sidebar-user-nav';
import type { User } from 'next-auth';
import { CollectClientDiagnostics } from '@/components/ohfixit/collect-client-diagnostics';
import { useChatInput } from '@/providers/chat-input-provider';
import type { UiToolName } from '@/lib/ai/types';
import { cn } from '@/lib/utils';

function PureChatHeader({
  chatId,
  isReadonly,
  hasMessages,
  user,
}: {
  chatId: string;
  isReadonly: boolean;
  hasMessages: boolean;
  user: User | undefined;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const [diagOpen, setDiagOpen] = useState(false);
  const { selectedTool, setSelectedTool } = useChatInput();

  // Persist and read per-chat "Guide Me" mode
  const storageKey = useMemo(() => `chat:${chatId}:guideMode`, [chatId]);

  const isGuideMode = selectedTool === 'guideSteps';

  const setGuideMode = useCallback(
    (on: boolean) => {
      try {
        if (on) {
          localStorage.setItem(storageKey, 'on');
          setSelectedTool('guideSteps' as UiToolName);
        } else {
          localStorage.setItem(storageKey, 'off');
          setSelectedTool(null);
        }
      } catch {
        // ignore storage errors
        setSelectedTool(on ? ('guideSteps' as UiToolName) : null);
      }
    },
    [setSelectedTool, storageKey],
  );

  // If storage says guide mode is on and tool currently null (e.g., after refresh), enable it.
  useEffect(() => {
    try {
      const val = localStorage.getItem(storageKey);
      if (val === 'on' && selectedTool !== 'guideSteps') {
        setSelectedTool('guideSteps' as UiToolName);
      }
    } catch {
      // ignore
    }
    // Only run on mount for this chatId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  return (
    <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2">
      <SidebarToggle />

      {!isReadonly && hasMessages && <ShareButton chatId={chatId} />}
      {isReadonly && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 text-muted-foreground text-sm">
              <Share size={14} className="opacity-70" />
              <span>Shared</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-center">
              <div className="font-medium">Shared Chat</div>
              <div className="text-xs text-muted-foreground mt-1">
                This is a shared chat
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      )}

      <div className="ml-auto flex items-center gap-2">
        {/* OhFixIt: Guide Me mode toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isGuideMode ? 'default' : 'ghost'}
              size="sm"
              className={cn('h-8 px-3', isGuideMode && 'bg-primary text-primary-foreground')}
              data-testid="guide-mode-toggle"
              aria-pressed={isGuideMode}
              onClick={() => setGuideMode(!isGuideMode)}
            >
              Guide Me
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Enable a step-by-step guided fix flow for this chat
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-3" onClick={() => setDiagOpen(true)}>
              Diagnostics
            </Button>
          </TooltipTrigger>
          <TooltipContent>Share device diagnostics (optional)</TooltipContent>
        </Tooltip>
        <Button variant="ghost" size="sm" className="p-2 h-8 w-8" asChild>
          <a
            href="https://github.com/franciscomoretti/sparka"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center"
          >
            <GitIcon />
          </a>
        </Button>

        {isAuthenticated && user ? (
          <SidebarUserNav user={user} />
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3"
                onClick={() => {
                  router.push('/login');
                  router.refresh();
                }}
              >
                <LogIn className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Sign in</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sign in to your account</TooltipContent>
          </Tooltip>
        )}
      </div>
      <CollectClientDiagnostics open={diagOpen} onOpenChange={setDiagOpen} />
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return prevProps.hasMessages === nextProps.hasMessages;
});
