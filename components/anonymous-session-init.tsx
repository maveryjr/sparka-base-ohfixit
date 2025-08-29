'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import type { AnonymousSession } from '@/lib/types/anonymous';
import {
  getAnonymousSession,
  createAnonymousSession,
  setAnonymousSession,
  clearAnonymousSession,
} from '@/lib/anonymous-session-client';

// Schema validation function
function isValidAnonymousSession(obj: any): obj is AnonymousSession {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.remainingCredits === 'number' &&
    (obj.createdAt instanceof Date || typeof obj.createdAt === 'string')
  );
}

export function AnonymousSessionInit() {
  const { data: session, status } = useSession();

  useEffect(() => {
    // Only initialize for non-authenticated users after session is loaded
    if (status === 'loading') return;
    if (session?.user) return;

    // Get raw session data and validate/migrate
    const existingSession = getAnonymousSession();

    if (existingSession) {
      // Validate the existing session schema
      if (!isValidAnonymousSession(existingSession)) {
        console.warn(
          'Invalid session schema detected during init, clearing and creating new session',
        );
        clearAnonymousSession();
        const newSession = createAnonymousSession();
        setAnonymousSession(newSession);
        return;
      }

      console.log('Valid anonymous session found');
    } else {
      // Create new session if none exists
      console.log('No anonymous session found, creating new one');
      const newSession = createAnonymousSession();
      setAnonymousSession(newSession);
    }
  }, [session, status]);

  return null; // This component doesn't render anything
}
