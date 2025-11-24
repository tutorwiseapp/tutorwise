/**
 * Filename: apps/web/src/app/components/network/ConnectionCard.tsx
 * Purpose: Display individual connection with actions (Accept/Reject/Remove/Message)
 * Created: 2025-11-07
 * Updated: 2025-11-24 - Migrated to HubRowCard standard with LinkedIn Lite 4-line rhythm
 * Specification: SDD v4.5, Section 4.2
 */

'use client';

import React from 'react';
import toast from 'react-hot-toast';
import { useAblyPresence } from '@/app/hooks/useAblyPresence';
import HubRowCard from '@/app/components/ui/hub-row-card/HubRowCard';
import Button from '@/app/components/ui/Button';

export interface Connection {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  created_at: string;
  requester?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
    bio?: string;
  };
  receiver?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
    bio?: string;
  };
}

interface ConnectionCardProps {
  connection: Connection;
  currentUserId: string;
  variant: 'pending-received' | 'pending-sent' | 'accepted';
  onAccept?: (connectionId: string) => Promise<void>;
  onReject?: (connectionId: string) => Promise<void>;
  onRemove?: (connectionId: string) => Promise<void>;
  onMessage?: (userId: string) => void;
}

export default function ConnectionCard({
  connection,
  currentUserId,
  variant,
  onAccept,
  onReject,
  onRemove,
  onMessage,
}: ConnectionCardProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  // Determine which profile to display (the other person)
  const isRequester = connection.requester_id === currentUserId;
  const otherProfile = isRequester ? connection.receiver : connection.requester;

  // Track real-time presence status (only for accepted connections)
  const { isOnline } = useAblyPresence(
    variant === 'accepted' ? otherProfile?.id : null,
    currentUserId
  );

  if (!otherProfile) {
    return null;
  }

  // Format date helper
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleAccept = async () => {
    if (!onAccept) return;
    setIsLoading(true);
    try {
      await onAccept(connection.id);
      toast.success(`You are now connected with ${otherProfile.full_name}`);
    } catch (error) {
      toast.error('Failed to accept connection request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!onReject) return;
    setIsLoading(true);
    try {
      await onReject(connection.id);
      toast.success('Connection request rejected');
    } catch (error) {
      toast.error('Failed to reject connection request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;
    const confirmed = window.confirm(
      `Are you sure you want to remove ${otherProfile.full_name} from your connections?`
    );
    if (!confirmed) return;

    setIsLoading(true);
    try {
      await onRemove(connection.id);
      toast.success('Connection removed');
    } catch (error) {
      toast.error('Failed to remove connection');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMessage = () => {
    if (!onMessage) return;
    onMessage(otherProfile.id);
  };

  // Map variant to status
  const getStatus = () => {
    if (variant === 'pending-received') {
      return { label: 'Request Received', variant: 'info' as const };
    }
    if (variant === 'pending-sent') {
      return { label: 'Request Sent', variant: 'neutral' as const };
    }
    return { label: 'Connected', variant: 'success' as const };
  };

  // Line 2: Description (Priority context for Request Received, Bio otherwise)
  const description = variant === 'pending-received' && connection.message
    ? connection.message
    : otherProfile.bio;

  // Line 3: Meta array (Email and Date)
  const meta = [
    otherProfile.email,
    formatDate(connection.created_at),
  ];

  // Line 4: Presence indicator (only for accepted connections)
  if (variant === 'accepted') {
    meta.push(isOnline ? '🟢 Online' : '⚪ Offline');
  }

  // Actions based on variant
  const actions = (
    <>
      {variant === 'pending-received' && (
        <>
          <Button
            variant="primary"
            size="sm"
            onClick={handleAccept}
            disabled={isLoading}
          >
            {isLoading ? 'Accepting...' : 'Accept'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReject}
            disabled={isLoading}
          >
            {isLoading ? 'Rejecting...' : 'Reject'}
          </Button>
        </>
      )}

      {variant === 'accepted' && (
        <>
          <Button
            variant="primary"
            size="sm"
            onClick={handleMessage}
          >
            Message
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={isLoading}
          >
            {isLoading ? 'Removing...' : 'Remove'}
          </Button>
        </>
      )}

      {/* No actions for pending-sent */}
    </>
  );

  return (
    <HubRowCard
      image={{
        src: otherProfile.avatar_url || null,
        alt: otherProfile.full_name,
        fallbackChar: otherProfile.full_name?.charAt(0).toUpperCase(),
      }}
      title={otherProfile.full_name}
      status={getStatus()}
      description={description}
      meta={meta}
      actions={actions}
      imageHref={`/public-profile/${otherProfile.id}`}
      titleHref={`/public-profile/${otherProfile.id}`}
    />
  );
}
