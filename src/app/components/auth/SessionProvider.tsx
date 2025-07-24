/*
 * Filename: src/app/components/auth/SessionProvider.tsx
 * Purpose: Provides the NextAuth.js session context to the entire application.
 *
 * Change History:
 * C001 - 2025-07-22 : 23:00 - Initial creation.
 *
 * Last Modified: 2025-07-22 : 23:00
 * Requirement ID (optional): VIN-M-01
 *
 * Change Summary:
 * Created a new client-side provider component that wraps the application in NextAuth's
 * official <SessionProvider>. This is the new entry point for providing auth state.
 *
 * Impact Analysis:
 * This component will replace the old custom AuthProvider in the root layout.
 *
 * Dependencies: "react", "next-auth/react".
 */
'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import React from 'react';

interface SessionProviderProps {
  children: React.ReactNode;
}

const SessionProvider = ({ children }: SessionProviderProps) => {
  return (
    <NextAuthSessionProvider>
      {children}
    </NextAuthSessionProvider>
  );
};

export default SessionProvider;