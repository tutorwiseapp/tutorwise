/**
 * Filename: apps/web/src/app/(authenticated)/account/students/[studentId]/learning-preferences/page.tsx
 * Purpose: Student Learning Preferences tab - Educational preferences for linked student (Guardian Link v5.0)
 * Created: 2026-02-08
 * Pattern: Adapted from professional-info page, stores preferences in student's role_details as 'client' type
 */
'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import ProfessionalInfoForm from '@/app/components/feature/account/ProfessionalInfoForm';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import AccountCard from '@/app/components/feature/account/AccountCard';
import AccountHelpWidget from '@/app/components/feature/account/AccountHelpWidget';
import { HubPageLayout, HubTabs, HubHeader } from '@/app/components/hub/layout';
import type { HubTab } from '@/app/components/hub/layout';
import Button from '@/app/components/ui/actions/Button';
import type { Profile } from '@/types';
import toast from 'react-hot-toast';
import styles from './page.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

async function getStudentProfile(studentId: string): Promise<Profile> {
  const response = await fetch(`/api/profiles/${studentId}`);
  if (!response.ok) throw new Error('Failed to fetch student profile');
  const data = await response.json();
  return data.profile;
}

export default function StudentLearningPreferencesPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params?.studentId as string;
  const { profile: _guardianProfile } = useUserProfile();
  const queryClient = useQueryClient();
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Fetch student profile
  const {
    data: studentProfile,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['student-profile', studentId],
    queryFn: () => getStudentProfile(studentId),
    enabled: !!studentId,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });

  const handleSave = async (updatedProfile: Partial<Profile>) => {
    try {
      // Students are always 'client' role - save their learning preferences
      if (updatedProfile.professional_details?.client) {
        // Update student's role_details (client preferences)
        const response = await fetch(`/api/role-details/${studentId}/client`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedProfile.professional_details.client),
        });

        if (!response.ok) {
          throw new Error('Failed to update student learning preferences');
        }
      }

      // Invalidate and refetch student profile
      await queryClient.invalidateQueries({ queryKey: ['student-profile', studentId] });
      await refetch();

      toast.success('Learning preferences updated successfully');

    } catch (error) {
      console.error('Error updating student learning preferences:', error);
      toast.error('Failed to update learning preferences');
      throw error;
    }
  };

  // Action handlers
  const handleBackToStudents = () => {
    router.push('/account/students/my-students');
  };

  const handleBookSession = () => {
    setShowActionsMenu(false);
    router.push('/marketplace');
  };

  const handleViewBookings = () => {
    setShowActionsMenu(false);
    router.push(`/account/students/${studentId}/bookings`);
  };

  // Prepare tabs data
  const tabs: HubTab[] = [
    { id: 'overview', label: 'Overview', active: false },
    { id: 'learning-preferences', label: 'Learning Preferences', active: true },
    { id: 'bookings', label: 'Bookings', active: false },
    { id: 'settings', label: 'Settings', active: false },
  ];

  const handleTabChange = (tabId: string) => {
    router.push(`/account/students/${studentId}/${tabId}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <HubPageLayout
        header={<HubHeader title="Learning Preferences" />}
        tabs={<HubTabs tabs={tabs} onTabChange={handleTabChange} />}
        sidebar={
          <HubSidebar>
            <AccountCard />
            <AccountHelpWidget
              title="Learning Preferences"
              description="Customize learning preferences to match your student with the best tutors."
              tips={[
                'Select subjects and levels they need help with',
                'Choose preferred delivery modes (online/in-person)',
                'Set budget expectations for sessions',
              ]}
            />
          </HubSidebar>
        }
      >
        <div className={styles.loading}>Loading learning preferences...</div>
      </HubPageLayout>
    );
  }

  // Error state
  if (error || !studentProfile) {
    return (
      <HubPageLayout
        header={<HubHeader title="Learning Preferences" />}
        tabs={<HubTabs tabs={tabs} onTabChange={handleTabChange} />}
        sidebar={
          <HubSidebar>
            <AccountCard />
            <AccountHelpWidget
              title="Learning Preferences"
              description="Customize learning preferences to match your student with the best tutors."
              tips={[
                'Select subjects and levels they need help with',
                'Choose preferred delivery modes (online/in-person)',
                'Set budget expectations for sessions',
              ]}
            />
          </HubSidebar>
        }
      >
        <div className={styles.error}>
          <p>Failed to load student profile</p>
          <Button variant="secondary" onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      </HubPageLayout>
    );
  }

  return (
    <HubPageLayout
      header={
        <HubHeader
          title={`Learning Preferences: ${studentProfile.full_name || 'Unknown'}`}
          actions={
            <>
              {/* Back Button */}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleBackToStudents}
              >
                ← Back to My Students
              </Button>

              {/* Primary Action: Book Session */}
              <Button
                variant="primary"
                size="sm"
                onClick={handleBookSession}
              >
                Book Session
              </Button>

              {/* Secondary Actions: Dropdown Menu */}
              <div className={actionStyles.dropdownContainer}>
                <Button
                  variant="secondary"
                  size="sm"
                  square
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                >
                  ⋮
                </Button>

                {showActionsMenu && (
                  <>
                    {/* Backdrop to close menu */}
                    <div
                      className={actionStyles.backdrop}
                      onClick={() => setShowActionsMenu(false)}
                    />

                    {/* Dropdown Menu */}
                    <div className={actionStyles.dropdownMenu}>
                      <button
                        onClick={handleViewBookings}
                        className={actionStyles.menuButton}
                      >
                        View All Bookings
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          }
        />
      }
      tabs={<HubTabs tabs={tabs} onTabChange={handleTabChange} />}
      sidebar={
        <HubSidebar>
          <AccountCard />
          <AccountHelpWidget
            title="Learning Preferences"
            description="Customize learning preferences to match your student with the best tutors."
            tips={[
              'Select subjects and levels they need help with',
              'Choose preferred delivery modes (online/in-person)',
              'Set budget expectations for sessions',
            ]}
          />
        </HubSidebar>
      }
    >
      <div className={styles.content}>
        <ProfessionalInfoForm
          profile={studentProfile}
          onSave={handleSave}
          activeRole="client"
        />
      </div>
    </HubPageLayout>
  );
}
