'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import OnboardingWizard from '@/app/components/onboarding/OnboardingWizard';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, isLoading, needsOnboarding } = useUserProfile();
  const supabase = createClient();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoading && !user) {
      router.push('/login?redirect=/onboarding');
      return;
    }

    // Redirect to dashboard if onboarding is already complete
    if (!isLoading && profile && !needsOnboarding) {
      router.push('/dashboard');
      return;
    }
  }, [user, profile, isLoading, needsOnboarding, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render onboarding if user is not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <OnboardingWizard />
        </div>
      </div>
    </div>
  );
}