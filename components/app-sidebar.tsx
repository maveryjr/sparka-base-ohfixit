'use client';

import { SidebarHistory } from '@/components/sidebar-history';
import { SearchChatsButton } from '@/components/search-chats';
import { SidebarCredits } from '@/components/sidebar-credits';
import { NewChatButton } from '@/components/new-chat-button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { SidebarTopRow } from '@/components/sidebar-top-row';

export function AppSidebar() {
  const { open, openMobile } = useSidebar();

  return (
    <Sidebar
      collapsible="icon"
      className="group-data-[side=left]:border-r-0 grid grid-rows-[auto_1fr_auto] max-h-dvh"
    >
      <SidebarHeader className="shrink-0">
        <SidebarMenu>
          <div className="flex flex-row justify-between items-center">
            <SidebarTopRow />
          </div>

          <NewChatButton />

          <SidebarMenuItem>
            <SearchChatsButton />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarSeparator />
      <ScrollArea className="relative flex-1 overflow-y-auto">
        <SidebarContent className="max-w-(--sidebar-width) pr-2">
          {(open || openMobile) && <SidebarHistory />}
        </SidebarContent>
      </ScrollArea>

      {(open || openMobile) && (
        <>
          <SidebarSeparator />
          <SidebarFooter className="shrink-0">
            <SidebarCredits />
          </SidebarFooter>
        </>
      )}
    </Sidebar>
  );
}
