'use client';

import type { ChatMessage } from '@/lib/ai/types';
import type { UseChatHelpers } from '@ai-sdk/react';
import { useSession } from 'next-auth/react';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PromptInputButton } from '@/components/ai-elements/prompt-input';
import { ImageIcon } from '@/components/icons';
import { LoginPrompt } from '@/components/upgrade-cta/login-prompt';

export function ScreenCaptureButton({
  status,
  onCapture,
  className,
}: {
  status: UseChatHelpers<ChatMessage>['status'];
  onCapture: (file: File) => void | Promise<void>;
  className?: string;
}) {
  const { data: session } = useSession();
  const isAnonymous = !session?.user;
  const [showLoginPopover, setShowLoginPopover] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleClick = useCallback(async () => {
    if (status !== 'ready') {
      toast.error('Please wait for the model to finish its response!');
      return;
    }
    if (isAnonymous) {
      setShowLoginPopover(true);
      return;
    }
    if (!('mediaDevices' in navigator) ||
      typeof navigator.mediaDevices.getDisplayMedia !== 'function') {
      toast.error('Screen capture is not supported in this browser.');
      return;
    }

    setIsCapturing(true);
    let stream: MediaStream | null = null;
    try {
      const dmConstraints: MediaStreamConstraints = {
        video: {
          frameRate: { ideal: 1, max: 1 },
        },
        audio: false,
      };
      // Note: getDisplayMedia accepts a DisplayMediaStreamConstraints in spec, but TS lib may not include it; cast to any.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stream = await (navigator.mediaDevices.getDisplayMedia as any)(
        dmConstraints,
      );

  if (!stream) throw new Error('No media stream');
  const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();

      // Create video element to draw current frame
      const video = document.createElement('video');
      video.srcObject = stream;
  // Some browsers require playsInline to avoid full screen
  (video as HTMLVideoElement & { playsInline?: boolean }).playsInline = true;
      video.muted = true;
      await video.play();

      const width = Math.max(1, settings.width || video.videoWidth || 1280);
      const height = Math.max(1, settings.height || video.videoHeight || 720);

      // Scale down very large captures to keep file size < ~5MB (heuristic)
      const MAX_DIMENSION = 2000; // px
      const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
      const outW = Math.max(1, Math.round(width * scale));
      const outH = Math.max(1, Math.round(height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');

      ctx.drawImage(video, 0, 0, outW, outH);

      // Prefer JPEG to keep size small; quality tuned for <5MB in most cases
      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Failed to create blob'))),
          'image/jpeg',
          0.9,
        );
      });

      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .replace('T', '_')
        .replace('Z', '');
      const file = new File([blob], `screenshot_${timestamp}.jpg`, {
        type: blob.type || 'image/jpeg',
        lastModified: Date.now(),
      });

      await onCapture(file);
      toast.success('Screenshot captured');
    } catch (err: unknown) {
      const error = err as Error & { name?: string };
      if (error?.name === 'NotAllowedError' || error?.name === 'AbortError') {
        // User canceled; do not show error toast
      } else {
        toast.error('Failed to capture screen');
        // eslint-disable-next-line no-console
        console.error('Screen capture error:', err);
      }
    } finally {
      setIsCapturing(false);
      if (stream) {
        for (const track of stream.getTracks()) track.stop();
      }
    }
  }, [isAnonymous, onCapture, status]);

  return (
    <Popover open={showLoginPopover} onOpenChange={setShowLoginPopover}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <PromptInputButton
              data-testid="screen-capture-button"
              className={className}
              onClick={(e) => {
                e.preventDefault();
                void handleClick();
              }}
              disabled={status !== 'ready' || isCapturing}
              variant="ghost"
            >
              <ImageIcon />
            </PromptInputButton>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Capture Screenshot</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-80 p-0" align="end">
        <LoginPrompt
          title="Sign in to capture screenshots"
          description="Capture your screen to attach annotated screenshots to the chat."
        />
      </PopoverContent>
    </Popover>
  );
}

export default ScreenCaptureButton;
