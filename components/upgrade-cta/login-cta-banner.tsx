'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { X, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LoginCtaBannerProps {
  message: string;
  className?: string;
  variant?: 'default' | 'amber' | 'red';
  dismissible?: boolean;
  compact?: boolean;
}

export function LoginCtaBanner({
  message,
  className,
  variant = 'default',
  dismissible = false,
  compact = false,
}: LoginCtaBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const variantStyles = {
    default:
      'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800',
    amber:
      'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800',
    red: 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800',
  };

  const textStyles = {
    default: 'text-blue-800 dark:text-blue-200',
    amber: 'text-amber-800 dark:text-amber-200',
    red: 'text-red-800 dark:text-red-200',
  };

  const linkStyles = {
    default:
      'text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100',
    amber:
      'text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100',
    red: 'text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100',
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full"
      >
        <div
          className={cn(
            'flex items-center justify-between gap-3 rounded-lg',
            compact ? 'px-3 py-2' : 'px-4 py-3',
            variantStyles[variant],
            className,
          )}
        >
          <div className="flex items-center gap-2 flex-1">
            {!compact && (
              <LogIn
                className={cn('h-4 w-4 shrink-0', textStyles[variant])}
              />
            )}
            <span className={cn('text-sm', textStyles[variant])}>
              {message}{' '}
              <Link
                href="/login"
                className={cn(
                  'underline font-medium hover:no-underline',
                  linkStyles[variant],
                )}
              >
                Sign in
              </Link>
            </span>
          </div>
          {dismissible && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-transparent opacity-70 hover:opacity-100"
              onClick={() => setDismissed(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
