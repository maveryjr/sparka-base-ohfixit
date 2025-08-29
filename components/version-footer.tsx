'use client';
import { motion } from 'motion/react';
import { useWindowSize } from 'usehooks-ts';

import type { Document } from '@/lib/db/schema';

import { LoaderIcon } from './icons';
import { Button } from './ui/button';
import { useArtifact } from '@/hooks/use-artifact';
import { useSaveDocument } from '@/hooks/chat-sync-hooks';

interface VersionFooterProps {
  handleVersionChange: (type: 'next' | 'prev' | 'toggle' | 'latest') => void;
  documents: Array<Document> | undefined;
  currentVersionIndex: number;
}

export const VersionFooter = ({
  handleVersionChange,
  documents,
  currentVersionIndex,
}: VersionFooterProps) => {
  const { artifact } = useArtifact();

  const { width } = useWindowSize();
  const isMobile = width < 768;

  const saveDocumentMutation = useSaveDocument(
    artifact.documentId,
    artifact.messageId,
  );

  if (!documents) return;

  return (
    <motion.div
      className="absolute flex flex-col gap-4 lg:flex-row bottom-0 bg-background p-4 w-full border-t z-50 justify-between"
      initial={{ y: isMobile ? 200 : 77 }}
      animate={{ y: 0 }}
      exit={{ y: isMobile ? 200 : 77 }}
      transition={{ type: 'spring', stiffness: 140, damping: 20 }}
    >
      <div>
        <div>You are viewing a previous version</div>
        <div className="text-muted-foreground text-sm">
          Restore this version to make edits
        </div>
      </div>

      <div className="flex flex-row gap-4">
        <Button
          disabled={saveDocumentMutation.isPending}
          onClick={async () => {
            const versionToRestore = documents[currentVersionIndex];

            saveDocumentMutation.mutate({
              id: artifact.documentId,
              content: versionToRestore.content ?? '',
              title: versionToRestore.title,
              kind: versionToRestore.kind,
            });
          }}
        >
          <div>Restore this version</div>
          {saveDocumentMutation.isPending && (
            <div className="animate-spin">
              <LoaderIcon />
            </div>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            handleVersionChange('latest');
          }}
        >
          Back to latest version
        </Button>
      </div>
    </motion.div>
  );
};
