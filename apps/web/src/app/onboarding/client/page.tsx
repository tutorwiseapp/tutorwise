'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import OnboardingWizard from '@/app/components/onboarding/OnboardingWizard';

export default function ClientOnboardingPage() {
  const router = useRouter();
  const { user, profile, isLoading, needsOnboarding } = useUserProfile();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoading && !user) {
      router.push('/login?redirect=/onboarding/client');
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
          <p className="mt-4 text-gray-600">Loading your profile...</p>
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
          {/* Client-specific onboarding header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome to Tutorwise
            </h1>
            <p className="text-lg text-gray-600">
              Let&apos;s set up your profile to get started
            </p>
          </div>

          <OnboardingWizard />
        </div>
      </div>
    </div>
  );
}