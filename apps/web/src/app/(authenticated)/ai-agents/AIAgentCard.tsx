/**
 * Filename: AIAgentCard.tsx
 * Purpose: Display AI Tutor information using HubDetailCard (matches ListingCard pattern)
 * Created: 2026-02-24
 * Pattern: MUST match ListingCard.tsx for consistency
 */
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/app/components/ui/actions/Button';
import ConfirmDialog from '@/app/components/ui/feedback/ConfirmDialog';
import HubDetailCard from '@/app/components/hub/content/HubDetailCard/HubDetailCard';
import AgentTypeBadge from '@/app/components/ai-agents/AgentTypeBadge';
import type { AgentType } from '@/app/components/ai-agents/AgentTypeBadge';
import getProfileImageUrl from '@/lib/utils/image';
import { getInitials } from '@/lib/utils/initials';

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
  avatar_url?: string;
  owner_id?: string;
  agent_type?: AgentType;
}

interface AIAgentCardProps {
  aiTutor: AITutor;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onEdit?: (id: string) => void;
  onArchive?: (id: string) => void;
}

export default function AIAgentCard({
  aiTutor,
  onDelete,
  onPublish,
  onUnpublish,
  onEdit,
  onArchive,
}: AIAgentCardProps) {
  const router = useRouter();
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'info',
  });

  // Use AI Tutor display name for avatar initials
  // Use subject for color mapping (same as listings)
  const imageUrl = getProfileImageUrl({
    id: aiTutor.owner_id || aiTutor.id,
    avatar_url: aiTutor.avatar_url,
    full_name: aiTutor.display_name,
  }, true, aiTutor.subject); // isListing = true, use subject for color

  // Map status to HubDetailCard status variant (matches ListingCard)
  const getStatusVariant = (status?: string): 'success' | 'warning' | 'error' | 'neutral' | 'info' => {
    switch (status) {
      case 'published':
        return 'success';
      case 'unpublished':
        return 'info';
      case 'draft':
        return 'neutral';
      default:
        return 'neutral';
    }
  };

  // Map subscription status to variant
  const getSubscriptionVariant = (status?: string): 'success' | 'warning' | 'error' | 'neutral' | 'info' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'past_due':
        return 'warning';
      case 'canceled':
        return 'error';
      case 'inactive':
      default:
        return 'neutral';
    }
  };

  // Format status for display
  const formatStatus = (status?: string): string => {
    return status || 'draft';
  };

  // Format subscription status
  const formatSubscriptionStatus = (status?: string): string => {
    if (status === 'inactive') return 'No subscription';
    return status || 'inactive';
  };

  // Business logic checks
  const status = aiTutor.status;
  const isDraft = status === 'draft';
  const isPublished = status === 'published';
  const isUnpublished = status === 'unpublished';
  const hasActiveSubscription = aiTutor.subscription_status === 'active';

  // Handle manage (navigate to detail page)
  const handleManage = () => {
    router.push(`/ai-agents/${aiTutor.id}`);
  };

  // Handle publish with confirmation
  const handlePublishClick = () => {
    if (!hasActiveSubscription) {
      setConfirmDialog({
        isOpen: true,
        title: 'Subscription Required',
        message: 'You need an active subscription (£10/month) to publish this AI tutor. You will be redirected to checkout.',
        onConfirm: () => {
          setConfirmDialog({ ...confirmDialog, isOpen: false });
          onPublish(aiTutor.id);
        },
        variant: 'info',
      });
    } else {
      setConfirmDialog({
        isOpen: true,
        title: 'Publish AI Tutor',
        message: 'This will make your AI tutor visible in the marketplace. Are you sure?',
        onConfirm: () => {
          setConfirmDialog({ ...confirmDialog, isOpen: false });
          onPublish(aiTutor.id);
        },
        variant: 'info',
      });
    }
  };

  // Handle unpublish with confirmation
  const handleUnpublishClick = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Unpublish AI Tutor',
      message: 'This will remove your AI tutor from the marketplace. Your subscription will remain active. Are you sure?',
      onConfirm: () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        onUnpublish(aiTutor.id);
      },
      variant: 'warning',
    });
  };

  // Handle delete with confirmation
  const handleDeleteClick = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete AI Tutor',
      message: 'This action cannot be undone. All materials, sessions, and data will be permanently deleted. Are you sure?',
      onConfirm: () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        onDelete(aiTutor.id);
      },
      variant: 'danger',
    });
  };

  // Build actions JSX (matches ListingCard pattern)
  const actions = (
    <>
      {(isDraft || isUnpublished) ? (
        // Draft/Unpublished: Publish, Edit, Manage, Delete
        <>
          <Button
            variant="primary"
            size="sm"
            onClick={handlePublishClick}
          >
            Publish
          </Button>
          {onEdit && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onEdit(aiTutor.id)}
            >
              Edit
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleManage}
          >
            Manage
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDeleteClick}
          >
            Delete
          </Button>
        </>
      ) : isPublished ? (
        // Published: Edit, Manage, Unpublish, Archive
        <>
          {onEdit && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onEdit(aiTutor.id)}
            >
              Edit
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleManage}
          >
            Manage
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleUnpublishClick}
          >
            Unpublish
          </Button>
          {onArchive && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onArchive(aiTutor.id)}
            >
              Archive
            </Button>
          )}
        </>
      ) : (
        // Default: Edit, Manage, Delete
        <>
          {onEdit && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onEdit(aiTutor.id)}
            >
              Edit
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleManage}
          >
            Manage
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDeleteClick}
          >
            Delete
          </Button>
        </>
      )}
    </>
  );

  return (
    <>
      <HubDetailCard
        image={{
          src: imageUrl,
          alt: aiTutor.display_name,
          fallbackChar: getInitials(aiTutor.display_name),
        }}
        title={aiTutor.display_name}
        description={
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {aiTutor.subject}
            <AgentTypeBadge type={aiTutor.agent_type || 'tutor'} />
          </span>
        }
        status={{
          label: formatStatus(aiTutor.status),
          variant: getStatusVariant(aiTutor.status),
        }}
        details={[
          // Row 1: Price, Subject, Subscription
          { label: 'Price', value: `£${aiTutor.price_per_hour}/hr` },
          { label: 'Subject', value: aiTutor.subject },
          { label: 'Subscription', value: formatSubscriptionStatus(aiTutor.subscription_status) },
          // Row 2: Sessions, Revenue, Rating
          { label: 'Sessions', value: `${aiTutor.total_sessions ?? 0}` },
          { label: 'Revenue', value: `£${(aiTutor.total_revenue ?? 0).toFixed(2)}` },
          {
            label: 'Rating',
            value: aiTutor.avg_rating
              ? `${aiTutor.avg_rating.toFixed(1)}/5`
              : 'No reviews'
          },
          // Row 3: Status, Created, Reviews
          { label: 'Status', value: formatStatus(aiTutor.status) },
          { label: 'Created', value: new Date(aiTutor.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) },
          { label: 'Reviews', value: `${aiTutor.total_reviews ?? 0}` },
        ]}
        actions={actions}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        variant={confirmDialog.variant}
      />
    </>
  );
}
