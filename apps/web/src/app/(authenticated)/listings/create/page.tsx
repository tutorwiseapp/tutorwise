/**
 * Filename: src/app/(authenticated)/listings/create/page.tsx
 * Purpose: Smart redirect to appropriate listing creation form based on user role
 * Created: 2026-01-19
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';

export default function CreateListingRedirect() {
  const router = useRouter();
  const { activeRole, isLoading } = useUserProfile();

  useEffect(() => {
    if (isLoading) return;

    // Role-based redirect
    if (activeRole === 'client') {
      router.replace('/listings/create/request');
    } else if (activeRole === 'tutor' || activeRole === 'agent' || activeRole === 'admin') {
      router.replace('/listings/create/one-to-one');
    } else {
      // Fallback to main listings page
      router.replace('/listings');
    }
  }, [activeRole, isLoading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
