'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import Container from '@/app/components/layout/Container';

interface ProtectedRouteProps {
  children: ReactNode;
  requireOnboarding?: boolean;
  redirectTo?: string;
  loadingMessage?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireOnboarding = true,
  redirectTo = '/onboarding',
  loadingMessage = 'Loading...'
}) => {
  const { user, profile, isLoading, needsOnboarding } = useUserProfile();
  const router = useRouter();

  useEffect(() => {
    // If loading is finished and there's no user, redirect to login
    if (!isLoading && !user) {
      router.push('/login');
      return;
    }

    // If loading is finished and there's no profile, redirect to login
    if (!isLoading && user && !profile) {
      router.push('/login');
      return;
    }

    // If onboarding is required and user needs onboarding, redirect
    if (!isLoading && profile && requireOnboarding && needsOnboarding) {
      console.log(`Redirecting to ${redirectTo} - onboarding required`);
      router.push(redirectTo);
      return;
    }
  }, [isLoading, user, profile, needsOnboarding, requireOnboarding, redirectTo, router]);

  // Show loading state while checking authentication and onboarding
  if (isLoading || !user || !profile || (requireOnboarding && needsOnboarding)) {
    return (
      <Container>
        <p style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
          {loadingMessage}
        </p>
      </Container>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;