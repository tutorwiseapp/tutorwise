/**
 * Filename: apps/web/src/app/(authenticated)/ai-tutors/new/page.tsx
 * Purpose: AI Tutor Builder - create new AI tutor
 * Route: /ai-tutors/new
 * Created: 2026-02-23
 * Architecture: Hub Layout pattern with HubPageLayout
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useRoleGuard } from '@/app/hooks/useRoleGuard';
import { HubPageLayout, HubHeader } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import AITutorBuilderForm from '@/app/components/feature/ai-tutors/builder/AITutorBuilderForm';
import type { AITutorFormData } from '@/app/components/feature/ai-tutors/builder/AITutorBuilderForm';
import AITutorHelpWidget from '@/app/components/feature/ai-tutors/AITutorHelpWidget';
import AITutorTipsWidget from '@/app/components/feature/ai-tutors/AITutorTipsWidget';
import toast from 'react-hot-toast';

export default function NewAITutorPage() {
  const router = useRouter();
  const { profile, isLoading: userLoading } = useUserProfile();
  const { isAllowed, isLoading: roleLoading } = useRoleGuard(['tutor', 'agent']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: AITutorFormData, shouldPublish: boolean) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/ai-tutors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create AI tutor');
      }

      const aiTutor = await response.json();
      toast.success('AI tutor created successfully!');

      if (shouldPublish) {
        router.push(`/ai-tutors/${aiTutor.id}?tab=overview&publish=true`);
      } else {
        router.push(`/ai-tutors/${aiTutor.id}`);
      }
    } catch (error) {
      console.error('Error creating AI tutor:', error);
      toast.error((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (userLoading || roleLoading) {
    return (
      <HubPageLayout
        header={<HubHeader title="Create AI Tutor" />}
        sidebar={<HubSidebar><div style={{ height: 200 }} /></HubSidebar>}
      >
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
      </HubPageLayout>
    );
  }

  if (!isAllowed) return null;

  return (
    <HubPageLayout
      header={<HubHeader title="Create AI Tutor" />}
      sidebar={
        <HubSidebar>
          <AITutorHelpWidget />
          <AITutorTipsWidget />
        </HubSidebar>
      }
    >
      <AITutorBuilderForm
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </HubPageLayout>
  );
}
