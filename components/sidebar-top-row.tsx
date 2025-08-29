'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSidebar } from '@/components/ui/sidebar';
import { useChatId } from '@/providers/chat-id-provider';

export function SidebarTopRow() {
  const { setOpenMobile, open, openMobile } = useSidebar();
  const { refreshChatID } = useChatId();

  return (
    <Link
      href="/"
      onClick={() => {
        setOpenMobile(false);
        refreshChatID();
      }}
      className="flex flex-row gap-2 items-center"
    >
      <span className="text-lg font-semibold hover:bg-muted rounded-md cursor-pointer flex items-center gap-2 p-1">
        <Image
          src="/icon.svg"
          alt="Sparka AI"
          width={24}
          height={24}
          className="w-6 h-6"
        />
        {(open || openMobile) && 'Sparka'}
      </span>
    </Link>
  );
}
