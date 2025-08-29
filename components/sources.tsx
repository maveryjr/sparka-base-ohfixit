import { FileText, ArrowRight } from 'lucide-react';
import React from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { useMediaQuery } from '@/hooks/use-media-query';
import { FaviconGroup } from './favicon-group';

import type { SearchResultItem } from '@/lib/ai/tools/research-updates-schema';
import { Favicon } from './favicon';
import { getFaviconUrl } from '@/lib/url-utils';

const SourcesList = ({
  sources,
}: {
  sources: SearchResultItem[] | undefined;
}) => {
  return (
    <div className="space-y-3">
      {sources?.map((source: SearchResultItem, i: number) => (
        <a
          key={i}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-1">
              <Favicon url={getFaviconUrl(source)} />
            </div>
            <div className="flex flex-col gap-1">
              <h4 className="text-sm font-medium leading-tight">
                {source.title}
              </h4>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
};

const AllSourcesView = ({
  sources,
  id,
}: {
  sources: SearchResultItem[] | undefined;
  id?: string;
}) => {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const title = 'All Sources';

  if (isDesktop) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <button id={id} className="hidden" type="button">
            Show All
          </button>
        </DialogTrigger>
        <DialogContent
          className={cn('max-h-[80vh] overflow-y-auto', 'max-w-4xl')}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {title}
            </DialogTitle>
          </DialogHeader>
          <SourcesList sources={sources} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button id={id} className="hidden" type="button">
          Show All
        </button>
      </DrawerTrigger>
      <DrawerContent className="h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {title}
          </DrawerTitle>
        </DrawerHeader>
        <div className="p-4 overflow-y-auto">
          <SourcesList sources={sources} />
        </div>
      </DrawerContent>
    </Drawer>
  );
};

function ShowSourcesButton({
  sources,
  dialogId,
}: {
  sources: SearchResultItem[];
  dialogId: string;
}) {
  return (
    <button
      type="button"
      onClick={() => document.getElementById(dialogId)?.click()}
      className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group"
    >
      <FaviconGroup
        sources={sources.map((s) => ({
          url: s.url,
          title: s.title,
        }))}
        maxVisible={3}
        className="mr-1.5"
      />
      <span className="text-xs text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-300">
        {sources.length} Sources
      </span>
      <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-500 transition-colors" />
    </button>
  );
}

export const Sources = ({
  sources,
}: {
  sources: SearchResultItem[];
}) => {
  if (sources.length === 0) {
    return null;
  }

  const sourcesDialogId = 'show-all-sources-dialog';

  return (
    <div className="space-y-3">
      <ShowSourcesButton sources={sources} dialogId={sourcesDialogId} />
      <div className="hidden">
        <AllSourcesView sources={sources} id={sourcesDialogId} />
      </div>
    </div>
  );
};
