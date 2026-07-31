// NextAuth configuration. Imported by pages/api/auth/[...nextauth].js.
// We use the Credentials provider backed by the `profiles` table.
// Google is wired up but only enabled if the env vars are set.

import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from './supabase';

const providers = [
  CredentialsProvider({
    name: 'Email & password',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      const email = credentials?.email?.toLowerCase().trim();
      const password = credentials?.password;
      if (!email || !password) return null;

      const supabase = getSupabaseAdmin();
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, email, name, password_hash, is_admin')
        .eq('email', email)
        .maybeSingle();
      if (error || !profile || !profile.password_hash) return null;

      const ok = await bcrypt.compare(password, profile.password_hash);
      if (!ok) return null;

      return {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        isAdmin: profile.is_admin,
      };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

export const authOptions = {
  providers,
  session: { strategy: 'jwt' },
  pages: { signIn: '/auth/signin' },
  callbacks: {
    async signIn({ user, account }) {
      // Auto-provision a profile row for OAuth users.
      if (account?.provider !== 'credentials' && user?.email) {
        const supabase = getSupabaseAdmin();
        const { data: existing } = await supabase
          .from('profiles')
          .select('id, is_admin')
          .eq('email', user.email.toLowerCase())
          .maybeSingle();
        if (!existing) {
          await supabase.from('profiles').insert({
            email: user.email.toLowerCase(),
            name: user.name || null,
          });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      // First sign-in: copy fields onto token.
      if (user) {
        token.id = user.id;
        token.isAdmin = user.isAdmin || false;
      }
      // Look up admin flag on every request so promotions take effect.
      if (token?.email) {
        const supabase = getSupabaseAdmin();
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, is_admin, name')
          .eq('email', token.email.toLowerCase())
          .maybeSingle();
        if (profile) {
          token.id = profile.id;
          token.isAdmin = profile.is_admin;
          if (profile.name) token.name = profile.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.isAdmin = token.isAdmin || false;
        session.user.name = token.name ?? session.user.name ?? null;
        session.user.email = token.email ?? session.user.email ?? null;
      }
      return session;
    },
  },
};
