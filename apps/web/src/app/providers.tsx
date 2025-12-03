/*
 * Filename: src/app/providers.tsx
 * Purpose: A dedicated Client Component to wrap the application with client-side context providers.
 * Updated: 2025-11-08 - Added React Query provider and Error Boundary
 */
'use client';

import { UserProfileProvider } from './contexts/UserProfileContext';
import QueryProvider from './providers/QueryProvider';
import ErrorBoundary from '@/app/components/ui/feedback/ErrorBoundary';
import React from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <UserProfileProvider>
          {children}
        </UserProfileProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}