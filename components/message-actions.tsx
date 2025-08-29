import { useCopyToClipboard } from 'usehooks-ts';

import type { Vote } from '@/lib/db/schema';

import { CopyIcon, ThumbDownIcon, ThumbUpIcon } from './icons';
import { Actions, Action } from '@/components/ai-elements/actions';
import { toast } from 'sonner';
import { useTRPC } from '@/trpc/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { ChevronLeft, ChevronRight, Pencil, PencilOff } from 'lucide-react';
import { useMessageTree } from '@/providers/message-tree-provider';
import { RetryButton } from './retry-button';
import { memo } from 'react';
import equal from 'fast-deep-equal';
import { chatStore, useMessageRoleById } from '@/lib/stores/chat-store';
import { useIsMobile } from '@/hooks/use-mobile';

export function PureMessageActions({
  chatId,
  messageId,
  vote,
  isLoading,
  isReadOnly,
  isEditing,
  onStartEdit,
  onCancelEdit,
}: {
  chatId: string;
  messageId: string;
  vote: Vote | undefined;
  isLoading: boolean;
  isReadOnly: boolean;
  isEditing?: boolean;
  onStartEdit?: () => void;
  onCancelEdit?: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [_, copyToClipboard] = useCopyToClipboard();
  const { data: session } = useSession();
  const { getMessageSiblingInfo, navigateToSibling } = useMessageTree();
  const role = useMessageRoleById(messageId);

  const isAuthenticated = !!session?.user;
  const isMobile = useIsMobile();

  const voteMessageMutation = useMutation(
    trpc.vote.voteMessage.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.vote.getVotes.queryKey({ chatId }),
        });
      },
    }),
  );

  // Get sibling info for navigation
  const siblingInfo = getMessageSiblingInfo(messageId);
  const hasSiblings = siblingInfo && siblingInfo.siblings.length > 1;

  if (isLoading) return null;

  return (
    <Actions
      className={
        isMobile
          ? ''
          : 'opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-hover/message:opacity-100 focus-within:opacity-100 hover:opacity-100'
      }
    >
      {role === 'user' &&
        !isReadOnly &&
        (isEditing ? (
          <Action
            tooltip="Cancel edit"
            className="text-muted-foreground hover:text-accent-foreground hover:bg-accent h-7 w-7 p-0"
            onClick={() => onCancelEdit?.()}
          >
            <PencilOff className="h-3.5 w-3.5" />
          </Action>
        ) : (
          <Action
            tooltip="Edit message"
            className="text-muted-foreground hover:text-accent-foreground hover:bg-accent h-7 w-7 p-0"
            onClick={() => onStartEdit?.()}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Action>
        ))}
      <Action
        tooltip="Copy"
        className="text-muted-foreground hover:text-accent-foreground hover:bg-accent h-7 w-7 p-0"
        onClick={async () => {
          const message = chatStore
            .getState()
            .messages.find((m) => m.id === messageId);
          if (!message) return;

          const textFromParts = message.parts
            ?.filter((part) => part.type === 'text')
            .map((part) => part.text)
            .join('\n')
            .trim();

          if (!textFromParts) {
            toast.error("There's no text to copy!");
            return;
          }

          await copyToClipboard(textFromParts);
          toast.success('Copied to clipboard!');
        }}
      >
        <CopyIcon size={14} />
      </Action>

      {hasSiblings && (
        <div className="flex gap-1 items-center justify-center">
          <Action
            tooltip="Previous version"
            className="text-muted-foreground hover:text-accent-foreground hover:bg-accent h-7 w-7 px-0"
            onClick={() => navigateToSibling(messageId, 'prev')}
            disabled={siblingInfo.siblingIndex === 0}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Action>

          <span className="text-muted-foreground text-xs">
            {siblingInfo.siblingIndex + 1}/{siblingInfo.siblings.length}
          </span>

          <Action
            tooltip="Next version"
            className="text-muted-foreground hover:text-accent-foreground hover:bg-accent h-7 w-7 px-0"
            onClick={() => navigateToSibling(messageId, 'next')}
            disabled={
              siblingInfo.siblingIndex === siblingInfo.siblings.length - 1
            }
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Action>
        </div>
      )}

      {role === 'assistant' && !isReadOnly && isAuthenticated && (
        <>
          <Action
            tooltip="Upvote Response"
            data-testid="message-upvote"
            className="text-muted-foreground hover:text-accent-foreground hover:bg-accent h-7 w-7 p-0 pointer-events-auto!"
            disabled={vote?.isUpvoted || !isAuthenticated}
            onClick={() => {
              toast.promise(
                voteMessageMutation.mutateAsync({
                  chatId,
                  messageId: messageId,
                  type: 'up' as const,
                }),
                {
                  loading: 'Upvoting Response...',
                  success: 'Upvoted Response!',
                  error: 'Failed to upvote response.',
                },
              );
            }}
          >
            <ThumbUpIcon size={14} />
          </Action>

          <Action
            tooltip="Downvote Response"
            data-testid="message-downvote"
            className="text-muted-foreground hover:text-accent-foreground hover:bg-accent h-7 w-7 p-0 pointer-events-auto!"
            disabled={(vote && !vote.isUpvoted) || !session?.user}
            onClick={() => {
              toast.promise(
                voteMessageMutation.mutateAsync({
                  chatId,
                  messageId: messageId,
                  type: 'down' as const,
                }),
                {
                  loading: 'Downvoting Response...',
                  success: 'Downvoted Response!',
                  error: 'Failed to downvote response.',
                },
              );
            }}
          >
            <ThumbDownIcon size={14} />
          </Action>

          {!isReadOnly && <RetryButton messageId={messageId} />}
          {(() => {
            const message = chatStore
              .getState()
              .messages.find((m) => m.id === messageId);
            return (
              message?.metadata?.selectedModel && (
                <div className="flex items-center ml-2">
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {message.metadata.selectedModel}
                  </span>
                </div>
              )
            );
          })()}
        </>
      )}
    </Actions>
  );
}

export const MessageActions = memo(
  PureMessageActions,
  (prevProps, nextProps) => {
    if (!equal(prevProps.vote, nextProps.vote)) return false;
    if (prevProps.chatId !== nextProps.chatId) return false;
    if (prevProps.messageId !== nextProps.messageId) return false;
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (prevProps.isReadOnly !== nextProps.isReadOnly) return false;
    if (prevProps.isEditing !== nextProps.isEditing) return false;
    if (prevProps.onStartEdit !== nextProps.onStartEdit) return false;
    if (prevProps.onCancelEdit !== nextProps.onCancelEdit) return false;

    return true;
  },
);
