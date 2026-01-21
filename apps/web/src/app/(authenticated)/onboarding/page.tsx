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
            <div className={styles.roleIconWrapper}>
              <svg className={styles.roleIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Book outline */}
                <path d="M5 18.5C5 17.837 5.26339 17.2011 5.73223 16.7322C6.20107 16.2634 6.83696 16 7.5 16H19" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7.5 3H19V21H7.5C6.83696 21 6.20107 20.7366 5.73223 20.2678C5.26339 19.7989 5 19.163 5 18.5V5.5C5 4.83696 5.26339 4.20107 5.73223 3.73223C6.20107 3.26339 6.83696 3 7.5 3Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                {/* Page lines */}
                <line x1="10" y1="7" x2="16" y2="7" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
                <line x1="10" y1="10" x2="16" y2="10" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
                <line x1="10" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
              </svg>
            </div>
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
            <div className={styles.roleIconWrapper}>
              <svg className={styles.roleIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 9.5L12 5L21 9.5L12 14L3 9.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 9.5V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M7 12V16.5C7 16.5 9 19.5 12 19.5C15 19.5 17 16.5 17 16.5V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
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
            <div className={styles.roleIconWrapper}>
              <svg className={styles.roleIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 3H10V21H4V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 8H20V21H10V8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="6" y="6" width="1.5" height="1.5" fill="currentColor"/>
                <rect x="6" y="10" width="1.5" height="1.5" fill="currentColor"/>
                <rect x="6" y="14" width="1.5" height="1.5" fill="currentColor"/>
                <rect x="6" y="18" width="1.5" height="1.5" fill="currentColor"/>
                <rect x="13" y="10" width="1.5" height="1.5" fill="currentColor"/>
                <rect x="16.5" y="10" width="1.5" height="1.5" fill="currentColor"/>
                <rect x="13" y="14" width="1.5" height="1.5" fill="currentColor"/>
                <rect x="16.5" y="14" width="1.5" height="1.5" fill="currentColor"/>
                <rect x="13" y="18" width="1.5" height="1.5" fill="currentColor"/>
                <rect x="16.5" y="18" width="1.5" height="1.5" fill="currentColor"/>
              </svg>
            </div>
            <h3 className={styles.roleTitle}>Agent</h3>
            <p className={styles.roleDescription}>
              Manage educational services and grow your business
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
