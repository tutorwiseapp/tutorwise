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
import { useQuery } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useRoleGuard } from '@/app/hooks/useRoleGuard';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import type { HubTab } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import AITutorBuilderForm from '@/app/components/feature/ai-tutors/builder/AITutorBuilderForm';
import type { AITutorFormData } from '@/app/components/feature/ai-tutors/builder/AITutorBuilderForm';
import AITutorStatsWidget from '@/app/components/feature/ai-tutors/AITutorStatsWidget';
import AITutorLimitsWidget from '@/app/components/feature/ai-tutors/AITutorLimitsWidget';
import AITutorHelpWidget from '@/app/components/feature/ai-tutors/AITutorHelpWidget';
import AITutorTipsWidget from '@/app/components/feature/ai-tutors/AITutorTipsWidget';
import toast from 'react-hot-toast';

interface AITutor {
  id: string;
  display_name: string;
  subject: string;
  status: string;
  subscription_status: string;
  total_sessions: number;
  total_revenue: number;
  avg_rating: number | null;
  total_reviews: number;
  created_at: string;
  price_per_hour: number;
}

export default function NewAITutorPage() {
  const router = useRouter();
  const { profile, isLoading: userLoading } = useUserProfile();
  const { isAllowed, isLoading: roleLoading } = useRoleGuard(['tutor', 'agent']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: aiTutors = [],
    isLoading: aiTutorsLoading,
  } = useQuery<AITutor[]>({
    queryKey: ['ai-tutors'],
    queryFn: async () => {
      const res = await fetch('/api/ai-tutors');
      if (!res.ok) throw new Error('Failed to fetch AI tutors');
      return res.json();
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000,
  });

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
        // Redirect to subscription checkout for publishing
        try {
          const subResponse = await fetch(`/api/ai-tutors/${aiTutor.id}/subscription`, {
            method: 'POST',
          });

          if (!subResponse.ok) {
            throw new Error('Failed to create subscription checkout');
          }

          const { url } = await subResponse.json();
          toast.loading('Redirecting to payment...');
          window.location.href = url; // Redirect to Stripe Checkout
        } catch (subError) {
          console.error('Subscription error:', subError);
          toast.error('Failed to start subscription. Redirecting to AI Tutor list...');
          router.push('/ai-tutors');
        }
      } else {
        // Save as draft - redirect to hub list (matches listings pattern)
        router.push('/ai-tutors');
      }
    } catch (error) {
      console.error('Error creating AI tutor:', error);
      toast.error((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs: HubTab[] = [
    { id: 'create', label: 'Create AI Tutor', active: true },
  ];

  const handleTabChange = (tabId: string) => {
    // Single tab - no navigation needed
  };

  if (userLoading || roleLoading) {
    return (
      <HubPageLayout
        header={<HubHeader title="AI Tutor Studio" />}
        tabs={<HubTabs tabs={tabs} onTabChange={handleTabChange} />}
        sidebar={<HubSidebar><div style={{ height: 200 }} /></HubSidebar>}
      >
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
      </HubPageLayout>
    );
  }

  if (!isAllowed) return null;

  return (
    <HubPageLayout
      header={<HubHeader title="AI Tutor Studio" />}
      tabs={<HubTabs tabs={tabs} onTabChange={handleTabChange} />}
      sidebar={
        <HubSidebar>
          <AITutorStatsWidget aiTutors={aiTutors} isLoading={aiTutorsLoading} />
          <AITutorLimitsWidget />
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
