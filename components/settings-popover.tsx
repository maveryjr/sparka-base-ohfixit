'use client';

import { useState } from 'react';
import { User, Settings, Coins, Moon, Sun, LogOut, Key, Edit, CreditCard } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';
import type { Session } from 'next-auth';
import { signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useGetCredits } from '@/hooks/chat-sync-hooks';
import { ChangePasswordModal } from '@/components/settings/change-password-modal';
import { EditProfileModal } from '@/components/settings/edit-profile-modal';

interface SettingsPopoverProps {
  user: Session['user'];
}

export function SettingsPopover({ user }: SettingsPopoverProps) {
  const { setTheme, theme } = useTheme();
  const { credits } = useGetCredits();
  const [isOpen, setIsOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const v = localStorage.getItem('ohfixit:voice:enabled');
      return v === null ? true : v === 'true';
    } catch {
      return true;
    }
  });
  const [autoBlur, setAutoBlur] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const v = localStorage.getItem('ohfixit:redaction:auto_blur');
      return v === null ? true : v === 'true';
    } catch {
      return true;
    }
  });

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
    setIsOpen(false);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-full hover:bg-muted"
          >
            <Image
              src={user.image ?? `https://avatar.vercel.sh/${user.email}`}
              alt={user.email ?? 'User Avatar'}
              width={24}
              height={24}
              className="rounded-full"
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-80 p-0" 
          align="end" 
          side="bottom"
          sideOffset={8}
        >
          <div className="p-4">
            {/* User Info Header */}
            <div className="flex items-center gap-3 mb-4">
              <Image
                src={user.image ?? `https://avatar.vercel.sh/${user.email}`}
                alt={user.email ?? 'User Avatar'}
                width={40}
                height={40}
                className="rounded-full"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {user.name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>

            <Separator className="mb-4" />

            {/* Account Section */}
            <div className="space-y-1 mb-4">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Account
              </h4>
              
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 px-2"
                onClick={() => {
                  setShowChangePassword(true);
                  setIsOpen(false);
                }}
              >
                <Key className="h-4 w-4 mr-3" />
                Change Password
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 px-2"
                onClick={() => {
                  setShowEditProfile(true);
                  setIsOpen(false);
                }}
              >
                <Edit className="h-4 w-4 mr-3" />
                Edit Profile
              </Button>
            </div>

            <Separator className="mb-4" />

            {/* Credits Section */}
            <div className="space-y-1 mb-4">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Credits
              </h4>
              
              <div className="flex items-center justify-between px-2 py-1">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Credits</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {credits ?? 'Loading...'}
                </Badge>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 px-2 opacity-60 cursor-not-allowed"
                disabled
              >
                <CreditCard className="h-4 w-4 mr-3" />
                Buy Credits
                <Badge variant="outline" className="ml-auto text-xs">
                  Coming Soon
                </Badge>
              </Button>
            </div>

            <Separator className="mb-4" />

            {/* Preferences Section */}
            <div className="space-y-1 mb-4">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Preferences
              </h4>
              
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 px-2"
                onClick={toggleTheme}
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4 mr-3" />
                ) : (
                  <Moon className="h-4 w-4 mr-3" />
                )}
                Toggle {theme === 'light' ? 'Dark' : 'Light'} Mode
              </Button>

              <div className="flex items-center justify-between px-2 py-1">
                <div className="text-sm">Enable Voice Input</div>
                <Checkbox
                  checked={voiceEnabled}
                  onCheckedChange={(v) => {
                    const on = Boolean(v);
                    setVoiceEnabled(on);
                    try { localStorage.setItem('ohfixit:voice:enabled', on ? 'true' : 'false'); } catch {}
                  }}
                />
              </div>

              <div className="flex items-center justify-between px-2 py-1">
                <div className="text-sm">Auto‑detect blur regions</div>
                <Checkbox
                  checked={autoBlur}
                  onCheckedChange={(v) => {
                    const on = Boolean(v);
                    setAutoBlur(on);
                    try { localStorage.setItem('ohfixit:redaction:auto_blur', on ? 'true' : 'false'); } catch {}
                  }}
                />
              </div>
            </div>

            <Separator className="mb-4" />

            {/* Sign Out */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-3" />
              Sign Out
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Modals */}
      <ChangePasswordModal
        open={showChangePassword}
        onOpenChange={setShowChangePassword}
      />
      
      <EditProfileModal
        open={showEditProfile}
        onOpenChange={setShowEditProfile}
        user={user}
      />
    </>
  );
}
