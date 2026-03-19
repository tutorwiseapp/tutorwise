/**
 * VirtualSpace Client Component (v5.9)
 *
 * Client-side component for VirtualSpace session room.
 * Uses context-based rendering for all three modes:
 * - Standalone: Ad-hoc rooms with invite functionality
 * - Booking: CaaS integration and completion triggers
 * - Free Help: Instant whiteboard + meet sessions
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AblyProvider, ChannelProvider } from 'ably/react';
import * as Ably from 'ably';
import { ArrowLeft, Video, Save, CheckCircle, Share2, Users, Tv2, Brain } from 'lucide-react';
import toast from 'react-hot-toast';
import { openGoogleMeetWindow, trackMeetSession } from '@/lib/google-meet';
import { EmbeddedWhiteboard } from '@/components/feature/virtualspace/EmbeddedWhiteboard';
import type { VirtualSpaceSession } from '@/lib/virtualspace';
import styles from '@/components/feature/virtualspace/VirtualSpaceHeader.module.css';
import { useSageVirtualSpace } from '@/components/feature/virtualspace/hooks/useSageVirtualSpace';
import { SagePanel } from '@/components/feature/virtualspace/SagePanel';

interface VirtualSpaceClientProps {
  context: VirtualSpaceSession;
}

export function VirtualSpaceClient({ context }: VirtualSpaceClientProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Sage integration
  const sage = useSageVirtualSpace({
    sessionId: context.sessionId,
    currentUserId: context.currentUserId,
  });

  // Initialize Ably client once (stable ref — not recreated on re-renders)
  const [ablyClient] = useState(() => new Ably.Realtime({
    key: process.env.NEXT_PUBLIC_ABLY_API_KEY,
    clientId: context.currentUserId,
  }));

  // Clean up Ably connection on unmount
  useEffect(() => {
    return () => { ablyClient.close(); };
  }, [ablyClient]);

  // Build session title
  const getSessionTitle = () => {
    if (context.mode === 'booking' || context.mode === 'free_help') {
      const booking = context.booking;
      if (booking) {
        return `${context.title}${booking.isFreeHelp ? ' (Free Help)' : ''}`;
      }
    }
    return context.title;
  };

  // Get mode badge text
  const getModeBadge = () => {
    switch (context.mode) {
      case 'standalone':
        return 'Standalone Session';
      case 'booking':
        return 'Booking Session';
      case 'free_help':
        return 'Free Help Session';
      default:
        return null;
    }
  };

  const handleStartGoogleMeet = useCallback(() => {
    try {
      openGoogleMeetWindow(context.sessionId, context.title);
      trackMeetSession(context.sessionId);
      toast.success('Google Meet opened in new window');
    } catch (error) {
      toast.error('Failed to start Google Meet');
      console.error(error);
    }
  }, [context.sessionId, context.title]);

  const handleJoinVideoRoom = useCallback(() => {
    const roomName = `tutorwise-${context.sessionId.slice(0, 8)}`;
    const jitsiUrl = `https://meet.jit.si/${roomName}`;
    const width = 1280;
    const height = 720;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;
    window.open(jitsiUrl, 'JitsiMeet', `width=${width},height=${height},left=${left},top=${top},resizable=yes`);
    toast.success('Video room opened — share with your student to join the same room');
  }, [context.sessionId]);

  const handleSaveSnapshot = useCallback(async () => {
    setIsSaving(true);
    try {
      // Get snapshot data from whiteboard
      const snapshotData = await (window as any).__virtualSpaceExportSnapshot?.();

      if (!snapshotData) {
        throw new Error('No snapshot data available');
      }

      const response = await fetch(`/api/virtualspace/${context.sessionId}/snapshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotData }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save snapshot');
      }

      toast.success('Whiteboard snapshot saved!');
    } catch (error) {
      toast.error('Failed to save snapshot');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }, [context.sessionId]);

  const handleMarkComplete = useCallback(async () => {
    if (!confirm('Mark this session as complete? This action cannot be undone.')) {
      return;
    }

    setIsCompleting(true);
    try {
      const response = await fetch(`/api/virtualspace/${context.sessionId}/complete`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to mark session complete');
      }

      toast.success('Session marked as complete!');
      // Give user time to see the success message before closing
      setTimeout(() => {
        window.close();
        // Fallback if window.close() doesn't work
        router.push('/dashboard');
      }, 1500);
    } catch (error) {
      toast.error('Failed to mark session as complete');
      console.error(error);
      setIsCompleting(false);
    }
  }, [context.sessionId, router]);

  const handleCopyInviteLink = useCallback(async () => {
    if (context.inviteUrl) {
      try {
        await navigator.clipboard.writeText(context.inviteUrl);
        toast.success('Invite link copied to clipboard!');
      } catch (error) {
        toast.error('Failed to copy invite link');
      }
    }
  }, [context.inviteUrl]);

  const handleLeave = useCallback(() => {
    if (confirm('Leave this session?')) {
      router.push('/dashboard');
    }
  }, [router]);

  return (
    <AblyProvider client={ablyClient}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.leftSection}>
          <button
            onClick={handleLeave}
            className={styles.backButton}
            title="Leave Session"
          >
            <ArrowLeft size={20} />
            <span>Leave</span>
          </button>
          <h1 className={styles.title}>{getSessionTitle()}</h1>
          <span
            className={styles.badge}
            style={{
              fontSize: '0.75rem',
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor:
                context.mode === 'standalone'
                  ? '#e0f2fe'
                  : context.mode === 'free_help'
                    ? '#fef3c7'
                    : '#dcfce7',
              color:
                context.mode === 'standalone'
                  ? '#0369a1'
                  : context.mode === 'free_help'
                    ? '#92400e'
                    : '#166534',
            }}
          >
            {getModeBadge()}
          </span>
        </div>

        <div className={styles.rightSection}>
          {/* Participant count */}
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.875rem',
              color: '#64748b',
            }}
          >
            <Users size={16} />
            {context.participants.length}
          </span>

          {/* Invite button (standalone only) */}
          {context.capabilities.canInvite && context.inviteUrl && (
            <button
              onClick={handleCopyInviteLink}
              className={styles.secondaryButton}
              title="Copy invite link"
            >
              <Share2 size={20} />
              Copy Invite Link
            </button>
          )}

          {/* Jitsi Video Room — deterministic room, both users join the same room */}
          <button
            onClick={handleJoinVideoRoom}
            className={styles.secondaryButton}
            title="Join shared video room — same link for tutor and student"
          >
            <Tv2 size={16} />
            Join Video Room
          </button>

          {/* Google Meet — manual link sharing */}
          <button
            onClick={handleStartGoogleMeet}
            className={styles.primaryButton}
            title="Start Google Meet in new window"
          >
            <Video size={16} />
            Start Google Meet
          </button>

          {/* Sage button */}
          <button
            onClick={sage.isActive ? sage.deactivate : sage.activate}
            disabled={sage.isActivating}
            title={sage.isActive ? 'Close Sage panel' : 'Activate Sage AI tutor'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 14px',
              height: 36,
              background: sage.isActive ? '#006c67' : 'white',
              border: `1px solid ${sage.isActive ? '#006c67' : '#d1d5db'}`,
              borderRadius: 6,
              color: sage.isActive ? 'white' : '#374151',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: sage.isActivating ? 'wait' : 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
              opacity: sage.isActivating ? 0.7 : 1,
            }}
          >
            <Brain size={16} />
            {sage.isActivating ? 'Starting...' : 'Sage'}
          </button>

          {/* Save Snapshot button */}
          {context.capabilities.canSaveSnapshot && (
            <button
              onClick={handleSaveSnapshot}
              className={styles.secondaryButton}
              disabled={isSaving}
              title="Save whiteboard snapshot"
            >
              <Save size={20} />
              {isSaving ? 'Saving...' : 'Save Snapshot'}
            </button>
          )}

          {/* Mark Complete button (booking mode + tutor only) */}
          {context.capabilities.canComplete && (
            <button
              onClick={handleMarkComplete}
              className={styles.completeButton}
              disabled={isCompleting}
              title="Mark session as complete and close"
            >
              <CheckCircle size={20} />
              {isCompleting ? 'Completing...' : 'Mark as Complete'}
            </button>
          )}
        </div>
      </header>

      {/* Whiteboard */}
      <ChannelProvider channelName={context.channelName}>
        <EmbeddedWhiteboard
          channelName={context.channelName}
          currentUserId={context.currentUserId}
          displayName={context.participants.find((p) => p.userId === context.currentUserId)?.displayName ?? context.ownerName}
        />
      </ChannelProvider>

      {/* Sage panel — overlay, does not resize the canvas */}
      <SagePanel sage={sage} />
    </AblyProvider>
  );
}
