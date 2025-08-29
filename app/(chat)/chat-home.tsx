'use client';
import { ChatSystem } from '@/components/chat-system';

export function ChatHome({ id }: { id: string }) {
  return (
    <>
      <ChatSystem id={id} initialMessages={[]} isReadonly={false} />
    </>
  );
}
