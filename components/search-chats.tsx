'use client';

import { useState, useEffect } from 'react';
import { SearchIcon } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { SidebarMenuButton } from './ui/sidebar';
import { SearchChatsDialog } from './search-chats-dialog';

// Helper function to get platform-specific shortcut text
function getSearchShortcutText() {
  if (typeof window === 'undefined') return 'Ctrl+K';
  
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  return isMac ? 'Cmd+K' : 'Ctrl+K';
}

export function SearchChatsButton() {
  const [open, setOpen] = useState(false);
  const { setOpenMobile } = useSidebar();
  const [shortcutText, setShortcutText] = useState('Ctrl+K');

  // Update shortcut text on mount
  useEffect(() => {
    setShortcutText(getSearchShortcutText());
  }, []);

  // Global keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <>
      <SidebarMenuButton
        onClick={() => setOpen(true)}
        className="w-full justify-start"
      >
        <SearchIcon className="h-4 w-4" />
        <span>Search chats</span>
        <span className="ml-auto text-xs text-muted-foreground">{shortcutText}</span>
      </SidebarMenuButton>

      {open && (
        <SearchChatsDialog
          open={open}
          onOpenChange={setOpen}
          onSelectChat={() => setOpenMobile(false)}
        />
      )}
    </>
  );
}
