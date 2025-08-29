'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { getSupabaseClient } from '@/lib/supabase/client';

export function EmailPasswordLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError('Invalid email or password');
    } else if (res?.ok) {
      window.location.href = '/';
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email first');
      return;
    }
    setError(null);
    setResetMessage(null);
    setResetLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/magic`,
      });
      if (error) {
        setError(error.message);
      } else {
        setResetMessage('Password reset email sent. Check your inbox.');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to send reset email');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 w-full">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@acme.com"
          className="w-full rounded-md border px-3 py-2"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {resetMessage && <p className="text-sm text-green-700">{resetMessage}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign In'}
      </Button>
      <button
        type="button"
        onClick={handleForgotPassword}
        disabled={resetLoading}
        className="w-full text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
      >
        {resetLoading ? 'Sending reset email…' : 'Forgot password?'}
      </button>
    </form>
  );
}
