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
import { SidebarMenuButton } from '@/components/ui/sidebar';
import { Sparkles, Shield, BookOpen, Settings2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePhase2 } from '@/providers/phase2-provider';

export function AppSidebar() {
  const { open, openMobile } = useSidebar();
  const router = useRouter();
  const { setActiveFeature, setShowPhase2Hub } = usePhase2();

  function openAssist(feature: string) {
    // Ensure we're on chat shell so the Assist dock is visible
    router.push('/');
    setActiveFeature(feature);
    setShowPhase2Hub(true);
  }

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

          {/* Assist shortcuts */}
          <SidebarMenuItem>
            <SidebarMenuButton className="w-full justify-start" onClick={() => openAssist('automation-panel')}>
              <Settings2 className="h-4 w-4" />
              <span>Automation Panel</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton className="w-full justify-start" onClick={() => openAssist('issue-playbooks')}>
              <BookOpen className="h-4 w-4" />
              <span>Issue Playbooks</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton className="w-full justify-start" onClick={() => openAssist('redaction-assist')}>
              <Shield className="h-4 w-4" />
              <span>Redaction Assist</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton className="w-full justify-start" onClick={() => openAssist('voice-mode')}>
              <Sparkles className="h-4 w-4" />
              <span>Voice Mode</span>
            </SidebarMenuButton>
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
