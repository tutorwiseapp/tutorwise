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

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AblyProvider, ChannelProvider } from 'ably/react';
import * as Ably from 'ably';
import { ArrowLeft, Video, Save, CheckCircle, Share2, BookOpen, StickyNote, UserCheck, Tv2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { openGoogleMeetWindow, trackMeetSession } from '@/lib/google-meet';
import { EmbeddedWhiteboard } from '@/components/feature/virtualspace/EmbeddedWhiteboard';
import type { VirtualSpaceSession } from '@/lib/virtualspace';
import styles from '@/components/feature/virtualspace/VirtualSpaceHeader.module.css';
import { useSageVirtualSpace } from '@/components/feature/virtualspace/hooks/useSageVirtualSpace';
import { useSageStuckDetector } from '@/components/feature/virtualspace/hooks/useSageStuckDetector';
import { useCopilotWhispers } from '@/components/feature/virtualspace/hooks/useCopilotWhispers';
import { SagePanel } from '@/components/feature/virtualspace/SagePanel';
import { CopilotWhisperOverlay } from '@/components/feature/virtualspace/CopilotWhisperOverlay';
import { useLessonPlan } from '@/components/feature/virtualspace/hooks/useLessonPlan';
import { LessonPlanDrawer } from '@/components/feature/virtualspace/LessonPlanDrawer';
import { useMultiStudentIntelligence } from '@/components/feature/virtualspace/hooks/useMultiStudentIntelligence';
import type { SageCanvasShapeSpec } from '@/components/feature/virtualspace/canvas/canvasBlockParser';
import { TutorNotesPanel } from '@/components/feature/virtualspace/whiteboard/panels/TutorNotesPanel';
import { ParticipantListPanel } from '@/components/feature/virtualspace/whiteboard/panels/ParticipantListPanel';
import { HomeworkDialog } from '@/components/feature/virtualspace/whiteboard/panels/HomeworkDialog';
import { VideoPanel } from '@/components/feature/virtualspace/whiteboard/panels/VideoPanel';

interface VirtualSpaceClientProps {
  context: VirtualSpaceSession;
}

function formatTimeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  return `${mins}m ago`;
}

