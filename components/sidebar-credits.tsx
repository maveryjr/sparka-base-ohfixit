'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LogIn, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGetCredits } from '@/hooks/chat-sync-hooks';

export function SidebarCredits() {
  const { credits, isLoadingCredits } = useGetCredits();
  const { data: session } = useSession();
  const router = useRouter();
  const isAuthenticated = !!session?.user;

  if (isLoadingCredits) {
    return (
      <div className="px-4 py-3 rounded-lg bg-muted/50 text-muted-foreground text-sm">
        Loading credits...
      </div>
    );
  }

  const remaining = credits ?? 0;

  return (
    <div className="space-y-3">
      <div className="px-4 py-3 rounded-lg bg-muted/50 text-muted-foreground text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4" />
            <span>Credits remaining</span>
          </div>
          <span className="font-semibold">{remaining}</span>
        </div>
      </div>

      {!isAuthenticated && (
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => {
            router.push('/login');
            router.refresh();
          }}
        >
          <LogIn className="h-4 w-4" />
          Sign in to reset your limits
        </Button>
      )}
    </div>
  );
}
