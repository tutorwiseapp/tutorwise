/**
 * Filename: apps/web/src/app/components/messages/ChatContextWidget.tsx
 * Purpose: Chat context widget showing mini-profile and actions
 * Created: 2025-11-24
 * Specification: Mini profile card for active conversation in sidebar
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import Button from '@/app/components/ui/actions/Button';
import getProfileImageUrl from '@/lib/utils/image';
import styles from './ChatContextWidget.module.css';

interface ChatContextWidgetProps {
  otherUser: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export default function ChatContextWidget({ otherUser }: ChatContextWidgetProps) {
  const avatarUrl = otherUser.avatar_url
    ? getProfileImageUrl({
        id: otherUser.id,
        avatar_url: otherUser.avatar_url,
      })
    : null;

  const fallbackChar = otherUser.full_name?.charAt(0).toUpperCase() || '?';

  return (
    <HubComplexCard>
      <h3 className={styles.title}>Chat With</h3>

      <div className={styles.content}>
        {/* Profile Avatar */}
        <div className={styles.avatarContainer}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={otherUser.full_name || 'User'} className={styles.avatar} />
          ) : (
            <div className={styles.avatarFallback}>{fallbackChar}</div>
          )}
        </div>

        {/* Profile Name */}
        <h4 className={styles.name}>{otherUser.full_name || 'Unknown User'}</h4>

        {/* Actions */}
        <div className={styles.actions}>
          <Button
            variant="secondary"
            size="sm"
            href={`/public-profile/${otherUser.id}`}
            fullWidth
          >
            View Profile
          </Button>
          <Button
            variant="primary"
            size="sm"
            href={`/bookings/new?tutor=${otherUser.id}`}
            fullWidth
          >
            Create Booking
          </Button>
        </div>
      </div>
    </HubComplexCard>
  );
}
