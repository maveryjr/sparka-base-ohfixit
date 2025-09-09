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

interface MessageReasoningProps {
  isLoading: boolean;
  reasoning: string[];
}

function PureMessageReasoning({ isLoading, reasoning }: MessageReasoningProps) {
  const [open, setOpen] = useState(false);

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
        <MultiReasoningSteps isLoading={isLoading} reasoning={reasoning} />
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
