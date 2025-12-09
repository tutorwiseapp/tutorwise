/*
 * Filename: src/app/(authenticated)/listings/ListingCard.tsx
 * Purpose: Display listing information in detail card format with HubDetailCard
 * Created: 2025-11-03
 * Updated: 2025-12-05 - Migrated to HubDetailCard standard (consistent with BookingCard/WiselistCard)
 * Specification: Expanded detail card layout with HubDetailCard component
 */
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Listing } from '@tutorwise/shared-types';
import Button from '@/app/components/ui/actions/Button';
import ConfirmDialog from '@/app/components/ui/feedback/ConfirmDialog';
import HubDetailCard from '@/app/components/hub/content/HubDetailCard/HubDetailCard';
import getProfileImageUrl from '@/lib/utils/image';

interface ListingCardProps {
  listing: Listing;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onArchive: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export default function ListingCard({
  listing,
  onDelete,
  onPublish,
  onUnpublish,
  onArchive,
  onDuplicate,
}: ListingCardProps) {
  const router = useRouter();
  const isTemplate = listing.is_template === true;
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

  // Use the same profile image logic as NavMenu (includes academic avatar fallback)
  const imageUrl = getProfileImageUrl({
    id: listing.profile_id,
    avatar_url: listing.avatar_url,
  });

  // Map status to HubDetailCard status variant
  const getStatusVariant = (status?: string): 'success' | 'warning' | 'error' | 'neutral' | 'info' => {
    switch (status) {
      case 'published':
        return 'success';
      case 'unpublished':
        return 'info';
      case 'draft':
        return 'neutral';
      case 'archived':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  // Format location type to human-readable string
  const formatLocationType = (locationType?: string): string => {
    if (!locationType) return 'Not specified';
    if (locationType === 'online') return 'Online';
    if (locationType === 'in_person') return 'In Person';
    return locationType;
  };

  // Format status for display
  const formatStatus = (status?: string): string => {
    return status || 'draft';
  };

  // Business logic checks
  const status = listing.status;
  const isDraft = status === 'draft';
  const isPublished = status === 'published';
  const isUnpublished = status === 'unpublished';
  const isArchived = status === 'archived';

  // Calculate if listing has been archived for 3+ days (will be 30 days in production)
  const DAYS_BEFORE_DELETE = 3; // TODO: Change to 30 days in production

  const canDelete = () => {
    // Templates cannot be deleted
    if (isTemplate) return false;

    // Drafts can be deleted immediately
    if (isDraft) return true;

    // Archived listings can only be deleted after waiting period
    if (isArchived && listing.archived_at) {
      const archivedDate = new Date(listing.archived_at);
      const now = new Date();
      const daysSinceArchived = Math.floor((now.getTime() - archivedDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceArchived >= DAYS_BEFORE_DELETE;
    }

    return false;
  };

  // Handle delete with confirmation and validation
  const handleDeleteClick = () => {
    // For drafts, show confirm dialog
    if (isDraft) {
      setConfirmDialog({
        isOpen: true,
        title: 'Delete Draft Listing?',
        message: 'Are you sure you want to delete this draft listing? This action cannot be undone.',
        onConfirm: () => {
          onDelete(listing.id);
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        },
        variant: 'danger',
      });
      return;
    }

    // For archived listings, check waiting period
    if (isArchived) {
      if (!canDelete()) {
        const archivedDate = listing.archived_at ? new Date(listing.archived_at) : null;
        const daysSinceArchived = archivedDate
          ? Math.floor((new Date().getTime() - archivedDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        const daysRemaining = Math.max(0, DAYS_BEFORE_DELETE - daysSinceArchived);

        setConfirmDialog({
          isOpen: true,
          title: 'Cannot Delete Yet',
          message: `You cannot delete this listing yet.\n\nListings can only be deleted after being archived for ${DAYS_BEFORE_DELETE} days.\n\n${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining.`,
          onConfirm: () => {
            setConfirmDialog({ ...confirmDialog, isOpen: false });
          },
          variant: 'warning',
        });
        return;
      }

      setConfirmDialog({
        isOpen: true,
        title: 'Delete Listing Permanently?',
        message: 'Are you sure you want to permanently delete this listing? This action cannot be undone and all data will be lost.',
        onConfirm: () => {
          onDelete(listing.id);
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        },
        variant: 'danger',
      });
    }
  };

  // Build description
  const subjects = listing.subjects?.join(', ') || 'No subjects';
  const levels = listing.levels?.join(', ') || '';
  const description = `${subjects}${levels ? ` • ${levels}` : ''}`;

  // Build details grid - 3x3 grid matching BookingCard pattern
  const details = [
    // Row 1: Rate, Type, Template
    { label: 'Rate', value: `£${listing.hourly_rate}/hr` },
    { label: 'Type', value: formatLocationType(listing.location_type) },
    { label: 'Template', value: isTemplate ? 'Yes' : 'No' },
    // Row 2: Views, Inquiries, Bookings (hidden for templates)
    ...(isTemplate ? [
      { label: 'Views', value: '--' },
      { label: 'Inquiries', value: '--' },
      { label: 'Bookings', value: '--' },
    ] : [
      { label: 'Views', value: `${listing.view_count || 0}` },
      { label: 'Inquiries', value: `${listing.inquiry_count || 0}` },
      { label: 'Bookings', value: `${listing.booking_count || 0}` },
    ]),
    // Row 3: Status, Created, Updated (or Archived if applicable)
    { label: 'Status', value: formatStatus(listing.status) },
    { label: 'Created', value: new Date(listing.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) },
    {
      label: isArchived ? 'Archived' : 'Updated',
      value: new Date(isArchived && listing.archived_at ? listing.archived_at : listing.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    },
  ];

  // Build actions (conditional based on status and template)
  const actions = (
    <>
      {isTemplate ? (
        // Template: Only show Duplicate button
        <Button
          variant="primary"
          size="sm"
          onClick={() => onDuplicate(listing.id)}
        >
          Duplicate
        </Button>
      ) : isDraft ? (
        // Draft: Publish, Edit, Delete
        <>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onPublish(listing.id)}
          >
            Publish
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push(`/edit-listing/${listing.id}`)}
          >
            Edit
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
        // Published: Unpublish, Archive
        <>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onUnpublish(listing.id)}
          >
            Unpublish
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onArchive(listing.id)}
          >
            Archive
          </Button>
        </>
      ) : isUnpublished ? (
        // Unpublished: Publish, Archive
        <>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onPublish(listing.id)}
          >
            Publish
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onArchive(listing.id)}
          >
            Archive
          </Button>
        </>
      ) : isArchived ? (
        // Archived: Delete only (after 3-day wait)
        <Button
          variant="danger"
          size="sm"
          onClick={handleDeleteClick}
          disabled={!canDelete()}
          title={
            canDelete()
              ? 'Delete listing permanently'
              : `Delete available after ${DAYS_BEFORE_DELETE} days`
          }
        >
          Delete
        </Button>
      ) : null}
    </>
  );

  return (
    <>
      <HubDetailCard
        image={{
          src: listing.images?.[0] || imageUrl,
          alt: listing.title,
          fallbackChar: listing.title?.charAt(0).toUpperCase(),
        }}
        title={listing.title}
        status={{
          label: formatStatus(listing.status),
          variant: getStatusVariant(listing.status),
        }}
        description={description}
        details={details}
        actions={actions}
        imageHref={`/listings/${listing.id}`}
        titleHref={`/listings/${listing.id}`}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.variant === 'warning' ? 'OK' : 'Delete'}
        cancelText="Cancel"
      />
    </>
  );
}
