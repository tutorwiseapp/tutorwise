'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { getListing, updateListing } from '@/lib/api/listings';
import type { Listing, UpdateListingInput } from '@tutorwise/shared-types';
import { toast } from 'sonner';
import CreateListingWizard from '@/app/components/listings/CreateListingWizard';
import styles from '../../create/page.module.css';

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: userLoading } = useUserProfile();
  const [listing, setListing] = useState<Listing | null>(null);
  const [isListingLoading, setIsListingLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const listingId = params?.id as string;

  useEffect(() => {
    if (!userLoading && !user) {
      router.push(`/login?redirect=/my-listings/${listingId}/edit`);
      return;
    }

    if (user && listingId) {
      loadListing();
    }
  }, [user, userLoading, listingId, router]);

  const loadListing = async () => {
    try {
      const data = await getListing(listingId);
      if (data) {
        setListing(data);
      } else {
        toast.error('Listing not found');
        router.push('/my-listings');
      }
    } catch (error) {
      console.error('Failed to load listing:', error);
      toast.error('Failed to load listing');
    } finally {
      setIsListingLoading(false);
    }
  };

  const handleSubmit = async (data: Partial<UpdateListingInput>) => {
    setIsSaving(true);
    try {
      const updatedData = { ...data, id: listingId };
      await updateListing(updatedData);
      toast.success('Listing updated successfully!');
      router.push('/my-listings');
    } catch (error) {
      console.error('Failed to update listing:', error);
      toast.error('Failed to update listing. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/my-listings');
  };

  if (userLoading || isListingLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading listing data...</p>
      </div>
    );
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