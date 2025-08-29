import type { Attachment } from '@/lib/ai/types';

import { LoaderIcon, CrossIcon } from './icons';
import { Button } from './ui/button';
import { FileText, Download, ExternalLink } from 'lucide-react';

export const PreviewAttachment = ({
  attachment,
  isUploading = false,
  onRemove,
  onImageClick,
}: {
  attachment: Attachment;
  isUploading?: boolean;
  onRemove?: () => void;
  onImageClick?: (imageUrl: string, imageName?: string) => void;
}) => {
  const { name, url, contentType } = attachment;

  const isPdf = contentType === 'application/pdf';

  return (
    <div
      data-testid="input-attachment-preview"
      className="flex flex-col gap-2 relative group"
    >
      {onRemove && !isUploading && (
        <Button
          onClick={onRemove}
          variant="ghost"
          size="sm"
          className="absolute -top-2 -right-2 size-5 p-0 rounded-full bg-muted/90 hover:bg-muted text-muted-foreground shadow-xs border border-border z-10"
        >
          <CrossIcon size={10} />
        </Button>
      )}
      <div className="w-20 h-16 aspect-video bg-muted rounded-md relative flex flex-col items-center justify-center">
        {contentType ? (
          contentType.startsWith('image') ? (
            // NOTE: it is recommended to use next/image for images
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt={name ?? 'An image attachment'}
              className="rounded-md size-full object-cover cursor-pointer"
              onClick={() => onImageClick?.(url, name)}
            />
          ) : isPdf ? (
            <div className="flex flex-col items-center justify-center h-full">
              <FileText className="size-8 text-red-500" />
              {/* Show action buttons for PDFs in message view (when not uploading and no remove button) */}
              {!isUploading && !onRemove && url && (
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20 p-1 h-auto"
                      onClick={() => window.open(url, '_blank')}
                      title="Open PDF"
                    >
                      <ExternalLink className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20 p-1 h-auto"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = name || 'document.pdf';
                        link.click();
                      }}
                      title="Download PDF"
                    >
                      <Download className="size-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="" />
          )
        ) : (
          <div className="" />
        )}

        {isUploading && (
          <div
            data-testid="input-attachment-loader"
            className="animate-spin absolute text-zinc-500"
          >
            <LoaderIcon />
          </div>
        )}
      </div>
      <div className="text-xs text-muted-foreground max-w-16 truncate">
        {name}
      </div>
    </div>
  );
};
