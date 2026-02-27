/**
 * Filename: AdminAIAgentCreateTab.tsx
 * Purpose: Admin tab for creating platform-owned AI tutors
 * Created: 2026-02-24
 * Pattern: Reuses AITutorBuilderForm with admin-specific handling
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import AITutorBuilderForm from '@/app/components/feature/ai-agents/builder/AITutorBuilderForm';
import type { AITutorFormData } from '@/app/components/feature/ai-agents/builder/AITutorBuilderForm';
import toast from 'react-hot-toast';
import styles from './AdminAIAgentCreateTab.module.css';

interface AdminAIAgentCreateTabProps {
  onSuccess?: () => void;
}

export default function AdminAIAgentCreateTab({ onSuccess }: AdminAIAgentCreateTabProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: AITutorFormData, shouldPublish: boolean) => {
    setIsSubmitting(true);
    try {
      // Admin creates platform-owned AI tutor
      const response = await fetch('/api/ai-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          is_platform_owned: true,  // 🔑 Mark as platform-owned
          status: shouldPublish ? 'published' : 'draft',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create platform AI tutor');
      }

      const aiTutor = await response.json();

      toast.success(
        shouldPublish
          ? 'Platform AI tutor created and published successfully!'
          : 'Platform AI tutor created as draft!'
      );

      // Invalidate admin queries to refresh stats
      queryClient.invalidateQueries({ queryKey: ['admin-ai-tutor-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-ai-agents'] });

      // Call success callback (switches to table view)
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating platform AI tutor:', error);
      toast.error((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onSuccess) {
      onSuccess(); // Switch back to table view
    } else {
      router.push('/admin/ai-agents');
    }
  };

  return (
    <div className={styles.createTabContainer}>
      <div className={styles.createTabHeader}>
        <h2>Create Platform AI Tutor</h2>
        <p className={styles.subtitle}>
          Create an AI tutor owned by the platform. These AI tutors will be featured in the marketplace
          with a special "Platform" badge, and all revenue goes directly to the platform.
        </p>
      </div>

      <div className={styles.formContainer}>
        {/* 🔥 REUSE - Don't duplicate the form */}
        <AITutorBuilderForm
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          onCancel={handleCancel}
          isAdminMode={true}  // Enable admin-specific features (if we add them later)
        />
      </div>

      <div className={styles.adminNotes}>
        <h3>Admin Notes</h3>
        <ul>
          <li>Platform AI tutors are marked with a ⭐ Platform badge in the marketplace</li>
          <li>All revenue from platform AI tutors goes directly to the platform (no commission split)</li>
          <li>Platform AI tutors can be featured and prioritized in search results</li>
          <li>You can publish immediately or save as draft for later review</li>
        </ul>
      </div>
    </div>
  );
}
