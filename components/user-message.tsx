'use client';
import { memo, useState } from 'react';
import type { Vote } from '@/lib/db/schema';
import { MessageActions } from './message-actions';
import equal from 'fast-deep-equal';
import { cn, getAttachmentsFromMessage } from '@/lib/utils';
import { MessageEditor } from './message-editor';
import { AttachmentList } from './attachment-list';
import { ImageModal } from './image-modal';
import { useChatId, useMessageById } from '@/lib/stores/chat-store';
import {
  Message as AIMessage,
  MessageContent as AIMessageContent,
} from '@/components/ai-elements/message';

export interface BaseMessageProps {
  messageId: string;
  vote: Vote | undefined;
  isLoading: boolean;
  isReadonly: boolean;
  parentMessageId: string | null;
}

export const PureUserMessage = ({
  messageId,
  vote,
  isLoading,
  isReadonly,
  parentMessageId,
}: BaseMessageProps) => {
  const chatId = useChatId();
  const message = useMessageById(messageId);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [imageModal, setImageModal] = useState<{
    isOpen: boolean;
    imageUrl: string;
    imageName?: string;
  }>({
    isOpen: false,
    imageUrl: '',
    imageName: undefined,
  });

  const handleImageClick = (imageUrl: string, imageName?: string) => {
    setImageModal({
      isOpen: true,
      imageUrl,
      imageName,
    });
  };

  const handleImageModalClose = () => {
    setImageModal({
      isOpen: false,
      imageUrl: '',
      imageName: undefined,
    });
  };

  if (!message) return null;
  const textPart = message.parts.find((part) => part.type === 'text');
  if (!textPart || !chatId) return null;

  return (
    <>
      <AIMessage
        from="user"
        className={cn(
          // TODO: Consider not using this max-w class override when editing is cohesive with displaying the message
          mode === 'edit' ? 'max-w-full [&>div]:max-w-full' : undefined,
          'py-1',
        )}
      >
        <div
          className={cn(
            'flex flex-col gap-2 w-full',
            message.role === 'user' && mode !== 'edit' && 'items-end',
          )}
        >
          {mode === 'view' ? (
            isReadonly ? (
              <AIMessageContent
                data-testid="message-content"
                className="text-left"
              >
                <AttachmentList
                  attachments={getAttachmentsFromMessage(message)}
                  onImageClick={handleImageClick}
                  testId="message-attachments"
                />
                <pre className="whitespace-pre-wrap font-sans">
                  {textPart.text}
                </pre>
              </AIMessageContent>
            ) : (
              <button
                type="button"
                data-testid="message-content"
                className="text-left cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setMode('edit')}
              >
                <AIMessageContent
                  data-testid="message-content"
                  className="text-left"
                >
                  <AttachmentList
                    attachments={getAttachmentsFromMessage(message)}
                    onImageClick={handleImageClick}
                    testId="message-attachments"
                  />
                  <pre className="whitespace-pre-wrap font-sans">
                    {textPart.text}
                  </pre>
                </AIMessageContent>
              </button>
            )
          ) : (
            <div className="flex flex-row gap-2 items-start">
              <MessageEditor
                key={message.id}
                chatId={chatId}
                message={message}
                setMode={setMode}
                parentMessageId={parentMessageId}
              />
            </div>
          )}

          <div className="self-end">
            <MessageActions
              key={`action-${message.id}`}
              chatId={chatId}
              messageId={message.id}
              vote={vote}
              isLoading={isLoading}
              isReadOnly={isReadonly}
              isEditing={mode === 'edit'}
              onStartEdit={() => setMode('edit')}
              onCancelEdit={() => setMode('view')}
            />
          </div>
        </div>
      </AIMessage>
      <ImageModal
        isOpen={imageModal.isOpen}
        onClose={handleImageModalClose}
        imageUrl={imageModal.imageUrl}
        imageName={imageModal.imageName}
      />
    </>
  );
};

export const UserMessage = memo(PureUserMessage, (prevProps, nextProps) => {
  if (prevProps.messageId !== nextProps.messageId) return false;
  if (prevProps.isReadonly !== nextProps.isReadonly) return false;
  if (prevProps.parentMessageId !== nextProps.parentMessageId) return false;
  if (!equal(prevProps.vote, nextProps.vote)) return false;
  if (prevProps.isLoading !== nextProps.isLoading) return false;

  return true;
});
