/**
 * Filename: GetInTouchCard.tsx (Organisation Version)
 * Purpose: Get in Touch card for organisation public profile sidebar
 * Created: 2026-01-05
 *
 * Layout:
 * - Contact (message the organisation)
 * - Connect (send connection request)
 * - Join Our Team (if enabled by organisation)
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/app/components/ui/data-display/Card';
import Button from '@/app/components/ui/actions/Button';
import toast from 'react-hot-toast';
import styles from './GetInTouchCard.module.css';

interface Organisation {
  id: string;
  name: string;
  allow_team_join?: boolean;
}

interface Profile {
  id: string;
}

interface GetInTouchCardProps {
  organisation: Organisation;
  currentUser: Profile | null;
  isOwner?: boolean;
}

export function GetInTouchCard({ organisation, currentUser, isOwner = false }: GetInTouchCardProps) {
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleContact = async () => {
    if (!currentUser) {
      toast.error('Please login to send messages');
      router.push('/login');
      return;
    }

    try {
      // Navigate to messages page with this organisation
      router.push(`/messages?organisationId=${organisation.id}`);
    } catch (error) {
      toast.error('Failed to open messages');
    }
  };

  const handleConnect = async () => {
    if (!currentUser) {
      toast.error('Please login to connect');
      router.push('/login');
      return;
    }

    setIsConnecting(true);
    try {
      const response = await fetch('/api/network/organisation/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organisation_id: organisation.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.includes('already connected')) {
          toast.error('You are already connected with this organisation');
        } else if (data.error?.includes('pending request')) {
          toast.error('You already have a pending connection request');
        } else {
          toast.error(data.error || 'Failed to send connection request');
        }
        return;
      }

      toast.success('Connection request sent!');
    } catch (error) {
      console.error('Failed to send connection request:', error);
      toast.error('Failed to send connection request. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleJoinTeam = () => {
    if (!currentUser) {
      toast.error('Please login to join the team');
      router.push('/login');
      return;
    }

    // Navigate to join team page or modal
    router.push(`/organisation/${organisation.id}/join`);
  };

  return (
    <Card className={styles.getInTouchCard}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>Get in Touch</h3>
      </div>

      <div className={styles.cardContent}>
        {/* Contact Button */}
        <Button
          variant="primary"
          fullWidth
          onClick={handleContact}
          className={styles.primaryButton}
        >
          Contact
        </Button>

        {/* Divider */}
        <div className={styles.divider} />

        {/* Connect Button */}
        <Button
          variant="secondary"
          fullWidth
          onClick={handleConnect}
          disabled={isConnecting}
          className={styles.secondaryButton}
        >
          {isConnecting ? 'Connecting...' : 'Connect'}
        </Button>

        {/* Join Team Button (if enabled) */}
        {organisation.allow_team_join && (
          <>
            <div className={styles.divider} />
            <Button
              variant="ghost"
              fullWidth
              onClick={handleJoinTeam}
              className={styles.outlineButton}
            >
              Join Our Team
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
