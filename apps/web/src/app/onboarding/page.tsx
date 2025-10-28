// src/app/onboarding/page.tsx

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import styles from './page.module.css';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, isLoading, availableRoles } = useUserProfile();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoading && !user) {
      router.push('/login?redirect=/onboarding');
      return;
    }

    // If onboarding is complete and user has all roles, redirect to dashboard
    if (!isLoading && profile?.onboarding_progress?.onboarding_completed) {
      const hasAllRoles = availableRoles.length === 3;
      if (hasAllRoles) {
        router.push('/dashboard');
        return;
      }
    }
  }, [user, profile, isLoading, availableRoles, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Don't render onboarding if user is not authenticated
  if (!user) {
    return null;
  }

  // Check which roles are available
  const hasSeeker = availableRoles.includes('client');
  const hasProvider = availableRoles.includes('tutor');
  const hasAgent = availableRoles.includes('agent');

  const handleRoleSelect = (role: 'client' | 'tutor' | 'agent') => {
    const routeMap = {
      client: '/onboarding/client',
      tutor: '/onboarding/tutor',
      agent: '/onboarding/agent'
    };
    router.push(routeMap[role]);
  };

  return (
    <div className={styles.onboardingPage}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Choose Your Path</h1>
          <p className={styles.subtitle}>
            Select the role that best describes what you want to do on Tutorwise
          </p>
        </div>

        <div className={styles.roleCards}>
          {/* Client Card */}
          <button
            onClick={() => !hasSeeker && handleRoleSelect('client')}
            disabled={hasSeeker}
            className={`${styles.roleCard} ${hasSeeker ? styles.disabled : ''}`}
          >
            <div className={styles.roleIcon}>📚</div>
            <h3 className={styles.roleTitle}>Client</h3>
            <p className={styles.roleDescription}>
              Find expert tutors and start your learning journey
            </p>
            {hasSeeker && (
              <div className={styles.badge}>Already enrolled</div>
            )}
          </button>

          {/* Tutor Card */}
          <button
            onClick={() => !hasProvider && handleRoleSelect('tutor')}
            disabled={hasProvider}
            className={`${styles.roleCard} ${hasProvider ? styles.disabled : ''}`}
          >
            <div className={styles.roleIcon}>🎓</div>
            <h3 className={styles.roleTitle}>Tutor</h3>
            <p className={styles.roleDescription}>
              Share your knowledge and earn income teaching others
            </p>
            {hasProvider && (
              <div className={styles.badge}>Already enrolled</div>
            )}
          </button>

          {/* Agent Card */}
          <button
            onClick={() => !hasAgent && handleRoleSelect('agent')}
            disabled={hasAgent}
            className={`${styles.roleCard} ${hasAgent ? styles.disabled : ''}`}
          >
            <div className={styles.roleIcon}>🏠</div>
            <h3 className={styles.roleTitle}>Agent</h3>
            <p className={styles.roleDescription}>
              Manage tutoring services and grow your business
            </p>
            {hasAgent && (
              <div className={styles.badge}>Already enrolled</div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
