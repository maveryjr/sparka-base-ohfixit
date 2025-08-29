import { PreviewMessage } from './message';
import { memo } from 'react';
import type { Vote } from '@/lib/db/schema';
import { ResponseErrorMessage } from './response-error-message';
import { ThinkingMessage } from './thinking-message';
import { Greeting } from './greeting';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  useChatId,
  useChatStatus,
  useMessageIds,
} from '@/lib/stores/chat-store';

interface PureMessagesInternalProps {
  votes: Array<Vote> | undefined;
  isReadonly: boolean;
}

const PureMessagesInternal = memo(function PureMessagesInternal({
  votes,
  isReadonly,
}: PureMessagesInternalProps) {
  const chatId = useChatId();
  const status = useChatStatus();
  const messageIds = useMessageIds();

  if (!chatId) {
    return null;
  }

  return (
    <>
      {messageIds.length === 0 && <Greeting />}

      {messageIds.map((messageId, index) => (
        <PreviewMessage
          key={messageId}
          messageId={messageId}
          isLoading={status === 'streaming' && messageIds.length - 1 === index}
          vote={
            votes
              ? votes.find((vote) => vote.messageId === messageId)
              : undefined
          }
          parentMessageId={index > 0 ? messageIds[index - 1] : null}
          isReadonly={isReadonly}
        />
      ))}

      {status === 'submitted' && messageIds.length > 0 && (
        // messages[messages.length - 1].role === 'user' &&
        <ThinkingMessage />
      )}

      {status === 'error' && <ResponseErrorMessage />}

      <div className="shrink-0 min-w-[24px] min-h-[24px]" />
    </>
  );
});

export interface MessagesProps {
  votes: Array<Vote> | undefined;
  isReadonly: boolean;
  isVisible: boolean;
  onModelChange?: (modelId: string) => void;
}

function PureMessages({ votes, isReadonly, isVisible }: MessagesProps) {
  return (
    <Conversation className="flex flex-col flex-1 w-full">
      <ConversationContent className="flex flex-col min-w-0 sm:max-w-2xl md:max-w-3xl container mx-auto h-full">
        <PureMessagesInternal votes={votes} isReadonly={isReadonly} />
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
  if (prevProps.votes !== nextProps.votes) return false;
  if (prevProps.isReadonly !== nextProps.isReadonly) return false;
  // NOTE: isVisible avoids re-renders when the messages aren't visible
  if (prevProps.isVisible !== nextProps.isVisible) return false;

  return true;
});
