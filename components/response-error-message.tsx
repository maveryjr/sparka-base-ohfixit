import { Button } from './ui/button';
import { RefreshCcwIcon } from 'lucide-react';
import { chatStore, useSetMessages } from '@/lib/stores/chat-store';

export function ResponseErrorMessage() {
  const setMessages = useSetMessages();

  return (
    <div className="flex flex-col items-center mx-auto px-6 py-8 rounded-lg shadow-xs gap-4 w-full md:max-w-2xl">
      <div className="flex items-center gap-2 ">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        <p className="font-medium">Something went wrong</p>
      </div>
      <p className="text-sm text-center">
        An error occurred while processing your request. Please try again.
      </p>
      <Button
        onClick={async () => {
          // Remove last message from assistant if exists
          const messagesWithoutLastAssistant = chatStore
            .getState()
            .messages.slice(0, -1);
          setMessages(messagesWithoutLastAssistant);
          void chatStore.getState().currentChatHelpers?.regenerate?.();
        }}
        variant="outline"
        className=" "
      >
        <RefreshCcwIcon className="w-4 h-4 mr-2" />
        Try again
      </Button>
    </div>
  );
}
