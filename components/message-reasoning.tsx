'use client';
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContentContainer,
} from '@/components/ai-elements/reasoning';
import { Response } from '@/components/ai-elements/response';
import { memo } from 'react';

interface MessageReasoningProps {
  isLoading: boolean;
  reasoning: string[];
}

function PureMessageReasoning({ isLoading, reasoning }: MessageReasoningProps) {
  return (
    <Reasoning isStreaming={isLoading} className="mb-0">
      <ReasoningTrigger data-testid="message-reasoning-toggle " />
      <ReasoningContentContainer
        data-testid="message-reasoning"
        className="text-muted-foreground flex flex-col gap-4 mt-0 data-[state=open]:mt-3"
      >
        <MultiReasoningContent reasoning={reasoning} />
      </ReasoningContentContainer>
    </Reasoning>
  );
}

const MultiReasoningContent = memo(function MultiReasoningContent({
  reasoning,
}: { reasoning: string[] }) {
  return (
    <div className="flex flex-col gap-4">
      {reasoning.map((r, i) => (
        <div className="pl-4 border-l" key={i}>
          <Response className="grid gap-2">{r}</Response>
        </div>
      ))}
    </div>
  );
});

export const MessageReasoning = memo(PureMessageReasoning);
