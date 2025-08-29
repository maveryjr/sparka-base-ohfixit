'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { getSupabaseClient } from '@/lib/supabase/client';

function parseTokens(hash: string, search: string) {
  // Try hash first: #access_token=...&refresh_token=...&token_type=bearer&type=magiclink
  const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  // Try search params as fallback: ?access_token=...
  const searchParams = new URLSearchParams(search);
  
  const access_token = hashParams.get('access_token') || searchParams.get('access_token') || '';
  const refresh_token = hashParams.get('refresh_token') || searchParams.get('refresh_token') || '';
  const type = hashParams.get('type') || searchParams.get('type') || '';
  
  return { access_token, refresh_token, type, source: access_token ? (hashParams.get('access_token') ? 'hash' : 'search') : 'none' };
}

export default function MagicBridgePage() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const searchParams = useSearchParams();

  const { access_token, refresh_token, type, source } = useMemo(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const search = typeof window !== 'undefined' ? window.location.search : '';
    const parsed = parseTokens(hash, search);
    setDebugInfo(`Hash: ${hash}, Search: ${search}, Parsed: ${JSON.stringify(parsed)}`);
    return parsed;
  }, []);

  useEffect(() => {
    async function run() {
      try {
        if (!access_token) {
          setError(`Missing access token in magic link. Debug: ${debugInfo}`);
          setBusy(false);
          return;
        }
        // 1) Establish Supabase session locally so recovery actions can work
        try {
          const supabase = getSupabaseClient();
          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
          }
        } catch (e) {
          // non-fatal; we'll still try to create NextAuth session
          // console.warn('Failed to set Supabase session from magic link');
        }

        // 2) Bridge Supabase session -> NextAuth session via credentials provider
        const res = await signIn('credentials', {
          accessToken: access_token,
          redirect: false,
        });
        if (res?.error) {
          setError(res.error);
          setBusy(false);
          return;
        }
        // If it's a recovery link, route to reset password UI
        if (type === 'recovery') {
          window.location.replace('/reset-password');
        } else {
          window.location.replace('/');
        }
      } catch (e: any) {
        setError(e?.message ?? 'Magic link handling failed');
        setBusy(false);
      }
    }
    run();
  }, [access_token, type]);

  return (
    <div className="container mx-auto flex h-dvh w-screen items-center justify-center">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Signing you in…</h1>
        {busy && <p className="text-sm text-muted-foreground">Please wait</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {debugInfo && <p className="text-xs text-gray-500 mt-4">{debugInfo}</p>}
      </div>
    </div>
  );
}
