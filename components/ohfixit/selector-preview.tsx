'use client';

import { useCallback, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export function SelectorPreview({ selector, label, className }: { selector: string; label?: string; className?: string }) {
  const [active, setActive] = useState(false);
  const timerRef = useRef<number | null>(null);

  const clear = useCallback(() => {
    document.querySelectorAll('[data-ohfixit-highlight]').forEach((el) => {
      el.removeAttribute('data-ohfixit-highlight');
      (el as HTMLElement).style.outline = '';
      (el as HTMLElement).style.outlineOffset = '';
    });
  }, []);

  const highlight = useCallback(() => {
    try {
      clear();
      const nodeList = document.querySelectorAll(selector);
      nodeList.forEach((el) => {
        (el as HTMLElement).setAttribute('data-ohfixit-highlight', '');
        (el as HTMLElement).style.outline = '2px solid #3b82f6';
        (el as HTMLElement).style.outlineOffset = '2px';
        (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      setActive(true);
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        clear();
        setActive(false);
        timerRef.current = null;
      }, 4000) as unknown as number;
    } catch {}
  }, [selector, clear]);

  return (
    <div className={cn('rounded border p-2 text-xs bg-muted/40', className)}>
      <div className="flex items-center gap-2">
        <span className="font-medium">{label || 'Preview'}</span>
        <code className="bg-background border px-1 py-0.5 rounded">{selector}</code>
        <button className="ml-auto px-2 py-0.5 rounded border hover:bg-accent" onClick={highlight}>
          {active ? 'Highlighted' : 'Highlight on page'}
        </button>
      </div>
    </div>
  );
}

export default SelectorPreview;

