'use client';

import { useCallback, useState } from 'react';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  useRenameChat,
  usePinChat,
  useGetAllChats,
} from '@/hooks/chat-sync-hooks';
import { GroupedChatsList } from './grouped-chats-list';
import { DeleteDialog } from './delete-dialog';

export function SidebarHistory() {
  const { setOpenMobile } = useSidebar();

  const { mutate: renameChatMutation } = useRenameChat();
  const { mutate: pinChatMutation } = usePinChat();

  const { data: chats, isLoading } = useGetAllChats(50);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const renameChat = useCallback(
    (chatId: string, title: string) => {
      renameChatMutation({ chatId, title });
    },
    [renameChatMutation],
  );

  const pinChat = useCallback(
    (chatId: string, isPinned: boolean) => {
      pinChatMutation({ chatId, isPinned });
    },
    [pinChatMutation],
  );

  if (!isLoading && chats?.length === 0) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <div className="px-2 text-zinc-500 w-full flex flex-row justify-center items-center text-sm gap-2">
            Start chatting to see your conversation history!
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (isLoading) {
    return (
      <SidebarGroup>
        <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
          Today
        </div>
        <SidebarGroupContent>
          <div className="flex flex-col">
            {[44, 32, 28, 64, 52].map((item) => (
              <div
                key={item}
                className="rounded-md h-8 flex gap-2 px-2 items-center"
              >
                <div
                  className="h-4 rounded-md flex-1 max-w-(--skeleton-width) bg-sidebar-accent-foreground/10"
                  style={
                    {
                      '--skeleton-width': `${item}%`,
                    } as React.CSSProperties
                  }
                />
              </div>
            ))}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {chats && (
              <GroupedChatsList
                chats={chats}
                onDelete={(chatId) => {
                  setDeleteId(chatId);
                  setShowDeleteDialog(true);
                }}
                onRename={renameChat}
                onPin={pinChat}
                setOpenMobile={setOpenMobile}
              />
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <DeleteDialog
        deleteId={deleteId}
        showDeleteDialog={showDeleteDialog}
        setShowDeleteDialog={setShowDeleteDialog}
      />
    </>
  );
}
