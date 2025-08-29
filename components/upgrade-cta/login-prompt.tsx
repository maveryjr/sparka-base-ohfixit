'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoginPromptProps {
  title: string;
  description: string;
  className?: string;
}

export function LoginPrompt({
  title,
  description,
  className,
}: LoginPromptProps) {
  return (
    <div className={cn('p-4 space-y-3', className)}>
      <div className="flex items-center gap-2">
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <h4 className="font-medium text-sm">{title}</h4>
      </div>
      <p className="text-sm text-muted-foreground ml-6">{description}</p>
      <Link
        href="/login"
        className="text-sm font-medium text-blue-500 hover:underline ml-6 block"
      >
        Sign in
      </Link>
    </div>
  );
}
