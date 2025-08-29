'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useSidebar, SidebarMenuButton } from '@/components/ui/sidebar';
import { useChatId } from '@/providers/chat-id-provider';
import { PlusIcon } from '@/components/icons';
import { getNewChatShortcutText } from '@/components/keyboard-shortcuts';

export function NewChatButton() {
  const { setOpenMobile } = useSidebar();
  const { refreshChatID } = useChatId();
  const [shortcutText, setShortcutText] = useState('Ctrl+Shift+O');

  useEffect(() => {
    setShortcutText(getNewChatShortcutText());
  }, []);

  return (
    <SidebarMenuButton className="mt-4" asChild>
      <Link
        href="/"
        onClick={() => {
          setOpenMobile(false);
          refreshChatID();
        }}
        className="flex items-center gap-2 w-full"
      >
        <PlusIcon />
        <span>New Chat</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {shortcutText}
        </span>
      </Link>
    </SidebarMenuButton>
  );
}
