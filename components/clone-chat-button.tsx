'use client';

import { Button } from '@/components/ui/button';
import { useCloneChat } from '@/hooks/chat-sync-hooks';
import { Loader2, Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface CloneChatButtonProps {
  chatId: string;
  className?: string;
}

export function CloneChatButton({ chatId, className }: CloneChatButtonProps) {
  const router = useRouter();
  const copyChat = useCloneChat();

  const handleCloneChat = async () => {
    try {
      const result = await copyChat.mutateAsync({
        chatId,
      });

      router.push(`/chat/${result.chatId}`);
      toast.success('Chat saved to your chats!');
    } catch (error) {
      console.error('Failed to clone chat:', error);
      toast.error('Failed to save chat. Please try again.');
    }
  };

  return (
    <div className="flex justify-center  py-10 px-4 items-center m-auto">
      <Button
        type="button"
        onClick={handleCloneChat}
        disabled={copyChat.isPending}
        variant="default"
        size="sm"
        className={className}
      >
        {copyChat.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Copy className="w-4 h-4 mr-2" />
            Save to your chats
          </>
        )}
      </Button>
    </div>
  );
}
