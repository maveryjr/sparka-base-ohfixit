'use client';
import { memo } from 'react';
import equal from 'fast-deep-equal';
import { useMessageRoleById } from '@/lib/stores/chat-store';
import { AssistantMessage } from './assistant-message';
import { UserMessage, type BaseMessageProps } from './user-message';

const PurePreviewMessage = ({
  messageId,
  vote,
  isLoading,
  isReadonly,
  parentMessageId,
}: BaseMessageProps) => {
  const role = useMessageRoleById(messageId);
  if (!role) return null;

  return (
    <>
      {role === 'user' ? (
        <UserMessage
          messageId={messageId}
          vote={vote}
          isLoading={isLoading}
          isReadonly={isReadonly}
          parentMessageId={parentMessageId}
        />
      ) : (
        <AssistantMessage
          messageId={messageId}
          vote={vote}
          isLoading={isLoading}
          isReadonly={isReadonly}
        />
      )}
    </>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (prevProps.messageId !== nextProps.messageId) return false;
    if (!equal(prevProps.vote, nextProps.vote)) return false;
    if (prevProps.parentMessageId !== nextProps.parentMessageId) return false;

    return true;
  },
);
