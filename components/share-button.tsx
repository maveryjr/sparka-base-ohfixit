'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useSession } from 'next-auth/react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useGetChatById, useSetVisibility } from '@/hooks/chat-sync-hooks';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Copy, GlobeIcon, Loader2, LockIcon, Share } from 'lucide-react';
import { LoginPrompt } from './upgrade-cta/login-prompt';

type ShareStep = 'info' | 'shared';

// Dialog content component that only renders when dialog is open
function ShareDialogContent({
  chatId,
  onClose,
}: {
  chatId: string;
  onClose: () => void;
}) {
  const [step, setStep] = useState<ShareStep>('info');
  const { data: chat } = useGetChatById(chatId);
  const setVisibilityMutation = useSetVisibility();

  const isPublic = chat?.visibility === 'public';
  const isPending = setVisibilityMutation.isPending;

  const handleShare = () => {
    setVisibilityMutation.mutate(
      {
        chatId,
        visibility: 'public',
      },
      {
        onSuccess: () => {
          setStep('shared');
        },
      },
    );
  };

  const handleUnshare = () => {
    setVisibilityMutation.mutate(
      {
        chatId,
        visibility: 'private',
      },
      {
        onSuccess: () => {
          onClose();
          setStep('info');
        },
      },
    );
  };

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/share/${chatId}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied to clipboard');
  };

  return (
    <>
      {step === 'info' && (
        <>
          <DialogHeader>
            <DialogTitle>Share chat</DialogTitle>
            <DialogDescription>
              {isPublic
                ? 'This chat is currently public. Anyone with the link can view it.'
                : 'Make this chat public so you can share it with others.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
              {isPublic ? (
                <>
                  <div className="text-green-600">
                    <GlobeIcon size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">Public</div>
                    <div className="text-xs text-muted-foreground">
                      Anyone with the link can access this chat
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-muted-foreground">
                    <LockIcon size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">Private</div>
                    <div className="text-xs text-muted-foreground">
                      Only you can access this chat
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2">
              {isPublic ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleUnshare}
                    className="flex-1"
                    disabled={isPending}
                  >
                    {isPending ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span className="ml-2">Making Private...</span>
                      </>
                    ) : (
                      <>
                        <LockIcon size={16} />
                        <span className="ml-2">Make Private</span>
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setStep('shared')}
                    className="flex-1"
                    disabled={isPending}
                  >
                    <GlobeIcon size={16} />
                    <span className="ml-2">Get Link</span>
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleShare}
                  className="w-full"
                  disabled={isPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span className="ml-2">Sharing...</span>
                    </>
                  ) : (
                    <>
                      <GlobeIcon size={16} />
                      <span className="ml-2">Share Chat</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </>
      )}

      {step === 'shared' && (
        <>
          <DialogHeader>
            <DialogTitle>Share chat</DialogTitle>
            <DialogDescription>
              Copy the link below to share this chat with others.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="grid flex-1 gap-2">
              <label htmlFor="link" className="sr-only">
                Link
              </label>
              <input
                id="link"
                defaultValue={`${window.location.origin}/share/${chatId}`}
                readOnly
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              className="px-3"
              onClick={handleCopyLink}
            >
              <Copy size={16} />
              <span className="sr-only">Copy</span>
            </Button>
          </div>
          <div className="flex justify-between items-center pt-2">
            <Button variant="ghost" size="sm" onClick={() => setStep('info')}>
              ← Back
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnshare}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span className="ml-2">Making Private...</span>
                </>
              ) : (
                <>
                  <LockIcon size={16} />
                  <span className="ml-2">Make Private</span>
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </>
  );
}

// Extracted dialog component that can be controlled externally
export function ShareDialog({
  chatId,
  open,
  onOpenChange,
  children,
}: {
  chatId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: React.ReactNode;
}) {
  const handleDialogOpenChange = (open: boolean) => {
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      {children}
      <DialogContent className="sm:max-w-md">
        {open && (
          <ShareDialogContent
            chatId={chatId}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ShareButton({
  chatId,
  className,
}: {
  chatId: string;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  const triggerButton = (
    <Button variant="outline" size="sm" className={cn('', className)}>
      <Share size={16} />
      <span className="sr-only">Share chat</span>
      <p className="hidden md:block">Share</p>
    </Button>
  );

  if (!isAuthenticated) {
    return (
      <Popover>
        <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <LoginPrompt
            title="Sign in to share your chat"
            description="Control who can see your conversations and share them with others."
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <ShareDialog chatId={chatId} open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
    </ShareDialog>
  );
}
