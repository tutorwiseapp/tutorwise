/**
 * Filename: edit-listing/[id]/page.tsx
 * Purpose: Edit an existing listing using hub-based forms
 * Created: 2026-01-21
 * Architecture: Uses role-specific hub-based forms (tutor/agent)
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { getListing, updateListing } from '@/lib/api/listings';
import type { Listing, CreateListingInput } from '@tutorwise/shared-types';
import toast from 'react-hot-toast';

// Import role-specific form components
import TutorOneToOneForm from '@/app/components/feature/listings/create/tutor/OneToOneForm';
import TutorGroupSessionForm from '@/app/components/feature/listings/create/tutor/GroupSessionForm';
import TutorWorkshopForm from '@/app/components/feature/listings/create/tutor/WorkshopForm';
import TutorStudyPackageForm from '@/app/components/feature/listings/create/tutor/StudyPackageForm';

import AgentOneToOneForm from '@/app/components/feature/listings/create/agent/OneToOneForm';
import AgentGroupSessionForm from '@/app/components/feature/listings/create/agent/GroupSessionForm';
import AgentWorkshopForm from '@/app/components/feature/listings/create/agent/WorkshopForm';
import AgentStudyPackageForm from '@/app/components/feature/listings/create/agent/StudyPackageForm';
import AgentJobListingForm from '@/app/components/feature/listings/create/agent/JobListingForm';

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams();
  const listingId = params?.id as string;
  const { profile, activeRole, isLoading: isProfileLoading } = useUserProfile();

  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoadingListing, setIsLoadingListing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the listing
  useEffect(() => {
    async function loadListing() {
      if (!listingId) {
        setError('No listing ID provided');
        setIsLoadingListing(false);
        return;
      }

      try {
        const data = await getListing(listingId);
        if (!data) {
          setError('Listing not found');
        } else {
          setListing(data);
        }
      } catch (err) {
        console.error('Error loading listing:', err);
        setError(err instanceof Error ? err.message : 'Failed to load listing');
      } finally {
        setIsLoadingListing(false);
      }
    }

    if (!isProfileLoading) {
      loadListing();
    }
  }, [listingId, isProfileLoading]);

  // Handle form submission - forms pass CreateListingInput, we convert to UpdateListingInput
  const handleSubmit = async (data: CreateListingInput) => {
    if (!listingId) {
      toast.error('No listing ID provided');
      return;
    }

    setIsSaving(true);
    try {
      // Convert CreateListingInput to UpdateListingInput by adding id
      await updateListing({ ...data, id: listingId });
      toast.success('Listing updated successfully!');
      router.push(`/dashboard`);
    } catch (error) {
      console.error('Error updating listing:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update listing');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    router.back();
  };

  // Loading state
  if (isProfileLoading || isLoadingListing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading listing...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !listing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-gray-600 mb-6">{error || 'Listing not found'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Check permissions - only allow listing owner to edit
  const isOwner = profile?.id === listing.profile_id;

  if (!isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You do not have permission to edit this listing.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Determine which form to show based on service_type and current user's role
  // Use activeRole since listings don't store role information
  const listingRole = activeRole;
  const serviceType = listing.service_type;

  const renderForm = () => {
    // Map delivery_mode to location_type if needed for backward compatibility
    // Cast listing to CreateListingInput since forms expect that type
    const initialData = listing as unknown as Partial<CreateListingInput>;

    if (listingRole === 'tutor') {
      switch (serviceType) {
        case 'one-to-one':
          return <TutorOneToOneForm onSubmit={handleSubmit} onCancel={handleCancel} isSaving={isSaving} initialData={initialData} />;
        case 'group-session':
          return <TutorGroupSessionForm onSubmit={handleSubmit} onCancel={handleCancel} isSaving={isSaving} initialData={initialData} />;
        case 'workshop':
          return <TutorWorkshopForm onSubmit={handleSubmit} onCancel={handleCancel} isSaving={isSaving} initialData={initialData} />;
        case 'study-package':
          return <TutorStudyPackageForm onSubmit={handleSubmit} onCancel={handleCancel} isSaving={isSaving} initialData={initialData} />;
        default:
          return (
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center max-w-md">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Unknown Service Type</h1>
                <p className="text-gray-600 mb-6">Service type &quot;{serviceType}&quot; is not supported for tutors.</p>
                <button onClick={handleCancel} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Go Back
                </button>
              </div>
            </div>
          );
      }
    } else if (listingRole === 'agent') {
      switch (serviceType) {
        case 'one-to-one':
          return <AgentOneToOneForm onSubmit={handleSubmit} onCancel={handleCancel} isSaving={isSaving} initialData={initialData} />;
        case 'group-session':
          return <AgentGroupSessionForm onSubmit={handleSubmit} onCancel={handleCancel} isSaving={isSaving} initialData={initialData} />;
        case 'workshop':
          return <AgentWorkshopForm onSubmit={handleSubmit} onCancel={handleCancel} isSaving={isSaving} initialData={initialData} />;
        case 'study-package':
          return <AgentStudyPackageForm onSubmit={handleSubmit} onCancel={handleCancel} isSaving={isSaving} initialData={initialData} />;
        case 'job-listing':
          return <AgentJobListingForm onSubmit={handleSubmit} onCancel={handleCancel} isSaving={isSaving} initialData={initialData} />;
        default:
          return (
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center max-w-md">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Unknown Service Type</h1>
                <p className="text-gray-600 mb-6">Service type &quot;{serviceType}&quot; is not supported for agents.</p>
                <button onClick={handleCancel} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Go Back
                </button>
              </div>
            </div>
          );
      }
    }

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Unsupported Role</h1>
          <p className="text-gray-600 mb-6">Role &quot;{listingRole}&quot; cannot edit listings.</p>
          <button onClick={handleCancel} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Go Back
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {renderForm()}
    </div>
  );
}
