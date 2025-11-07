/**
 * Filename: apps/web/src/app/components/network/ConnectionCard.tsx
 * Purpose: Display individual connection with actions (Accept/Reject/Remove/Message)
 * Created: 2025-11-07
 * Specification: SDD v4.5, Section 4.2
 */

'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import toast from 'react-hot-toast';
import styles from './ConnectionCard.module.css';

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

  if (!otherProfile) {
    return null;
  }

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

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        {/* Avatar */}
        <Link href={`/profile/${otherProfile.id}`} className={styles.avatarLink}>
          {otherProfile.avatar_url ? (
            <Image
              src={otherProfile.avatar_url}
              alt={otherProfile.full_name}
              width={64}
              height={64}
              className={styles.avatar}
            />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {otherProfile.full_name.charAt(0).toUpperCase()}
            </div>
          )}
        </Link>

        {/* Profile Info */}
        <div className={styles.info}>
          <Link href={`/profile/${otherProfile.id}`} className={styles.nameLink}>
            <h3 className={styles.name}>{otherProfile.full_name}</h3>
          </Link>
          <p className={styles.email}>{otherProfile.email}</p>
          {otherProfile.bio && (
            <p className={styles.bio}>{otherProfile.bio}</p>
          )}
        </div>
      </div>

      {/* Connection Message */}
      {connection.message && variant === 'pending-received' && (
        <div className={styles.message}>
          <p className={styles.messageLabel}>Message:</p>
          <p className={styles.messageText}>{connection.message}</p>
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        {variant === 'pending-received' && (
          <>
            <button
              onClick={handleAccept}
              disabled={isLoading}
              className={`${styles.button} ${styles.buttonPrimary}`}
            >
              {isLoading ? 'Accepting...' : 'Accept'}
            </button>
            <button
              onClick={handleReject}
              disabled={isLoading}
              className={`${styles.button} ${styles.buttonSecondary}`}
            >
              {isLoading ? 'Rejecting...' : 'Reject'}
            </button>
          </>
        )}

        {variant === 'pending-sent' && (
          <div className={styles.pendingBadge}>
            <span className={styles.pendingIcon}>⏳</span>
            <span className={styles.pendingText}>Pending</span>
          </div>
        )}

        {variant === 'accepted' && (
          <>
            <button
              onClick={handleMessage}
              className={`${styles.button} ${styles.buttonPrimary}`}
              title="Send message via Tawk.to"
            >
              💬 Message
            </button>
            <button
              onClick={handleRemove}
              disabled={isLoading}
              className={`${styles.button} ${styles.buttonDanger}`}
            >
              {isLoading ? 'Removing...' : 'Remove'}
            </button>
          </>
        )}
      </div>

      {/* Timestamp */}
      <div className={styles.footer}>
        <span className={styles.timestamp}>
          {variant === 'pending-received' && 'Received '}
          {variant === 'pending-sent' && 'Sent '}
          {variant === 'accepted' && 'Connected '}
          {new Date(connection.created_at).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      </div>
    </div>
  );
}
