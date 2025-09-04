import NextAuth, { type User, type Session } from 'next-auth';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import Credentials from 'next-auth/providers/credentials';

import { getUserByEmail, createUser } from '@/lib/db/queries';

import { authConfig } from './auth.config';
import { createClient } from '@supabase/supabase-js';

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
    Credentials({
      id: 'credentials',
      name: 'Email and Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        accessToken: { label: 'Access Token', type: 'text' },
      },
      async authorize(credentials) {
        try {
          const email = credentials?.email as string | undefined;
          const password = credentials?.password as string | undefined;
          const magicAccessToken = credentials?.accessToken as string | undefined;

          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
          const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
          if (!supabaseUrl || !supabaseAnonKey) {
            console.error('Supabase env vars are missing');
            return null;
          }
          const supabase = createClient(supabaseUrl, supabaseAnonKey);

          // Case 1: Magic/Recovery access token from Supabase
          if (magicAccessToken) {
            const { data: userData, error: userErr } = await supabase.auth.getUser(magicAccessToken);
            if (userErr || !userData?.user?.email) {
              console.error('Supabase getUser(accessToken) failed:', userErr?.message);
              return null;
            }
            const supaUser = userData.user;
            const supaEmail = supaUser.email ?? null;
            if (!supaEmail) {
              console.error('Supabase user missing email');
              return null;
            }
            const existingUserArray = await getUserByEmail(supaEmail);
            if (existingUserArray.length === 0) {
              await createUser({
                email: supaEmail,
                name: supaUser.user_metadata?.full_name ?? null,
                image: supaUser.user_metadata?.avatar_url ?? null,
              });
            }
            const user: User = {
              id: existingUserArray[0]?.id ?? supaUser.id,
              email: supaEmail,
              name: supaUser.user_metadata?.full_name ?? null,
              image: supaUser.user_metadata?.avatar_url ?? null,
            } as unknown as User;
            return user;
          }

          // Case 2: Traditional email/password login
          if (!email || !password) return null;
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error || !data.user) {
            console.error('Supabase signInWithPassword failed:', error?.message);
            return null;
          }

          // Ensure user exists in our DB as well
          const existingUserArray = await getUserByEmail(email);
          if (existingUserArray.length === 0) {
            await createUser({
              email,
              name: data.user.user_metadata?.full_name ?? null,
              image: data.user.user_metadata?.avatar_url ?? null,
            });
          }

          const user: User = {
            id: existingUserArray[0]?.id ?? data.user.id,
            email,
            name: data.user.user_metadata?.full_name ?? null,
            image: data.user.user_metadata?.avatar_url ?? null,
          } as unknown as User;
          return user;
        } catch (e) {
          console.error('Credentials authorize error:', e);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Allow credentials provider where profile is undefined
      if (account?.provider === 'credentials') {
        return !!user?.email;
      }
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
        
        // Refresh user data from database to get latest name
        try {
          const dbUserArray = await getUserByEmail(session.user.email!);
          if (dbUserArray.length > 0) {
            session.user.name = dbUserArray[0].name;
            session.user.image = dbUserArray[0].image;
          }
        } catch (error) {
          console.error('Error refreshing user data in session callback:', error);
        }
      } else if (!token.id) {
        console.error('Token ID missing in session callback');
      }
      return session;
    },
  },
});
