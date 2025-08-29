'use client';

import { CopyIcon } from '@/components/icons';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface GeneratedImageProps {
  result?: {
    imageUrl: string;
    prompt: string;
  };
  args?: {
    prompt: string;
  };
  isLoading?: boolean;
}

export function GeneratedImage({
  result,
  args,
  isLoading,
}: GeneratedImageProps) {
  const handleCopyImage = async () => {
    if (!result?.imageUrl) return;

    try {
      const response = await fetch(result.imageUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      toast.success('Copied image to clipboard!');
    } catch (error) {
      toast.error('Failed to copy image to clipboard');
    }
  };

  if (isLoading || !result) {
    return (
      <div className="flex flex-col gap-4 w-full justify-center items-center border rounded-lg p-8">
        <div className="animate-pulse rounded-lg bg-muted-foreground/20 w-full h-64" />
        <div className="text-muted-foreground">
          Generating image: &quot;{args?.prompt}&quot;
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full border rounded-lg overflow-hidden">
      <div className="relative group">
        <img
          src={result.imageUrl}
          alt={result.prompt}
          className="w-full h-auto max-w-full"
        />
        <button
          type="button"
          onClick={handleCopyImage}
          className={cn(
            'absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-lg',
            'opacity-0 group-hover:opacity-100 transition-opacity',
            'text-white flex items-center gap-2',
          )}
        >
          <CopyIcon size={16} />
        </button>
      </div>
      <div className="p-4 pt-0">
        <p className="text-sm text-muted-foreground">
          Generated from: &quot;{result.prompt}&quot;
        </p>
      </div>
    </div>
  );
}
