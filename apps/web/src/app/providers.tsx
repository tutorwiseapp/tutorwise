/*
 * Filename: src/app/providers.tsx
 * Purpose: A dedicated Client Component to wrap the application with client-side context providers.
 */
'use client';

import { UserProfileProvider } from './contexts/UserProfileContext';
import OnboardingProvider from './components/onboarding/OnboardingProvider';
import React from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UserProfileProvider>
      <OnboardingProvider>
        {children}
      </OnboardingProvider>
    </UserProfileProvider>
  );
}