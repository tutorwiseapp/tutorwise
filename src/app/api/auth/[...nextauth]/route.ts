/*
 * Filename: src/app/api/auth/[...nextauth]/route.ts
 * Purpose: The core API endpoint for NextAuth.js, handling all authentication flows.
 *
 * Change History:
 * C005 - 2025-07-23 : 01:15 - Provided the definitive and correct SupabaseAdapter configuration.
 * C004 - 2025-07-23 : 01:00 - Finalized and corrected the NextAuth.js implementation.
 * ... (previous history)
 *
 * Last Modified: 2025-07-23 : 01:15
 * Requirement ID (optional): VIN-M-01
 *
 * Change Summary:
 * The `SupabaseAdapter` configuration has been definitively corrected. It now includes both the
 * `url` and `secret` properties, as required by the library's type definitions. This resolves
 * the critical "Property 'secret' is missing" build error and makes the adapter fully functional.
 *
 * Impact Analysis:
 * This change fixes the final build blocker for the NextAuth.js migration.
 *
 * Dependencies: "next-auth", "@auth/supabase-adapter", "next-auth/providers/google", "@supabase/supabase-js".
 */
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { SupabaseAdapter } from '@auth/supabase-adapter';
import { createClient } from '@supabase/supabase-js';
import type { Adapter } from 'next-auth/adapters';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  // --- THIS IS THE FINAL, CORRECT CONFIGURATION ---
  adapter: SupabaseAdapter({
    url: process.env.SUPABASE_POSTGRES_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!, // This was the missing property
  }) as Adapter,
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id, agent_id')
          .eq('id', user.id)
          .single();

        if (profile) {
          (session.user as any).id = profile.id;
          (session.user as any).agent_id = profile.agent_id;
        }
      }
      return session;
    },
  },
  events: {
    createUser: async ({ user }) => {
      const nameParts = user.name?.split(' ') || ['New', 'User'];
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');
      const initials = (firstName.charAt(0) + (lastName.charAt(0) || '')).toUpperCase();
      const agentId = `A1-${initials}${Math.floor(100000 + Math.random() * 900000)}`;

      await supabaseAdmin
        .from('profiles')
        .insert({
          id: user.id,
          first_name: firstName,
          last_name: lastName,
          display_name: user.name,
          agent_id: agentId,
          roles: ['agent'],
          custom_picture_url: user.image
        });
    }
  },
});

export { handler as GET, handler as POST };