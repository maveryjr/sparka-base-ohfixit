import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { Favicon } from './favicon';

// ToolActionKind component
const ToolActionKind = React.forwardRef<
  HTMLDivElement,
  {
    icon: React.ReactNode;
    name: string;
    className?: string;
  }
>(({ icon, name, className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('shrink-0 flex gap-1', className)}
      {...props}
    >
      {icon}
      <span className="text-xs text-foreground/80">{name}</span>
    </div>
  );
});
ToolActionKind.displayName = 'ToolActionKind';

// ToolActionContent component
const ToolActionContent = React.forwardRef<
  HTMLDivElement,
  {
    title: string;
    faviconUrl?: string;
    className?: string;
  }
>(({ title, faviconUrl, className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('flex items-center gap-2', className)}
      {...props}
    >
      <h4 className="text-sm leading-tight text-muted-foreground/80 truncate max-w-[200px] sm:max-w-[300px]">
        {title}
      </h4>
      {faviconUrl && (
        <Favicon
          url={faviconUrl}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.nextElementSibling?.classList.remove('hidden');
          }}
        />
      )}
    </div>
  );
});
ToolActionContent.displayName = 'ToolActionContent';

// ToolActionContainer component
const ToolActionContainer = React.forwardRef<
  HTMLAnchorElement,
  {
    href: string;
    children: React.ReactNode;
    className?: string;
  }
>(({ href, children, className, ...props }, ref) => {
  return (
    <motion.a
      ref={ref}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className={cn(
        'flex w-fit justify-start px-2.5 py-1 flex-row items-center gap-3 bg-muted/50 border rounded-full hover:bg-accent/20 transition-colors',
        className,
      )}
      {...props}
    >
      {children}
    </motion.a>
  );
});
ToolActionContainer.displayName = 'ToolActionContainer';

// Export all components
export { ToolActionContainer, ToolActionKind, ToolActionContent };
