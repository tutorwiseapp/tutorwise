'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext'; // Use Supabase context
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import Breadcrumb from '@/app/components/ui/nav/Breadcrumb';

const ChangePasswordPage = () => {
  const { profile, isLoading } = useUserProfile();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !profile) {
      router.push('/login');
    }
  }, [isLoading, profile, router]);

  if (isLoading || !profile) {
      return <Container><p>Loading...</p></Container>;
  }

  const breadcrumbs = [
    { label: 'Settings', href: '/settings' },
    { label: 'Change Password' }
  ];

  return (
    <Container variant="form">
      <Breadcrumb crumbs={breadcrumbs} />
      <PageHeader
        title="Change Password"
        subtitle="To change your password, please use the password reset flow."
      />
      <Card>
        <p style={{ marginBottom: '1.5rem', lineHeight: '1.6' }}>
          Supabase handles password resets via a secure email link. To change your password, please log out and use the "Forgot Password" link on the login page.
        </p>
        {/* Supabase doesn't have a direct link to a settings page like Kinde */}
      </Card>
    </Container>
  );
};

export default ChangePasswordPage;