/**
 * Filename: apps/web/src/app/(authenticated)/account/students/[studentId]/settings/page.tsx
 * Purpose: Student Settings tab - Manage guardian link settings (Guardian Link v5.0)
 * Created: 2026-02-08
 * TODO: Implement link management (remove link, notification preferences, etc.)
 */
'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import AccountCard from '@/app/components/feature/account/AccountCard';
import AccountHelpWidget from '@/app/components/feature/account/AccountHelpWidget';
import { HubPageLayout, HubTabs, HubHeader } from '@/app/components/hub/layout';
import type { HubTab } from '@/app/components/hub/layout';
import Button from '@/app/components/ui/actions/Button';
import toast from 'react-hot-toast';
import styles from './page.module.css';

interface StudentLink {
  id: string;
  student_id: string;
  guardian_id: string;
  status: string;
  created_at: string;
}

async function getStudentLink(studentId: string): Promise<StudentLink | null> {
  const response = await fetch('/api/links/client-student');
  if (!response.ok) throw new Error('Failed to fetch students');
  const data = await response.json();
  const links = data.students || [];
  return links.find((link: any) => link.student_id === studentId) || null;
}

export default function StudentSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params?.studentId as string;
  const { profile } = useUserProfile();
  const [isRemoving, setIsRemoving] = useState(false);

  // Fetch the link to get linkId
  const { data: link, isLoading } = useQuery({
    queryKey: ['student-link', studentId],
    queryFn: () => getStudentLink(studentId),
    enabled: !!studentId,
  });

  const tabs: HubTab[] = [
    { id: 'overview', label: 'Overview', active: false },
    { id: 'learning-preferences', label: 'Learning Preferences', active: false },
    { id: 'bookings', label: 'Bookings', active: false },
    { id: 'settings', label: 'Settings', active: true },
  ];

  const handleTabChange = (tabId: string) => {
    router.push(`/account/students/${studentId}/${tabId}`);
  };

  const handleBackToStudents = () => {
    router.push('/account/students/my-students');
  };

  const handleRemoveStudent = async () => {
    if (!link) {
      toast.error('Student link not found');
      return;
    }

    if (!confirm('Are you sure you want to remove this student link? The student\'s account will remain active, but you will no longer be able to book sessions on their behalf.')) {
      return;
    }

    setIsRemoving(true);
    try {
      const response = await fetch(`/api/links/client-student/${link.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.details?.active_bookings) {
          toast.error(
            `Cannot remove link: ${data.details.active_bookings} active booking(s). Please cancel or complete them first.`,
            { duration: 5000 }
          );
        } else {
          throw new Error(data.error || 'Failed to remove student link');
        }
        return;
      }

      toast.success('Student link removed successfully');

      // Redirect back to My Students after removal
      setTimeout(() => {
        router.push('/account/students/my-students');
      }, 1000);
    } catch (error) {
      console.error('Error removing student link:', error);
      toast.error('Failed to remove student link');
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Student Settings"
          actions={
            <Button variant="secondary" size="sm" onClick={handleBackToStudents}>
              ← Back to My Students
            </Button>
          }
        />
      }
      tabs={<HubTabs tabs={tabs} onTabChange={handleTabChange} />}
      sidebar={
        <HubSidebar>
          <AccountCard />
          <AccountHelpWidget
            title="Link Settings"
            description="Manage your guardian link with this student."
            tips={[
              'Remove link if no longer needed',
              'Student account remains active after removal',
              'You can re-invite students anytime',
            ]}
          />
        </HubSidebar>
      }
    >
      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.loading}>Loading settings...</div>
        ) : !link ? (
          <div className={styles.error}>
            <p>Student link not found</p>
            <Button variant="secondary" onClick={handleBackToStudents}>
              Back to My Students
            </Button>
          </div>
        ) : (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Guardian Link</h3>
            <p className={styles.sectionDescription}>
              You are linked as a guardian to this student. You can book sessions on their behalf and manage their learning preferences.
            </p>
            <div className={styles.linkInfo}>
              <p><strong>Status:</strong> Active</p>
              <p><strong>Linked Since:</strong> {new Date(link.created_at).toLocaleDateString('en-GB', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</p>
            </div>

            <div className={styles.dangerZone}>
              <h4 className={styles.dangerTitle}>Remove Student Link</h4>
              <p className={styles.dangerDescription}>
                Removing this link will prevent you from booking sessions on behalf of this student. The student's account will remain active.
              </p>
              <p className={styles.dangerWarning}>
                ⚠️ You cannot remove this link if there are active bookings. Cancel or complete all bookings first.
              </p>
              <Button
                variant="danger"
                onClick={handleRemoveStudent}
                disabled={isRemoving}
              >
                {isRemoving ? 'Removing...' : 'Remove Student Link'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </HubPageLayout>
  );
}
