'use client';
import { useEffect, useState, memo } from 'react';
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from '@/components/ai-elements/chain-of-thought';
import { TextShimmerLoader } from '@/components/prompt-kit/loader';
import { BrainIcon } from 'lucide-react';

import {
  useMessagePartsById,
  useMessageResearchUpdatePartsById,
} from '@/lib/stores/chat-store';
import type { ResearchUpdate } from '@/lib/ai/tools/research-updates-schema';
import { WebSourceBadge } from '@/components/source-badge';
import {
  ChainOfThoughtSearchResults,
  ChainOfThoughtSearchResult,
  ChainOfThoughtImage,
} from '@/components/ai-elements/chain-of-thought';

interface MessageReasoningProps {
  messageId: string;
  isLoading: boolean;
  reasoning: string[];
}

function PureMessageReasoning({ messageId, isLoading, reasoning }: MessageReasoningProps) {
  const [open, setOpen] = useState(false);
  const parts = useMessagePartsById(messageId);
  const researchUpdateParts = useMessageResearchUpdatePartsById(messageId);
  const researchUpdates: ResearchUpdate[] = researchUpdateParts.map((p) => p.data as ResearchUpdate);
  const imageResults = parts
    .filter((p: any) => p.type === 'tool-generateImage' && p.state === 'output-available' && p.output?.imageUrl)
    .map((p: any) => ({ url: p.output.imageUrl as string, prompt: p.output.prompt as string }));

  useEffect(() => {
    if (isLoading) {
      setOpen(true);
    } else if (open) {
      const t = setTimeout(() => setOpen(false), 1000);
      return () => clearTimeout(t);
    }
  }, [isLoading, open]);

  return (
    <ChainOfThought open={open} onOpenChange={setOpen} className="mb-0">
      <ChainOfThoughtHeader data-testid="message-reasoning-toggle ">
        {isLoading ? (
          <>
            <BrainIcon className="size-4" />
            <TextShimmerLoader text="Thinking..." className="text-base" />
          </>
        ) : (
          <>
            <BrainIcon className="size-4" />
            <p className="text-base font-medium">Chain of Thought</p>
          </>
        )}
      </ChainOfThoughtHeader>
      <ChainOfThoughtContent
        data-testid="message-reasoning"
        className="text-muted-foreground flex flex-col gap-2 mt-0 data-[state=open]:mt-3"
      >
        {researchUpdates.length > 0 && (
          <ResearchUpdatesAsSteps updates={researchUpdates} isLoading={isLoading} />
        )}

        <MultiReasoningSteps isLoading={isLoading} reasoning={reasoning} />

        {imageResults.length > 0 && (
          <ImagesAsSteps images={imageResults} />
        )}
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
}

const MultiReasoningSteps = memo(function MultiReasoningSteps({
  reasoning,
  isLoading,
}: { reasoning: string[]; isLoading: boolean }) {
  const lastIdx = reasoning.length - 1;
  return (
    <div className="flex flex-col gap-1">
      {reasoning.map((text, i) => (
        <ChainOfThoughtStep
          key={i}
          label={text}
          status={i === lastIdx && isLoading ? 'active' : 'complete'}
        />
      ))}
    </div>
  );
});

export const MessageReasoning = memo(PureMessageReasoning);

const ResearchUpdatesAsSteps = memo(function ResearchUpdatesAsSteps({
  updates,
  isLoading,
}: {
  updates: ResearchUpdate[];
  isLoading: boolean;
}) {
  const lastIdx = updates.length - 1;
  return (
    <div className="flex flex-col gap-1">
      {updates.map((u, i) => {
        if (u.type === 'web') {
          return (
            <ChainOfThoughtStep
              key={`web-${i}`}
              label={u.title || 'Searching the web'}
              description={u.queries && u.queries.length ? `Queries: ${u.queries.join(', ')}` : undefined}
              status={i === lastIdx && isLoading ? 'active' : 'complete'}
            >
              {u.results && u.results.length > 0 && (
                <div className="mt-2">
                  <ChainOfThoughtSearchResults>
                    {u.results.slice(0, 8).map((r, idx) => (
                      <WebSourceBadge key={idx} result={r} />
                    ))}
                  </ChainOfThoughtSearchResults>
                </div>
              )}
            </ChainOfThoughtStep>
          );
        }

        const label =
          u.type === 'thoughts'
            ? u.message
            : u.type === 'writing'
              ? u.message || u.title
              : u.title;

        return (
          <ChainOfThoughtStep
            key={`${u.type}-${i}`}
            label={label}
            status={i === lastIdx && isLoading ? 'active' : 'complete'}
          />
        );
      })}
    </div>
  );
});

const ImagesAsSteps = memo(function ImagesAsSteps({
  images,
}: {
  images: Array<{ url: string; prompt?: string }>
}) {
  return (
    <div className="flex flex-col gap-2">
      {images.map((img, i) => (
        <ChainOfThoughtStep key={`img-${i}`} label={img.prompt || 'Generated image'}>
          <div className="mt-2">
            <ChainOfThoughtImage src={img.url} alt={img.prompt} caption={img.prompt} />
          </div>
        </ChainOfThoughtStep>
      ))}
    </div>
  );
});
