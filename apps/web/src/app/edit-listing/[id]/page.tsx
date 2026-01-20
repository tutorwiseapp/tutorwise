'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useRoleGuard } from '@/app/hooks/useRoleGuard';
import { getListing, updateListing } from '@/lib/api/listings';
import type { Listing, UpdateListingInput } from '@tutorwise/shared-types';
import toast from 'react-hot-toast';
import CreateListingWizard from '@/app/components/feature/listings/CreateListingWizard';
import styles from '../../create-listing/page.module.css';

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: userLoading } = useUserProfile();
  const { isAllowed, isLoading: roleLoading } = useRoleGuard(['tutor', 'agent', 'client', 'admin']);
  const [listing, setListing] = useState<Listing | null>(null);
  const [isListingLoading, setIsListingLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const listingId = params?.id as string;

  // Load listing data - must be before conditional returns
  useEffect(() => {
    if (!userLoading && !user) {
      router.push(`/login?redirect=/listings/${listingId}/edit`);
      return;
    }

    const loadListing = async () => {
      try {
        const data = await getListing(listingId);
        if (data) {
          setListing(data);
        } else {
          toast.error('Listing not found');
          router.push('/listings');
        }
      } catch (error) {
        console.error('Failed to load listing:', error);
        toast.error('Failed to load listing');
      } finally {
        setIsListingLoading(false);
      }
    };

    if (user && listingId) {
      loadListing();
    }
  }, [user, userLoading, listingId, router]);

  const handleSubmit = async (data: Partial<UpdateListingInput>) => {
    setIsSaving(true);
    try {
      const updatedData = { ...data, id: listingId };
      await updateListing(updatedData);
      toast.success('Listing updated successfully!');
      router.push('/listings');
    } catch (error) {
      console.error('Failed to update listing:', error);
      toast.error('Failed to update listing. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/listings');
  };

  // Show loading state for all async operations
  if (userLoading || roleLoading || isListingLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading listing data...</p>
      </div>
    );
  }

  // Role guard will handle redirect, just return null if not allowed
  if (!isAllowed) {
    return null;
  }

  if (!listing) {
    return null; // Or a "not found" component
  }

  return (
    <div className={styles.listingPage}>
      <CreateListingWizard
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSaving={isSaving}
        initialData={listing}
      />
    </div>
  );
}