'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useRoleGuard } from '@/app/hooks/useRoleGuard';
import { createListing } from '@/lib/api/listings';
import type { CreateListingInput } from '@tutorwise/shared-types';
import toast from 'react-hot-toast';
import WorkshopForm from '@/app/components/feature/listings/create/provider/WorkshopForm';
import styles from '../one-to-one/page.module.css';

export default function CreateWorkshopPage() {
  const router = useRouter();
  const { user, activeRole, profile, isLoading: userLoading } = useUserProfile();
  const { isAllowed, isLoading: roleLoading } = useRoleGuard(['tutor', 'agent']);
  const [isSaving, setIsSaving] = useState(false);
  const [initialData, setInitialData] = useState<Partial<CreateListingInput>>({});
  const [activeTab] = useState<'one-to-one' | 'group-session' | 'workshop' | 'study-package'>('workshop');

  useEffect(() => {
    if (!profile?.professional_details || !activeRole) return;
    const prefillData: Partial<CreateListingInput> = {};
    if (activeRole === 'tutor') {
      const tutorData = profile.professional_details.tutor;
      if (tutorData?.subjects) prefillData.subjects = tutorData.subjects as string[];
    }
    if (activeRole === 'agent') {
      const agentData = profile.professional_details.agent;
      if (agentData?.subject_specializations) prefillData.subjects = agentData.subject_specializations;
    }
    setInitialData(prefillData);
  }, [profile, activeRole]);

  if (userLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/login?redirect=/listings/create/workshop');
    return null;
  }

  if (!isAllowed) return null;

  const handleSubmit = async (data: CreateListingInput) => {
    setIsSaving(true);
    try {
      await createListing(data);
      toast.success('Workshop listing published successfully!');
      localStorage.removeItem('workshop_draft');
      router.push('/listings');
    } catch (error) {
      console.error('Failed to create listing:', error);
      toast.error('Failed to create listing. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTabChange = (tab: string) => {
    router.push(`/listings/create/${tab}`);
  };

  return (
    <div className={styles.createPage}>
      <div className={styles.tabsContainer}>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${activeTab === 'one-to-one' ? styles.tabActive : ''}`} onClick={() => handleTabChange('one-to-one')}>One-to-One</button>
          <button className={`${styles.tab} ${activeTab === 'group-session' ? styles.tabActive : ''}`} onClick={() => handleTabChange('group-session')}>Group Session</button>
          <button className={`${styles.tab} ${activeTab === 'workshop' ? styles.tabActive : ''}`} onClick={() => handleTabChange('workshop')}>Workshop</button>
          <button className={`${styles.tab} ${activeTab === 'study-package' ? styles.tabActive : ''}`} onClick={() => handleTabChange('study-package')}>Study Package</button>
        </div>
      </div>
      <WorkshopForm onSubmit={handleSubmit} onCancel={() => router.push('/listings')} isSaving={isSaving} initialData={initialData} />
    </div>
  );
}
