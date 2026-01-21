/**
 * Filename: create-listing/page.tsx
 * Purpose: Create a new listing using hub-based forms
 * Created: 2026-01-21
 * Architecture: Uses role-specific hub-based forms (tutor/agent)
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { createListing } from '@/lib/api/listings';
import type { CreateListingInput } from '@tutorwise/shared-types';
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

type ServiceType = 'one_to_one' | 'group' | 'workshop' | 'study_package' | 'job_listing';

export default function CreateListingPage() {
  const router = useRouter();
  const { profile, activeRole, isLoading } = useUserProfile();
  const [selectedServiceType, setSelectedServiceType] = useState<ServiceType | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Handle form submission
  const handleSubmit = async (data: CreateListingInput) => {
    setIsSaving(true);
    try {
      const listing = await createListing(data);
      toast.success('Listing created successfully!');
      router.push(`/dashboard`);
    } catch (error: any) {
      console.error('Error creating listing:', error);
      toast.error(error.message || 'Failed to create listing');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    router.back();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user has permission
  if (!profile || (activeRole !== 'tutor' && activeRole !== 'agent')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            Only tutors and agents can create listings. Please switch to a tutor or agent role.
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

  // Service type selection screen
  if (!selectedServiceType) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create a New Listing</h1>
            <p className="text-gray-600">Choose the type of service you want to offer</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ServiceTypeCard
              title="One-to-One Tutoring"
              description="Individual tutoring sessions tailored to each student"
              onClick={() => setSelectedServiceType('one_to_one')}
            />
            <ServiceTypeCard
              title="Group Sessions"
              description="Teach multiple students together in small groups"
              onClick={() => setSelectedServiceType('group')}
            />
            <ServiceTypeCard
              title="Workshops"
              description="Structured learning experiences on specific topics"
              onClick={() => setSelectedServiceType('workshop')}
            />
            <ServiceTypeCard
              title="Study Packages"
              description="Pre-designed course packages for students"
              onClick={() => setSelectedServiceType('study_package')}
            />
            {activeRole === 'agent' && (
              <ServiceTypeCard
                title="Job Listing"
                description="Post a job opportunity for tutors"
                onClick={() => setSelectedServiceType('job_listing')}
              />
            )}
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={handleCancel}
              className="text-gray-600 hover:text-gray-900 underline"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render the appropriate form based on role and service type
  const renderForm = () => {
    if (activeRole === 'tutor') {
      switch (selectedServiceType) {
        case 'one_to_one':
          return <TutorOneToOneForm onSubmit={handleSubmit} onCancel={handleCancel} isSaving={isSaving} />;
        case 'group':
          return <TutorGroupSessionForm onSubmit={handleSubmit} onCancel={handleCancel} isSaving={isSaving} />;
        case 'workshop':
          return <TutorWorkshopForm onSubmit={handleSubmit} onCancel={handleCancel} isSaving={isSaving} />;
        case 'study_package':
          return <TutorStudyPackageForm onSubmit={handleSubmit} onCancel={handleCancel} isSaving={isSaving} />;
        default:
          return null;
      }
    } else if (activeRole === 'agent') {
      switch (selectedServiceType) {
        case 'one_to_one':
          return <AgentOneToOneForm onSubmit={handleSubmit} onCancel={handleCancel} isSaving={isSaving} />;
        case 'group':
          return <AgentGroupSessionForm onSubmit={handleSubmit} onCancel={handleCancel} isSaving={isSaving} />;
        case 'workshop':
          return <AgentWorkshopForm onSubmit={handleSubmit} onCancel={handleCancel} isSaving={isSaving} />;
        case 'study_package':
          return <AgentStudyPackageForm onSubmit={handleSubmit} onCancel={handleCancel} isSaving={isSaving} />;
        case 'job_listing':
          return <AgentJobListingForm onSubmit={handleSubmit} onCancel={handleCancel} isSaving={isSaving} />;
        default:
          return null;
      }
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {renderForm()}
    </div>
  );
}

// Service type card component
function ServiceTypeCard({ title, description, onClick }: { title: string; description: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all text-left"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </button>
  );
}
