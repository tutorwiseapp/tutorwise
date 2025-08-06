/*
 * Filename: src/types/next-auth.d.ts
 * Purpose: Extends the default NextAuth.js types to include our custom user profile data.
 *
 * Change History:
 * C001 - 2025-07-23 : 00:00 - Initial creation.
 *
 * Last Modified: 2025-07-23 : 00:00
 * Requirement ID (optional): VIN-M-01.5
 *
 * Change Summary:
 * This file uses TypeScript's module augmentation to add our custom fields (like `id` and `agent_id`)
 * to NextAuth's default `User` and `Session` interfaces. This is the official pattern to
 * ensure our custom session data is fully type-safe throughout the application.
 *
 * Impact Analysis:
 * This is a critical type definition file for the NextAuth.js integration.
 */
import NextAuth, { DefaultSession, DefaultUser } from 'next-auth';

declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string; // Add the user's database ID
      agent_id: string; // Add our custom agent_id
    } & DefaultSession['user']; // Keep the default properties
  }

  // We are also extending the User model that the adapter works with
  interface User extends DefaultUser {
    agent_id: string;
  }
}