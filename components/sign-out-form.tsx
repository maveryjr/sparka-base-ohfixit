"use client";

import { signOut } from 'next-auth/react';

export const SignOutForm = () => {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/' })}
      className="w-full text-left px-1 py-0.5 text-red-500"
    >
      Sign out
    </button>
  );
};
