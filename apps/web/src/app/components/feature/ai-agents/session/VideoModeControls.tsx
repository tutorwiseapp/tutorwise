/**
 * Filename: VideoModeControls.tsx
 * Purpose: Video mode controls for AI tutor sessions
 * Created: 2026-02-24
 * Phase: 3B - VirtualSpace Integration
 *
 * Displays controls for:
 * - Joining video session
 * - Requesting human tutor handoff
 * - Viewing current video session status
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import styles from './VideoModeControls.module.css';

interface VideoModeControlsProps {
  sessionId: string;
  sessionMode: 'chat' | 'video' | 'hybrid';
  virtualspaceSessionId?: string | null;
  aiTutorName: string;
  onModeChange?: (newMode: 'chat' | 'video' | 'hybrid') => void;
}

export default function VideoModeControls({
  sessionId,
  sessionMode,
  virtualspaceSessionId,
  aiTutorName,
  onModeChange
}: VideoModeControlsProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHandoffModal, setShowHandoffModal] = useState(false);

  const handleJoinVideo = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/ai-agents/sessions/${sessionId}/join-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_title: `AI Tutor: ${aiTutorName}`
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start video session');
      }

      const data = await response.json();

      toast.success('Video session started!');

      // Notify parent of mode change
      if (onModeChange) {
        onModeChange('video');
      }

      // Redirect to VirtualSpace
      router.push(data.join_url);

    } catch (error) {
      console.error('Join video error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start video');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestHandoff = async (keepAi: boolean) => {
    setIsProcessing(true);
    setShowHandoffModal(false);

    try {
      const response = await fetch(`/api/ai-agents/sessions/${sessionId}/handoff-to-human`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keep_ai: keepAi,
          message: 'Client requested human tutor assistance'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to request handoff');
      }

      const data = await response.json();

      toast.success(data.message);

      // Notify parent of mode change
      if (onModeChange && keepAi) {
        onModeChange('hybrid');
      }

    } catch (error) {
      console.error('Handoff error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to request handoff');
    } finally {
      setIsProcessing(false);
    }
  };

  // Chat mode - show video join button
  if (sessionMode === 'chat') {
    return (
      <div className={styles.controls}>
        <button
          className={styles.videoButton}
          onClick={handleJoinVideo}
          disabled={isProcessing}
        >
          <span className={styles.icon}>📹</span>
          <span>{isProcessing ? 'Starting video...' : 'Join Video Session'}</span>
        </button>
        <p className={styles.hint}>
          Upgrade to video mode for face-to-face tutoring with {aiTutorName}
        </p>
      </div>
    );
  }

  // Video or hybrid mode - show status and handoff option
  return (
    <div className={styles.controls}>
      <div className={styles.status}>
        <div className={styles.statusBadge}>
          <span className={styles.liveIndicator}></span>
          <span>{sessionMode === 'hybrid' ? 'Hybrid Mode' : 'Video Mode'}</span>
        </div>
        {virtualspaceSessionId && (
          <a
            href={`/virtualspace/${virtualspaceSessionId}`}
            className={styles.joinLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            Rejoin Video
          </a>
        )}
      </div>

      {sessionMode === 'video' && (
        <>
          <button
            className={styles.handoffButton}
            onClick={() => setShowHandoffModal(true)}
            disabled={isProcessing}
          >
            <span className={styles.icon}>👤</span>
            <span>Request Human Tutor</span>
          </button>
          <p className={styles.hint}>
            Need extra help? Invite a human tutor to join your session
          </p>
        </>
      )}

      {sessionMode === 'hybrid' && (
        <div className={styles.hybridInfo}>
          <span className={styles.icon}>✅</span>
          <span>Human tutor has been invited to your session</span>
        </div>
      )}

      {/* Handoff Modal */}
      {showHandoffModal && (
        <div className={styles.modal} onClick={() => setShowHandoffModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Request Human Tutor</h3>
            <p className={styles.modalText}>
              Would you like the AI tutor to stay in the session, or hand off completely?
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.modalButtonSecondary}
                onClick={() => handleRequestHandoff(true)}
                disabled={isProcessing}
              >
                Keep AI (Hybrid Mode)
              </button>
              <button
                className={styles.modalButtonPrimary}
                onClick={() => handleRequestHandoff(false)}
                disabled={isProcessing}
              >
                AI Leaves
              </button>
            </div>
            <button
              className={styles.modalClose}
              onClick={() => setShowHandoffModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
