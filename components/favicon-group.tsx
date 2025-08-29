import type React from 'react';
import { Favicon } from './favicon';
import { cn } from '@/lib/utils';

// Define a simpler interface for the sources needed by this component
interface FaviconSource {
  url: string;
  title?: string; // Title is optional, mainly for alt text
}

interface FaviconGroupProps {
  sources: FaviconSource[]; // Use the simpler interface
  maxVisible?: number;
  className?: string;
}

export const FaviconGroup: React.FC<FaviconGroupProps> = ({
  sources,
  maxVisible = 4,
  className,
}) => {
  const visibleSources = sources.slice(0, maxVisible);

  return (
    <div className={cn('flex items-center', className)}>
      {visibleSources.map((source, index) => (
        <Favicon
          key={source.url || index}
          url={`https://www.google.com/s2/favicons?domain=${new URL(source.url).hostname}&sz=32`}
          className={cn(
            'w-5 h-5 rounded-full border-2 border-white dark:border-neutral-800', // Slightly thicker border for contrast
            index > 0 ? '-ml-2' : '',
          )}
          style={{ zIndex: maxVisible - index }}
          alt={`Favicon for ${source.title || new URL(source.url).hostname}`}
        />
      ))}
    </div>
  );
};
