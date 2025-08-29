import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LinkMarkdownProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function LinkMarkdown({
  href,
  children,
  className,
  ...props
}: LinkMarkdownProps) {
  const isExternal = href.startsWith('http') || href.startsWith('https');

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn('text-blue-500 hover:underline', className)}
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className={cn('text-blue-500 hover:underline', className)}
      {...props}
    >
      {children}
    </Link>
  );
}
