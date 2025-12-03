/**
 * Filename: WiseSpaceHeader.tsx
 * Purpose: Header for WiseSpace session room with action buttons (v5.8)
 * Created: 2025-11-15
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Video, Save, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { openGoogleMeetWindow, trackMeetSession } from '@/lib/google-meet';
import styles from './WiseSpaceHeader.module.css';

interface WiseSpaceHeaderProps {
  bookingId: string;
  sessionTitle?: string;
  onSaveSnapshot: () => Promise<void>;
  onMarkComplete: () => Promise<void>;
}

export function WiseSpaceHeader({
  bookingId,
  sessionTitle,
  onSaveSnapshot,
  onMarkComplete,
}: WiseSpaceHeaderProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const handleStartGoogleMeet = () => {
    try {
      openGoogleMeetWindow(bookingId, sessionTitle);
      trackMeetSession(bookingId);
      toast.success('Google Meet opened in new window');
    } catch (error) {
      toast.error('Failed to start Google Meet');
      console.error(error);
    }
  };

  const handleSaveSnapshot = async () => {
    setIsSaving(true);
    try {
      await onSaveSnapshot();
      toast.success('Whiteboard snapshot saved!');
    } catch (error) {
      toast.error('Failed to save snapshot');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!confirm('Mark this session as complete? This action cannot be undone.')) {
      return;
    }

    setIsCompleting(true);
    try {
      await onMarkComplete();
      toast.success('Session marked as complete!');
      // Give user time to see the success message before closing
      setTimeout(() => {
        window.close();
        // Fallback if window.close() doesn't work (e.g., not opened by script)
        router.push('/dashboard');
      }, 1500);
    } catch (error) {
      toast.error('Failed to mark session as complete');
      console.error(error);
      setIsCompleting(false);
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        <button
          onClick={() => router.push('/dashboard')}
          className={styles.backButton}
          title="Return to Dashboard"
        >
          <ArrowLeft size={20} />
          <span>Return to Dashboard</span>
        </button>
        {sessionTitle && <h1 className={styles.title}>{sessionTitle}</h1>}
      </div>

      <div className={styles.rightSection}>
        <button
          onClick={handleStartGoogleMeet}
          className={styles.primaryButton}
          title="Start Google Meet in new window"
        >
          <Video size={20} />
          Start Google Meet
        </button>

        <button
          onClick={handleSaveSnapshot}
          className={styles.secondaryButton}
          disabled={isSaving}
          title="Save whiteboard snapshot"
        >
          <Save size={20} />
          {isSaving ? 'Saving...' : 'Save Snapshot'}
        </button>

        <button
          onClick={handleMarkComplete}
          className={styles.completeButton}
          disabled={isCompleting}
          title="Mark session as complete and close"
        >
          <CheckCircle size={20} />
          {isCompleting ? 'Completing...' : 'Mark as Complete'}
        </button>
      </div>
    </header>
  );
}
