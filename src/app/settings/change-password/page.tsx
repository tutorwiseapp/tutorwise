/*
 * Filename: src/app/settings/change-password/page.tsx
 * Purpose: Provides a secure form for users to change their account password, migrated to Kinde.
 * Change History:
 * C007 - 2025-08-26 : 15:00 - Replaced Clerk logic with a redirect to Kinde's hosted settings page.
 * C006 - 2025-07-26 : 23:00 - Replaced useAuth with Clerk's useUser hook.
 * Last Modified: 2025-08-26 : 15:00
 * Requirement ID: VIN-AUTH-MIG-02
 * Change Summary: This component has been migrated from Clerk to Kinde. Since Kinde handles password and security management on its own secure, hosted pages, the local form has been removed. The component now uses the `useKindeBrowserClient` hook to protect the route and provides a simple link that directs the user to the correct Kinde settings page. This is a more secure and simpler pattern that resolves the "Module not found" build error.
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs'; // --- THIS IS THE FIX ---

// VDL Component Imports
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import Breadcrumb from '@/app/components/ui/nav/Breadcrumb';
import Link from 'next/link';

const ChangePasswordPage = () => {
  const { isAuthenticated, isLoading } = useKindeBrowserClient(); // --- THIS IS THE FIX ---
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/api/auth/login'); // --- THIS IS THE FIX ---
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
      return <Container><p>Loading...</p></Container>;
  }

  const breadcrumbs = [
    { label: 'Settings', href: '/settings' },
    { label: 'Change Password' }
  ];

  // --- THIS IS THE FIX: Kinde handles this on its hosted pages ---
  return (
    <Container variant="form">
      <Breadcrumb crumbs={breadcrumbs} />
      <PageHeader
        title="Change Password"
        subtitle="Manage your security settings on Kinde."
      />
      <Card>
        <p style={{ marginBottom: '1.5rem', lineHeight: '1.6' }}>
          To securely manage your password, multi-factor authentication, and other security settings, please proceed to your Kinde account management page.
        </p>
        <a href={process.env.KINDE_ISSUER_URL} target="_blank" rel="noopener noreferrer">
            <Button variant="primary" fullWidth>
                Manage Security Settings
            </Button>
        </a>
      </Card>
    </Container>
  );
};

export default ChangePasswordPage;