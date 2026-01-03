/**
 * Filename: /organisation/tasks/page.tsx
 * Purpose: Redirect to user's organisation tasks page
 * Created: 2026-01-03
 * Pattern: Fetches user's organisation and redirects to /organisation/[id]/tasks
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { getMyOrganisation } from '@/lib/api/organisation';

export default function OrganisationTasksRedirect() {
  const router = useRouter();
  const { profile, isLoading: profileLoading } = useUserProfile();

  const {
    data: organisation,
    isLoading: orgLoading,
    error,
  } = useQuery({
    queryKey: ['my-organisation', profile?.id],
    queryFn: getMyOrganisation,
    enabled: !!profile?.id,
  });

  useEffect(() => {
    if (!profileLoading && !orgLoading) {
      if (organisation?.id) {
        // Redirect to the organisation's tasks page
        router.replace(`/organisation/${organisation.id}/tasks`);
      } else if (error || !organisation) {
        // No organisation found, redirect to organisation page to create one
        router.replace('/organisation');
      }
    }
  }, [organisation, profileLoading, orgLoading, error, router]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p>Loading...</p>
    </div>
  );
}
