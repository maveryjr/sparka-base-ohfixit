import { useCallback } from 'react';
import { RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

import { Action } from '@/components/ai-elements/actions';
// ChatMessage type not needed directly here
import {
  useSetMessages,
  chatStore,
  useSendMessage,
} from '@/lib/stores/chat-store';

export function RetryButton({
  messageId,
  className,
}: {
  messageId: string;
  className?: string;
}) {
  const setMessages = useSetMessages();
  const sendMessage = useSendMessage();

  const handleRetry = useCallback(() => {
    if (!sendMessage) {
      toast.error('Cannot retry this message');
      return;
    }

    // Find the current message (AI response) and its parent (user message)
    const currentMessages = chatStore.getState().messages;
    const currentMessageIdx = currentMessages.findIndex(
      (msg) => msg.id === messageId,
    );
    if (currentMessageIdx === -1) {
      toast.error('Cannot find the message to retry');
      return;
    }

    // Find the parent user message (should be the message before the AI response)
    const parentMessageIdx = currentMessageIdx - 1;
    if (parentMessageIdx < 0) {
      toast.error('Cannot find the user message to retry');
      return;
    }

    const parentMessage = currentMessages[parentMessageIdx];
    if (parentMessage.role !== 'user') {
      toast.error('Parent message is not from user');
      return;
    }
    setMessages(currentMessages.slice(0, parentMessageIdx));

    // Resend the parent user message
    sendMessage(
      {
        ...parentMessage,
        metadata: {
          ...parentMessage.metadata,
          createdAt: parentMessage.metadata?.createdAt || new Date(),
          selectedModel: parentMessage.metadata?.selectedModel || '',
          parentMessageId: parentMessage.metadata?.parentMessageId || null,
        },
      },
      {},
    );

    toast.success('Retrying message...');
  }, [sendMessage, messageId, setMessages]);

  return (
    <Action
      tooltip="Retry"
      className={`text-muted-foreground hover:text-accent-foreground hover:bg-accent h-7 w-7 p-0${
        className ? ` ${className}` : ''
      }`}
      onClick={handleRetry}
    >
      <RefreshCcw className="h-3.5 w-3.5" />
    </Action>
  );
}
