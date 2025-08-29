import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  LexicalChatInput,
  type LexicalChatInputRef,
} from './lexical-chat-input';

interface ChatInputTextAreaRef extends LexicalChatInputRef {}

const ChatInputContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'group relative flex h-full max-w-full flex-1 flex-col cursor-text rounded-2xl border px-3 py-1 shadow-[0_9px_9px_0px_rgba(0,0,0,0.01),0_2px_5px_0px_rgba(0,0,0,0.06)] transition-colors dark:border-none dark:shadow-none bg-muted',
      className,
    )}
    {...props}
  />
));
ChatInputContainer.displayName = 'ChatInputContainer';

const ChatInputTopRow = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('mt-2 mb-1 flex items-center justify-between', className)}
    {...props}
  />
));
ChatInputTopRow.displayName = 'ChatInputTopRow';

const ChatInputTextArea = React.forwardRef<
  ChatInputTextAreaRef,
  React.ComponentProps<typeof LexicalChatInput>
>(({ className, ...props }, ref) => {
  return <LexicalChatInput ref={ref} className={className} {...props} />;
});
ChatInputTextArea.displayName = 'ChatInputTextArea';

const ChatInputBottomRow = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('mb-2 mt-1 flex items-center justify-end', className)}
    {...props}
  />
));
ChatInputBottomRow.displayName = 'ChatInputBottomRow';

export {
  ChatInputContainer,
  ChatInputTopRow,
  ChatInputTextArea,
  ChatInputBottomRow,
  type ChatInputTextAreaRef,
};
