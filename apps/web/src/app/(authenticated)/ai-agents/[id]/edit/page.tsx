/**
 * Filename: apps/web/src/app/(authenticated)/ai-agents/[id]/edit/page.tsx
 * Purpose: AI Tutor Editor - edit existing AI tutor
 * Route: /ai-agents/[id]/edit
 * Created: 2026-02-24
 * Pattern: Matches listings edit pattern
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useRoleGuard } from '@/app/hooks/useRoleGuard';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import type { HubTab } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import AITutorBuilderForm from '@/app/components/feature/ai-agents/builder/AITutorBuilderForm';
import type { AITutorFormData } from '@/app/components/feature/ai-agents/builder/AITutorBuilderForm';
import AITutorHelpWidget from '@/app/components/feature/ai-agents/AITutorHelpWidget';
import toast from 'react-hot-toast';

interface EditAITutorPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditAITutorPage({ params }: EditAITutorPageProps) {
  const router = useRouter();
  const { profile, isLoading: userLoading } = useUserProfile();
  const { isAllowed, isLoading: roleLoading } = useRoleGuard(['tutor', 'agent']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tutorId, setTutorId] = useState<string | null>(null);

  // Unwrap params
  React.useEffect(() => {
    params.then(p => setTutorId(p.id));
  }, [params]);

  // Fetch AI tutor data
  const {
    data: aiTutor,
    isLoading: tutorLoading,
    error,
  } = useQuery({
    queryKey: ['ai-tutor', tutorId],
    queryFn: async () => {
      if (!tutorId) return null;
      const res = await fetch(`/api/ai-agents/${tutorId}`);
      if (!res.ok) throw new Error('Failed to fetch AI tutor');
      return res.json();
    },
    enabled: !!tutorId && !!profile?.id,
    staleTime: 5 * 60 * 1000,
  });

  const handleSubmit = async (data: AITutorFormData, shouldPublish: boolean) => {
    if (!tutorId) return;

    setIsSubmitting(true);
    try {
      // Update AI tutor
      const response = await fetch(`/api/ai-agents/${tutorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update AI tutor');
      }

      toast.success('AI tutor updated successfully!');

      if (shouldPublish && aiTutor?.status !== 'published') {
        // Check subscription and publish if needed
        if (aiTutor?.subscription_status !== 'active') {
          try {
            const subResponse = await fetch(`/api/ai-agents/${tutorId}/subscription`, {
              method: 'POST',
            });

            if (!subResponse.ok) {
              throw new Error('Failed to create subscription checkout');
            }

            const { url } = await subResponse.json();
            toast.loading('Redirecting to payment...');
            window.location.href = url;
          } catch (subError) {
            console.error('Subscription error:', subError);
            toast.error('Failed to start subscription. Redirecting to AI Tutor list...');
            router.push('/ai-agents');
          }
        } else {
          // Already has subscription, just publish
          try {
            const publishResponse = await fetch(`/api/ai-agents/${tutorId}/publish`, {
              method: 'POST',
            });

            if (!publishResponse.ok) {
              throw new Error('Failed to publish');
            }

            toast.success('AI tutor published!');
            router.push('/ai-agents');
          } catch (publishError) {
            toast.error('Failed to publish AI tutor');
            router.push('/ai-agents');
          }
        }
      } else {
        // Just save - redirect to hub list
        router.push('/ai-agents');
      }
    } catch (error) {
      console.error('Error updating AI tutor:', error);
      toast.error((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/ai-agents');
  };

  const tabs: HubTab[] = [
    { id: 'edit', label: 'Edit AI Tutor', active: true },
  ];

  const handleTabChange = (_tabId: string) => {
    // Single tab - no navigation needed
  };

  if (userLoading || roleLoading || tutorLoading || !tutorId) {
    return (
      <HubPageLayout
        header={<HubHeader title="AI Studio" />}
        tabs={<HubTabs tabs={tabs} onTabChange={handleTabChange} />}
        sidebar={<HubSidebar><div style={{ height: 200 }} /></HubSidebar>}
      >
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
      </HubPageLayout>
    );
  }

  if (!isAllowed) return null;

  if (error || !aiTutor) {
    return (
      <HubPageLayout
        header={<HubHeader title="AI Studio" />}
        tabs={<HubTabs tabs={tabs} onTabChange={handleTabChange} />}
        sidebar={<HubSidebar><AITutorHelpWidget /></HubSidebar>}
      >
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Error Loading AI Tutor</h2>
          <p>{(error as Error)?.message || 'AI tutor not found'}</p>
          <button onClick={() => router.push('/ai-agents')}>Back to List</button>
        </div>
      </HubPageLayout>
    );
  }

  return (
    <HubPageLayout
      header={<HubHeader title="AI Studio" />}
      tabs={<HubTabs tabs={tabs} onTabChange={handleTabChange} />}
      sidebar={
        <HubSidebar>
          <AITutorHelpWidget />
        </HubSidebar>
      }
    >
      <AITutorBuilderForm
        initialData={aiTutor}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
        isEditing
      />
    </HubPageLayout>
  );
}
