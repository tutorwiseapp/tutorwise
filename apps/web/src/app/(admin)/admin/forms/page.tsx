/*
 * Filename: src/app/(admin)/admin/forms/page.tsx
 * Purpose: Redirect to default Forms sub-page (Onboarding Tutor)
 * Created: 2026-01-12
 * Updated: 2026-01-12 - Converted to redirect (no landing page needed)
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function FormsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to Onboarding Forms (Tutor tab) by default
    router.replace('/admin/forms/onboarding?role=tutor');
  }, [router]);

  // Return null or a minimal loading state while redirecting
  return null;
}
