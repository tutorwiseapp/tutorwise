/**
 * Filename: /organisation/settings/page.tsx
 * Purpose: Redirect to organisation settings/billing page
 * Created: 2026-01-07
 * Updated: 2026-01-08 - Changed default from general to billing after removing General Settings page
 * Pattern: Fetches user's organisation and redirects to /organisations/settings/billing
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useQuery } from '@tanstack/react-query';
import { getMyOrganisation } from '@/lib/api/organisation';
import styles from './page.module.css';

export default function OrganisationSettingsRedirect() {
  const router = useRouter();
  const { profile, isLoading: profileLoading } = useUserProfile();

  const {
    data: organisation,
    isLoading: orgLoading,
    error,
  } = useQuery({
    queryKey: ['organisation', profile?.id],
    queryFn: getMyOrganisation,
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!profileLoading && !orgLoading) {
      if (organisation?.id) {
        // Redirect to the billing settings page (default tab)
        router.replace('/organisations/settings/billing');
      } else if (error || !organisation) {
        // No organisation found, redirect to organisation page to create one
        router.replace('/organisation');
      }
    }
  }, [organisation, profileLoading, orgLoading, error, router]);

  return (
    <div className={styles.loading}>
      <div className={styles.spinner} />
      <p>Loading organisation settings...</p>
    </div>
  );
}
