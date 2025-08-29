'use client';
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { MultimodalInput } from './multimodal-input';
import type { ChatMessage } from '@/lib/ai/types';
import { ChatInputProvider } from '@/providers/chat-input-provider';
import {
  getAttachmentsFromMessage,
  getTextContentFromMessage,
} from '@/lib/utils';
import type { ModelId } from '@/lib/ai/model-id';
import { useChatStatus } from '@/lib/stores/chat-store';

export type MessageEditorProps = {
  chatId: string;
  message: ChatMessage;
  setMode: Dispatch<SetStateAction<'view' | 'edit'>>;
  parentMessageId: string | null;
};

function MessageEditorContent({
  chatId,
  setMode,
  parentMessageId,
}: MessageEditorProps & { onModelChange?: (modelId: string) => void }) {
  const status = useChatStatus();

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      console.log('handleClickOutside', event);
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setMode('view');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setMode]);

  const handleOnSendMessage = useCallback(
    (_: ChatMessage) => {
      setMode('view');
    },
    [setMode],
  );

  return (
    <div ref={containerRef} className="w-full">
      <MultimodalInput
        chatId={chatId}
        status={status}
        onSendMessage={handleOnSendMessage}
        isEditMode={true}
        parentMessageId={parentMessageId}
      />
    </div>
  );
}

export function MessageEditor(
  props: MessageEditorProps & { onModelChange?: (modelId: string) => void },
) {
  // Get the initial input value from the message content
  const initialInput = getTextContentFromMessage(props.message);
  const initialAttachments = getAttachmentsFromMessage(props.message);

  // Use selectedModel from the message metadata, or fall back to current selected model
  const messageSelectedModel = props.message.metadata?.selectedModel as ModelId;
  const { parentMessageId, ...rest } = props;
  return (
    <ChatInputProvider
      key={`edit-${props.message.id}`}
      initialInput={initialInput}
      initialAttachments={initialAttachments}
      initialTool={props.message.metadata?.selectedTool}
      localStorageEnabled={false}
      overrideModelId={messageSelectedModel || undefined}
    >
      <MessageEditorContent
        {...rest}
        parentMessageId={props.message.metadata?.parentMessageId}
      />
    </ChatInputProvider>
  );
}
