/**
 * Filename: apps/web/src/app/(authenticated)/account/students/[studentId]/overview/page.tsx
 * Purpose: Student Overview tab - Personal information for linked student (Guardian Link v5.0)
 * Created: 2026-02-08
 * Pattern: Adapted from personal-info page, fetches student profile by studentId
 */
'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { updateProfile } from '@/lib/api/profiles';
import PersonalInfoForm from '@/app/components/feature/account/PersonalInfoForm';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import AccountCard from '@/app/components/feature/account/AccountCard';
import AccountHelpWidget from '@/app/components/feature/account/AccountHelpWidget';
import StudentProfileCard from '@/app/components/feature/students/StudentProfileCard';
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

export default function StudentOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params?.studentId as string;
  const { profile: guardianProfile } = useUserProfile();
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
      // Update student profile with studentId
      const response = await fetch(`/api/profiles/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProfile),
      });

      if (!response.ok) {
        throw new Error('Failed to update student profile');
      }

      // Invalidate and refetch student profile
      await queryClient.invalidateQueries({ queryKey: ['student-profile', studentId] });
      await refetch();

      toast.success('Student profile updated successfully');
    } catch (error) {
      console.error('Error updating student profile:', error);
      toast.error('Failed to update student profile');
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

  const handleRemoveStudent = () => {
    setShowActionsMenu(false);
    // Redirect to settings page where remove functionality is implemented
    router.push(`/account/students/${studentId}/settings`);
  };

  // Prepare tabs data
  const tabs: HubTab[] = [
    { id: 'overview', label: 'Overview', active: true },
    { id: 'learning-preferences', label: 'Learning Preferences', active: false },
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
        header={<HubHeader title="Student Overview" />}
        tabs={<HubTabs tabs={tabs} onTabChange={handleTabChange} />}
        sidebar={
          <HubSidebar>
            <AccountCard />
            <AccountHelpWidget
              title="Student Profile"
              description="Manage your student's personal information and learning preferences."
              tips={[
                'Keep contact information up to date',
                'Update learning preferences to match tutors',
                'View booking history in the Bookings tab',
              ]}
            />
          </HubSidebar>
        }
      >
        <div className={styles.loading}>Loading student profile...</div>
      </HubPageLayout>
    );
  }

  // Error state
  if (error || !studentProfile) {
    return (
      <HubPageLayout
        header={<HubHeader title="Student Overview" />}
        tabs={<HubTabs tabs={tabs} onTabChange={handleTabChange} />}
        sidebar={
          <HubSidebar>
            <AccountCard />
            <AccountHelpWidget
              title="Student Profile"
              description="Manage your student's personal information and learning preferences."
              tips={[
                'Keep contact information up to date',
                'Update learning preferences to match tutors',
                'View booking history in the Bookings tab',
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
          title={`Student Profile: ${studentProfile.full_name || 'Unknown'}`}
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
                      <button
                        onClick={handleRemoveStudent}
                        className={actionStyles.menuButton}
                      >
                        Remove Student Link
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
          <StudentProfileCard
            studentName={studentProfile.full_name || 'Unknown'}
            studentEmail={studentProfile.email || ''}
            avatarUrl={studentProfile.avatar_url}
            dateOfBirth={studentProfile.date_of_birth}
            linkedSince={studentProfile.created_at || new Date().toISOString()}
          />
          <AccountHelpWidget
            title="Student Profile"
            description="Manage your student's personal information and learning preferences."
            tips={[
              'Keep contact information up to date',
              'Update learning preferences to match tutors',
              'View booking history in the Bookings tab',
            ]}
          />
        </HubSidebar>
      }
    >
      <div className={styles.content}>
        <PersonalInfoForm profile={studentProfile} onSave={handleSave} />
      </div>
    </HubPageLayout>
  );
}
