import NextAuth, { type User, type Session } from 'next-auth';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';

import { getUserByEmail, createUser } from '@/lib/db/queries';

import { authConfig } from './auth.config';

interface ExtendedSession extends Session {
  user: User;
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || !profile || !user?.email) {
        console.log(
          'Auth provider details missing (account, profile, or user email).',
        );
        return false;
      }

      const { email, name, image } = user;

      try {
        const existingUserArray = await getUserByEmail(email);

        if (existingUserArray.length === 0) {
          await createUser({
            email,
            name: name ?? null,
            image: image ?? null,
          });
          console.log(`Created new user: ${email}`);
        } else {
          console.log(`User already exists: ${email}`);
        }
        return true;
      } catch (error) {
        console.error('Error during signIn DB operations:', error);
        return false;
      }
    },
    async jwt({ token, user, account, profile }) {
      if (user?.email) {
        try {
          const dbUserArray = await getUserByEmail(user.email);
          if (dbUserArray.length > 0) {
            token.id = dbUserArray[0].id;
          } else {
            console.error(
              `User not found in DB during jwt callback: ${user.email}`,
            );
          }
        } catch (error) {
          console.error('Error fetching user during jwt callback:', error);
        }
      }
      return token;
    },
    async session({
      session,
      token,
    }: {
      session: ExtendedSession;
      token: { id?: string; [key: string]: any };
    }) {
      if (session.user && token.id) {
        session.user.id = token.id;
      } else if (!token.id) {
        console.error('Token ID missing in session callback');
      }
      return session;
    },
  },
});