export function VirtualSpaceClient({ context }: VirtualSpaceClientProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Pending shapes from AI assistant — bridged into the tldraw canvas
  const [pendingShapes, setPendingShapes] = useState<SageCanvasShapeSpec[]>([]);
  const dispatchShape = useCallback((shape: SageCanvasShapeSpec) => {
    setPendingShapes(prev => [...prev, shape]);
  }, []);
  const clearPendingShapes = useCallback(() => {
    setPendingShapes([]);
  }, []);

  // Snapshot capture ref — populated by SageCanvasWriter on mount
  const snapshotFnRef = useRef<(() => Promise<string | null>) | null>(null);
  const registerSnapshotFn = useCallback((fn: () => Promise<string | null>) => {
    snapshotFnRef.current = fn;
  }, []);

  // Erase pattern counter — incremented when SageCanvasWriter detects repeated erasures
  const [eraseCount, setEraseCount] = useState(0);
  const handleErasePattern = useCallback(() => {
    setEraseCount(c => c + 1);
  }, []);

  // Initialize Ably client once (stable ref — must come before useSageVirtualSpace)
  const [ablyClient] = useState(() => new Ably.Realtime({
    key: process.env.NEXT_PUBLIC_ABLY_API_KEY,
    clientId: context.currentUserId,
  }));

  // Clean up Ably connection on unmount
  useEffect(() => {
    return () => { ablyClient.close(); };
  }, [ablyClient]);

  // G3/G4: stable ref for extra context — updated below after lessonPlan + multiStudent are ready.
  // A ref-backed stable function is used so useSageVirtualSpace doesn't need to be re-initialized.
  const extraContextFnRef = useRef<() => string>(() => '');
  const stableExtraContextFn = useCallback(() => extraContextFnRef.current(), []);

  // Sage integration — Phase 4: pass Ably client + tutor context for presence monitoring
  const sage = useSageVirtualSpace({
    sessionId: context.sessionId,
    currentUserId: context.currentUserId,
    dispatchShape,
    snapshotFnRef,
    ablyClient,
    channelName: context.channelName,
    tutorId: context.booking?.tutorId,
    extraContextFn: stableExtraContextFn,
  });

  // Stuck detector — only active when Sage panel is open
  const { stuckLevel, resetIdleTimer, resetEraseCount } = useSageStuckDetector(
    sage.isActive,
    eraseCount,
  );

  // Auto-observe at High stuck level
  useEffect(() => {
    if (
      stuckLevel === 'high' &&
      sage.isActive &&
      !sage.isStreaming &&
      !sage.isObserving &&
      !sage.quotaExhausted
    ) {
      sage.observe('stuck');
      resetIdleTimer();
      resetEraseCount();
      setEraseCount(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stuckLevel]);

  // Phase 6: tutor last-active tracking (for co-pilot quiet period)
  const tutorLastActiveAtRef = useRef<number>(0);
  const handleTutorActivity = useCallback(() => {
    tutorLastActiveAtRef.current = Date.now();
  }, []);
  // Update tutor activity whenever the tutor stamps a shape (draw events)
  useEffect(() => {
    if (!ablyClient) return;
    const ch = ablyClient.channels.get(context.channelName);
    const handler = (msg: Ably.Message) => {
      if (msg.clientId === context.currentUserId) handleTutorActivity();
    };
    ch.subscribe('draw', handler);
    return () => ch.unsubscribe('draw', handler);
  }, [ablyClient, context.channelName, context.currentUserId, handleTutorActivity]);

  // Phase 6: co-pilot whispers  (M1 fix: pass ref, not computed value)
  const copilot = useCopilotWhispers({
    ablyClient,
    sessionId: context.sessionId,
    sageSessionId: sage.sageSessionId,
    currentUserId: context.currentUserId,
    tutorId: context.booking?.tutorId,
    profile: sage.profile,
    isActive: sage.isActive,
    isStreaming: sage.isStreaming,
    stuckSignal: stuckLevel,
    messages: sage.messages,
    tutorLastActiveAtRef,
  });

  // Stamp shape from co-pilot accept — tutor attribution (no Sage branding)
  const handleCopilotStamp = useCallback((shape: { type: string; props?: Record<string, unknown> }) => {
    // Dispatch as a regular canvas shape without sageAttributed flag
    // Use pendingShapes but tag as tutor-attributed via a special meta flag
    setPendingShapes(prev => [
      ...prev,
      { type: shape.type, props: { ...(shape.props ?? {}), _tutorAttributed: true } } as SageCanvasShapeSpec,
    ]);
  }, []);

  // Phase 7: lesson plan
  const isTutor = context.currentUserId === context.booking?.tutorId;

  // Panel visibility state
  const [tutorNotesOpen, setTutorNotesOpen] = useState(false);
  const [participantListOpen, setParticipantListOpen] = useState(false);
  const [homeworkDialogOpen, setHomeworkDialogOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const lessonPlan = useLessonPlan({
    sessionId: context.sessionId,
    sageSessionId: sage.sageSessionId,
    isActive: sage.isActive,
  });

  // Phase 8: multi-student intelligence (R&D — H4 wiring fix)
  // Participants excluding the human tutor (tutor's activity is tracked separately)
  const studentParticipants = context.participants.filter(
    p => p.userId !== context.booking?.tutorId
  );
  const multiStudent = useMultiStudentIntelligence({
    participants: studentParticipants,
    isActive: sage.isActive,
  });

  // Wire multiStudent.recordActivity to draw channel events
  useEffect(() => {
    if (!ablyClient || !sage.isActive) return;
    const ch = ablyClient.channels.get(context.channelName);
    const handler = (msg: Ably.Message) => {
      const participant = context.participants.find(p => p.userId === msg.clientId);
      if (participant && msg.clientId && msg.clientId !== context.booking?.tutorId) {
        multiStudent.recordActivity(msg.clientId, participant.displayName);
      }
    };
    ch.subscribe('draw', handler);
    return () => { ch.unsubscribe('draw', handler); };
  }, [ablyClient, sage.isActive, context.channelName, context.participants, context.booking?.tutorId, multiStudent]);

  // G3 + G4: keep extraContextFnRef up-to-date with latest multi-student + lesson plan context.
  // Called on every relevant state change so sendMessage always gets the freshest context.
  useEffect(() => {
    extraContextFnRef.current = () => {
      const parts: string[] = [];

      // G3: multi-student signals (only meaningful with ≥2 students)
      if (studentParticipants.length >= 2) {
        const msBlock = multiStudent.buildContextBlock();
        if (msBlock) parts.push(msBlock);
      }

      // G4: current lesson plan phase
      if (lessonPlan.executionId && lessonPlan.activePhases) {
        const phase = lessonPlan.activePhases[lessonPlan.activePhaseIndex];
        if (phase) {
          const total = lessonPlan.activePhases.length;
          const phaseNum = lessonPlan.activePhaseIndex + 1;
          parts.push(
            `## Active Lesson Plan — Phase ${phaseNum}/${total}: ${phase.name}\n` +
            `Type: ${phase.type} | Duration: ${phase.duration} min\n` +
            `Instruction: ${phase.instruction}\n` +
            `Success criteria: ${phase.successCriteria}` +
            (phase.adaptations
              ? `\nIf student struggles: ${phase.adaptations.ifStruggling}\nIf correct: ${phase.adaptations.ifCorrect}`
              : '')
          );
        }
      }

      return parts.join('\n\n');
    };
  }, [multiStudent, lessonPlan, studentParticipants.length]);

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

  // Silent auto-save — runs every 90s if tutor (or owner)
  const handleAutoSave = useCallback(async () => {
    if (!context.capabilities.canSaveSnapshot) return;
    const snapshotData = await (window as any).__virtualSpaceExportSnapshot?.();
    if (!snapshotData) return;
    setIsAutoSaving(true);
    try {
      const res = await fetch(`/api/virtualspace/${context.sessionId}/snapshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotData }),
      });
      if (res.ok) setLastSavedAt(new Date());
    } catch {
      // auto-save failure is non-critical, stay silent
    } finally {
      setIsAutoSaving(false);
    }
  }, [context.sessionId, context.capabilities.canSaveSnapshot]);

  useEffect(() => {
    const interval = setInterval(handleAutoSave, 90_000);
    return () => clearInterval(interval);
  }, [handleAutoSave]);

  const handleSendHomework = useCallback((text: string, dueDate: string) => {
    // Broadcast homework to all participants via session channel
    const sessionChannelName = `session:${context.channelName}`;
    const ch = ablyClient.channels.get(sessionChannelName);
    ch.publish('session:homework', { text, dueDate, tutorName: context.ownerName });
    toast.success('Homework sent to student');
  }, [ablyClient, context.channelName, context.ownerName]);

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
          {/* Participant count — click to toggle list */}
          <button
            onClick={() => setParticipantListOpen((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.875rem',
              color: participantListOpen ? '#006c67' : '#64748b',
              background: participantListOpen ? '#dcfce7' : 'transparent',
              border: 'none',
              borderRadius: 6,
              padding: '4px 8px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
            title="View participants"
          >
            <UserCheck size={16} />
            {context.participants.length}
          </button>

          {/* Tutor notes (tutor only) */}
          {isTutor && (
            <button
              onClick={() => setTutorNotesOpen((v) => !v)}
              className={styles.secondaryButton}
              title="Private tutor notes"
              style={{ background: tutorNotesOpen ? '#fef3c7' : undefined, color: tutorNotesOpen ? '#92400e' : undefined }}
            >
              <StickyNote size={16} />
              Notes
            </button>
          )}

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

          {/* LiveKit — in-app video call (primary) */}
          <button
            onClick={() => setVideoOpen((v) => !v)}
            className={videoOpen ? styles.primaryButton : styles.secondaryButton}
            title="Start in-app video call (LiveKit)"
          >
            <Video size={16} />
            {videoOpen ? 'Video On' : 'Video Call'}
          </button>

          {/* Phase 7: Load Plan button — tutor only */}
          {isTutor && sage.isActive && (
            <button
              onClick={lessonPlan.openDrawer}
              className={styles.secondaryButton}
              title="Load a lesson plan into this session"
            >
              <BookOpen size={16} />
              Load Plan
            </button>
          )}

          {/* Auto-save status */}
          {context.capabilities.canSaveSnapshot && lastSavedAt && (
            <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>
              {isAutoSaving ? 'Saving…' : `Saved ${formatTimeAgo(lastSavedAt)}`}
            </span>
          )}

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
          pendingShapes={pendingShapes}
          onShapesStamped={clearPendingShapes}
          onRegisterSnapshot={registerSnapshotFn}
          onErasePattern={handleErasePattern}
          onAskSage={sage.isActive ? sage.deactivate : sage.activate}
          isSageActive={sage.isActive}
          isSageActivating={sage.isActivating}
          sageProfile={sage.profile ?? undefined}
          isTutor={isTutor}
          onHomework={() => setHomeworkDialogOpen(true)}
          initialSnapshotUrl={context.snapshotUrl}
          onAutoSaved={() => setLastSavedAt(new Date())}
        />
      </ChannelProvider>

      {/* Sage panel — overlay, does not resize the canvas */}
      <SagePanel sage={sage} stuckLevel={stuckLevel} />

      {/* Phase 6: Co-pilot whisper overlay — tutor-only, bottom-right */}
      {isTutor && (
        <CopilotWhisperOverlay
          copilot={copilot}
          onStampShape={handleCopilotStamp}
          onAskSage={sage.sendMessage}
        />
      )}

      {/* Phase 7: Lesson plan drawer — slide-in from right */}
      <LessonPlanDrawer lessonPlan={lessonPlan} />

      {/* Tutor private notes */}
      {isTutor && tutorNotesOpen && (
        <TutorNotesPanel
          sessionId={context.sessionId}
          onClose={() => setTutorNotesOpen(false)}
        />
      )}

      {/* Participant list */}
      {participantListOpen && (
        <ParticipantListPanel
          participants={context.participants}
          currentUserId={context.currentUserId}
          tutorId={context.booking?.tutorId}
          onClose={() => setParticipantListOpen(false)}
        />
      )}

      {/* Homework dialog */}
      {homeworkDialogOpen && (
        <HomeworkDialog
          onClose={() => setHomeworkDialogOpen(false)}
          onSend={handleSendHomework}
        />
      )}

      {/* In-app video call panel */}
      {videoOpen && (
        <VideoPanel
          sessionId={context.sessionId}
          onClose={() => setVideoOpen(false)}
        />
      )}
    </AblyProvider>
  );
}
