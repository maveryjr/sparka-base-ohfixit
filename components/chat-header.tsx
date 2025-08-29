'use client';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { Button } from '@/components/ui/button';
import { GitIcon } from './icons';
import { memo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { ShareButton } from './share-button';
import { Share, LogIn } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { SidebarUserNav } from './sidebar-user-nav';
import type { User } from 'next-auth';

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
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return prevProps.hasMessages === nextProps.hasMessages;
});
