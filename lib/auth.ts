import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth-options';
import { signIn, signOut } from 'next-auth/react';

export { authOptions };

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user;
}

export { signIn, signOut, getServerSession };
