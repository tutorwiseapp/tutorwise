/*
 * Filename: src/app/providers.tsx
 * Purpose: A dedicated Client Component to wrap the application with client-side context providers.
 * Change History:
 * C001 - 2025-08-31 : 19:00 - Initial creation.
 * Last Modified: 2025-08-31 : 19:00
 * Requirement ID: VIN-AUTH-MIG-05
 * Change Summary: This component was created to resolve the `createContext is not a function` build error. By isolating the <KindeProvider> within a dedicated Client Component, we create a stable boundary between the server-rendered root layout and the client-side context, which is the standard architectural pattern for the Next.js App Router.
 */
'use client';

import { KindeProvider } from '@kinde-oss/kinde-auth-nextjs';
import React from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  return <KindeProvider>{children}</KindeProvider>;
}