'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import OnboardingWizard from '@/app/components/onboarding/OnboardingWizard';
import styles from './page.module.css';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, isLoading, needsOnboarding } = useUserProfile();

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
      <Container>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading...</p>
        </div>
      </Container>
    );
  }

  // Don't render onboarding if user is not authenticated
  if (!user) {
    return null;
  }

  return (
    <Container>
      <PageHeader
        title="Welcome to Tutorwise"
        subtitle="Let's set up your profile to get started"
      />
      <OnboardingWizard />
    </Container>
  );
}