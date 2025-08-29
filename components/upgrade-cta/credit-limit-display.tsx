'use client';

import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { useGetCredits } from '@/hooks/chat-sync-hooks';

interface CreditLimitDisplayProps {
  className?: string;
}

export function CreditLimitDisplay({ className }: CreditLimitDisplayProps) {
  const { credits, isLoadingCredits } = useGetCredits();
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const [dismissed, setDismissed] = useState(false);

  // Don't show for authenticated users
  if (isAuthenticated) return null;

  if (isLoadingCredits) return null;

  // Don't show if dismissed
  if (dismissed) return null;

  const remaining = credits ?? 0;

  // Only show when approaching or at limit
  const isAtLimit = remaining <= 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
        className={cn('w-full', className)}
      >
        <div
          className={cn(
            'flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm ',
            isAtLimit
              ? 'bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-200'
              : 'bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200',
          )}
        >
          <div className="flex-1">
            {isAtLimit ? (
              <span>
                You&apos;ve reached your credit limit.{' '}
                <Link
                  href="/login"
                  className="text-red-700 dark:text-red-300 underline font-medium hover:no-underline"
                >
                  Sign in to reset your limits
                </Link>
              </span>
            ) : (
              <span>
                You only have{' '}
                <strong>
                  {remaining} credit{remaining !== 1 ? 's' : ''}
                </strong>{' '}
                left.{' '}
                <Link
                  href="/login"
                  className="text-amber-700 dark:text-amber-300 underline font-medium hover:no-underline"
                >
                  Sign in to reset your limits
                </Link>
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-transparent"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
