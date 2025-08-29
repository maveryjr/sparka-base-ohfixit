'use client';

import { memo } from 'react';
import { FileIcon } from './icons';

interface ReadDocumentProps {
  result?: {
    id: string;
    title: string;
    kind: string;
    content: string;
  };
}

function PureReadDocument({ result }: ReadDocumentProps) {
  if (!result) return null;

  return (
    <div className=" py-2 px-3 rounded-xl w-fit flex gap-3 items-center text-muted-foreground">
      <FileIcon />
      <div className="text-left flex gap-1 items-center text-sm">
        <div className="">Read</div>
        <div className="">&ldquo;{result.title}&rdquo;</div>
      </div>
    </div>
  );
}

export const ReadDocument = memo(PureReadDocument, () => true);
