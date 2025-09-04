'use client';

import { useMemo, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { usePhase2 } from '@/providers/phase2-provider';
import { Mic, BookOpen, Shield, Settings2, Users } from 'lucide-react';
import { VoiceMode } from './voice-mode';
import { RedactionAssist } from './redaction-assist';
import { FamilyPortal } from './family-portal';
import { AutomationPanel } from './automation-panel';

export type AssistFeature =
  | 'automation-panel'
  | 'issue-playbooks'
  | 'redaction-assist'
  | 'voice-mode'
  | 'family-portal';

export function AssistDock({ chatId }: { chatId: string }) {
  const { showPhase2Hub, setShowPhase2Hub, activeFeature, setActiveFeature } =
    usePhase2();
  // Ensure a sensible default feature when opened without a selection
  // Use an effect to avoid state updates during render
  useEffect(() => {
    if (showPhase2Hub && !activeFeature) {
      setActiveFeature('automation-panel');
    }
  }, [showPhase2Hub, activeFeature, setActiveFeature]);

  const title = useMemo(() => {
    switch (activeFeature) {
      case 'automation-panel':
        return 'Automation Panel';
      case 'issue-playbooks':
        return 'Issue Playbooks';
      case 'redaction-assist':
        return 'Redaction Assist';
      case 'voice-mode':
        return 'Voice Mode';
      case 'family-portal':
        return 'Family Portal';
      default:
        return 'Assist';
    }
  }, [activeFeature]);

  const Description = useMemo(() => {
    switch (activeFeature) {
      case 'automation-panel':
        return 'Preview → Approve → Execute allowlisted actions';
      case 'issue-playbooks':
        return 'Pre-built solutions for common tech problems';
      case 'redaction-assist':
        return 'Detect and blur sensitive information before sharing';
      case 'voice-mode':
        return 'Hands-free guidance with speech recognition and TTS';
      case 'family-portal':
        return 'Shared minutes and remote assistance';
      default:
        return '';
    }
  }, [activeFeature]);

  return (
    <Sheet open={showPhase2Hub} onOpenChange={(open) => setShowPhase2Hub(open)}>
      <SheetContent side="right" className={cn('w-[420px] sm:w-[520px] p-0')}> 
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <SheetTitle className="flex items-center gap-2">
              {activeFeature === 'voice-mode' && <Mic className="h-4 w-4" />}
              {activeFeature === 'issue-playbooks' && (
                <BookOpen className="h-4 w-4" />
              )}
              {activeFeature === 'redaction-assist' && (
                <Shield className="h-4 w-4" />
              )}
              {activeFeature === 'automation-panel' && (
                <Settings2 className="h-4 w-4" />
              )}
              {activeFeature === 'family-portal' && (
                <Users className="h-4 w-4" />
              )}
              {title}
            </SheetTitle>
            {Description && (
              <SheetDescription className="text-xs mt-0.5">
                {Description}
              </SheetDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Optional back to overview */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setActiveFeature('automation-panel');
              }}
            >
              Home
            </Button>
          </div>
        </div>
        <Separator />
        <div className="p-4 space-y-4 overflow-y-auto h-full">
          {activeFeature === 'automation-panel' && (
            <AutomationPanel chatId={chatId} />
          )}

          {activeFeature === 'issue-playbooks' && (
            <PlaybooksCompact
              onStart={(id) => {
                // Start in chat; close dock to reduce clutter
                try {
                  const event = new CustomEvent('ohfixit:playbook:start', {
                    detail: { id },
                  });
                  window.dispatchEvent(event);
                } catch {}
                setShowPhase2Hub(false);
              }}
            />
          )}

          {activeFeature === 'redaction-assist' && (
            <RedactionAssist
              imageUrl="/api/placeholder-screenshot"
              onRedactedImage={() => setShowPhase2Hub(false)}
              autoDetect={
                (typeof window !== 'undefined'
                  ? localStorage.getItem('ohfixit:redaction:auto_blur') ?? 'true'
                  : 'true') === 'true'
              }
            />
          )}

          {activeFeature === 'voice-mode' && (
            <div className="space-y-3">
              <VoiceMode
                onTranscription={(t) => {
                  try {
                    const evt = new CustomEvent('ohfixit:voice:text', {
                      detail: { text: t },
                    });
                    window.dispatchEvent(evt);
                  } catch {}
                }}
                onSpeechStart={() => {}}
                onSpeechEnd={() => {}}
              />
              <p className="text-xs text-muted-foreground">
                Tip: You can also enable the mic from the chat toolbar.
              </p>
            </div>
          )}

          {activeFeature === 'family-portal' && <FamilyPortal />}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PlaybooksCompact({
  onStart,
}: {
  onStart: (id: string) => void;
}) {
  const items = [
    { id: 'wifi-slow', title: 'Fix Slow Wi‑Fi', detail: 'Network' },
    { id: 'printer-offline', title: 'Printer Offline', detail: 'Hardware' },
    { id: 'storage-full', title: 'Free Up Storage', detail: 'System' },
    {
      id: 'browser-popup-malware',
      title: 'Remove Browser Malware',
      detail: 'Security',
    },
  ];
  return (
    <div className="space-y-2">
      {items.map((p) => (
        <div
          key={p.id}
          className="rounded border p-3 flex items-center justify-between gap-3"
        >
          <div className="min-w-0">
            <div className="font-medium text-sm truncate">{p.title}</div>
            <div className="text-xs text-muted-foreground">{p.detail}</div>
          </div>
          <Button size="sm" onClick={() => onStart(p.id)}>
            Start
          </Button>
        </div>
      ))}
    </div>
  );
}
