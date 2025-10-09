'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import Container from '@/app/components/layout/Container';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import { createListing } from '@/lib/api/listings';
import type { CreateListingInput, LocationType } from '@tutorwise/shared-types';
import { toast } from 'sonner';
import CreateListingForm from '@/app/components/listings/CreateListingForm';

export default function CreateListingPage() {
  const router = useRouter();
  const { user, isLoading } = useUserProfile();
  const [isSaving, setIsSaving] = useState(false);

  if (isLoading) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </Container>
    );
  }

  if (!user) {
    router.push('/login?redirect=/listings/create');
    return null;
  }

  const handleSubmit = async (data: CreateListingInput) => {
    setIsSaving(true);
    try {
      const listing = await createListing(data);
      toast.success('Listing created successfully!');
      router.push(`/listings/${listing.id}/edit`);
    } catch (error) {
      console.error('Failed to create listing:', error);
      toast.error('Failed to create listing. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/listings');
  };

  return (
    <Container>
      <div className="max-w-4xl mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Create New Listing</h1>
          <p className="mt-2 text-gray-600">
            Share your expertise by creating a tutoring service listing
          </p>
        </div>

        <Card>
          <CreateListingForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSaving={isSaving}
          />
        </Card>
      </div>
    </Container>
  );
}
