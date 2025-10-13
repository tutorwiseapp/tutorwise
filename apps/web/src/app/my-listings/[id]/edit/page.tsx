'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getListing, updateListing } from '@/lib/api/listings';
import type { Listing, UpdateListingInput } from '@tutorwise/shared-types';
import CreateListingForm from '@/app/components/listings/CreateListingForm';
import { toast } from 'sonner';

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams();
  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const listingData = await getListing(params.id as string);
        if (!listingData) {
          toast.error('Listing not found');
          router.push('/listings');
          return;
        }
        setListing(listingData);
      } catch (error) {
        console.error('Failed to fetch listing:', error);
        toast.error('Failed to load listing details.');
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchListing();
    }
  }, [params.id, router]);

  const handleUpdate = async (data: UpdateListingInput) => {
    setIsSaving(true);
    try {
      await updateListing({ id: params.id as string, ...data });
      toast.success('Listing updated successfully!');
      router.push('/listings');
    } catch (error) {
      console.error('Failed to update listing:', error);
      toast.error('Failed to update listing.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div>Loading listing...</div>;
  }

  if (!listing) {
    return <div>Listing not found.</div>;
  }

  return (
    <div>
      <CreateListingForm
        onSubmit={handleUpdate}
        onCancel={() => router.push('/listings')}
        isSaving={isSaving}
        initialData={listing}
      />
    </div>
  );
}
