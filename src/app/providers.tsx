/*
 * Filename: src/app/providers.tsx
 * Purpose: A dedicated Client Component to wrap the application with client-side context providers.
 */
'use client';

import { KindeProvider } from '@kinde-oss/kinde-auth-nextjs';
import { UserProfileProvider } from './contexts/UserProfileContext'; // --- THIS IS THE FIX ---
import React from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <KindeProvider>
      {/* --- THIS IS THE FIX: The UserProfileProvider now wraps the application --- */}
      <UserProfileProvider>
        {children}
      </UserProfileProvider>
    </KindeProvider>
  );
}