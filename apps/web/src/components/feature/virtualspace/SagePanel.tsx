'use client';

/**
 * SagePanel
 *
 * Sliding panel (320px, right-aligned overlay) that surfaces Sage chat
 * within a VirtualSpace session. Phase 1: text-only chat with quota display.
 *
 * Design: white background, teal (#006c67) accents, shadow matching
 * SessionControlsPanel: `0 4px 20px rgba(0,0,0,0.15)`.
 *
 * @module components/feature/virtualspace/SagePanel
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { Brain, X, Send, Lock, ScanLine, CheckCircle2, ChevronRight, ArrowRight } from 'lucide-react';
import type { UseSageVirtualSpaceReturn, SageVirtualSpaceProfile, DrivePhase, SessionRecap } from './hooks/useSageVirtualSpace';
import type { StuckLevel } from './hooks/useSageStuckDetector';

// --- Types ---

interface SagePanelProps {
  sage: UseSageVirtualSpaceReturn;
  stuckLevel?: StuckLevel;
}

// --- Profile badge colours ---

const PROFILE_BADGE: Record<SageVirtualSpaceProfile, { label: string; color: string; bg: string }> = {
  tutor:    { label: 'Tutor',    color: '#006c67', bg: '#e6f7f6' },
  copilot:  { label: 'Co-pilot', color: '#7c3aed', bg: '#f3e8ff' },
  wingman:  { label: 'Wingman',  color: '#d97706', bg: '#fef3c7' },
  observer: { label: 'Observer', color: '#64748b', bg: '#f1f5f9' },
};

// --- Component ---

// Drive phase display labels
const DRIVE_PHASE_LABEL: Record<DrivePhase, string> = {
  'calibration':   'Calibrating…',
  'activation':    'Setting up',
  'loop':          'Practice loop',
  'consolidation': 'Consolidating',
  'wrap-up':       'Wrapping up',
};

export function SagePanel({ sage, stuckLevel = 'none' }: SagePanelProps) {
  const {
    isActive,
    profile,
    quotaRemaining,
    quotaExhausted,
    messages,
    isStreaming,
    isObserving,
    error,
    drivePhase,
    sessionRecap,
    deactivate,
    sendMessage,
    observe,
    clearError,
    clearRecap,
  } = sage;

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, []);

  const handleObserve = useCallback(async () => {
    if (isStreaming || isObserving || quotaExhausted) return;
    await observe('manual');
  }, [isStreaming, isObserving, quotaExhausted, observe]);

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isStreaming || quotaExhausted) return;
    const text = inputValue;
    setInputValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    await sendMessage(text);
  }, [inputValue, isStreaming, quotaExhausted, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  if (!isActive) return null;

  const badgeInfo = profile ? PROFILE_BADGE[profile] : null;
  const showQuotaWarning = !quotaExhausted && quotaRemaining !== null && quotaRemaining < 5;

  return (
    <div
      style={{
        position: 'fixed',
        right: 0,
        top: 126,  // below the VirtualSpace header (56px) + tools strip (38px) + 16px gap
        bottom: 0,
        width: 320,
        background: 'white',
        borderLeft: '1px solid #e5e7eb',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9998, // just below the header (9999)
        fontFamily: 'inherit',
      }}
      role="complementary"
      aria-label="Sage AI tutor panel"
    >
      <style>{`
        @keyframes sage-brain-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.15); }
        }
      `}</style>
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 12px',
          height: 48,
          borderBottom: '1px solid #e5e7eb',
          flexShrink: 0,
        }}
      >
        <Brain
          size={18}
          color={stuckLevel === 'high' ? '#d97706' : '#006c67'}
          style={{
            flexShrink: 0,
            transition: 'color 0.3s ease',
            ...(stuckLevel !== 'none' && {
              animation: 'sage-brain-pulse 2s ease-in-out infinite',
            }),
          }}
        />
        <span
          style={{
            fontWeight: 600,
            fontSize: '0.9375rem',
            color: '#111827',
            flex: 1,
          }}
        >
          Sage
        </span>

        {/* Profile badge */}
        {badgeInfo && (
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 600,
              padding: '2px 7px',
              borderRadius: 4,
              color: badgeInfo.color,
              background: badgeInfo.bg,
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
            }}
          >
            {badgeInfo.label}
          </span>
        )}

        {/* Close button */}
        <button
          onClick={deactivate}
          title="Close Sage panel"
          aria-label="Close Sage panel"
          style={{
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'transparent',
            borderRadius: 4,
            cursor: 'pointer',
            color: '#6b7280',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Session Drive phase strip ── */}
      {drivePhase && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            background: '#f0fdfb',
            borderBottom: '1px solid #ccf3f0',
            fontSize: '0.75rem',
            color: '#006c67',
            fontWeight: 500,
          }}
        >
          <ChevronRight size={12} />
          <span>Session Drive</span>
          <ArrowRight size={10} style={{ opacity: 0.5 }} />
          <span>{DRIVE_PHASE_LABEL[drivePhase]}</span>
        </div>
      )}

      {/* ── Session recap card ── */}
      {sessionRecap && (
        <SessionRecapCard recap={sessionRecap} onDismiss={clearRecap} />
      )}

      {/* ── Message stream ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 12px 4px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div
          style={{
            margin: '0 12px 8px',
            padding: '8px 10px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 6,
            fontSize: '0.8125rem',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <span>{error}</span>
          <button
            onClick={clearError}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '0.75rem', padding: 0 }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Quota warning ── */}
      {showQuotaWarning && (
        <div
          style={{
            margin: '0 12px 4px',
            padding: '6px 10px',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 6,
            fontSize: '0.75rem',
            color: '#92400e',
          }}
        >
          <strong>{quotaRemaining}</strong> free session{quotaRemaining === 1 ? '' : 's'} remaining —{' '}
          <a
            href="/account/sage-pro"
            style={{ color: '#006c67', fontWeight: 600, textDecoration: 'underline' }}
          >
            Upgrade to Pro
          </a>
        </div>
      )}

      {/* ── Quota exhausted state ── */}
      {quotaExhausted ? (
        <div
          style={{
            margin: '0 12px 12px',
            padding: '14px 12px',
            background: '#f0fdfb',
            border: '1px solid #99e6e2',
            borderRadius: 8,
            textAlign: 'center',
          }}
        >
          <Lock size={20} color="#006c67" style={{ margin: '0 auto 8px', display: 'block' }} />
          <p style={{ fontSize: '0.875rem', color: '#374151', margin: '0 0 10px', fontWeight: 500 }}>
            You've used your free Sage sessions
          </p>
          <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '0 0 12px' }}>
            Your whiteboard and progress are saved. Subscribe to keep going.
          </p>
          <a
            href="/account/sage-pro"
            style={{
              display: 'inline-block',
              padding: '8px 18px',
              background: '#006c67',
              color: 'white',
              borderRadius: 6,
              fontSize: '0.875rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Upgrade to Sage Pro — £10/mo
          </a>
        </div>
      ) : (
        /* ── Input footer ── */
        <div
          style={{
            padding: '8px 12px 12px',
            borderTop: '1px solid #e5e7eb',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {/* Review my work button */}
          <button
            onClick={handleObserve}
            disabled={isStreaming || isObserving}
            title="Ask Sage to review your whiteboard work"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              width: '100%',
              padding: '6px 10px',
              background: isObserving ? '#f0fdfb' : stuckLevel !== 'none' ? '#fffbeb' : '#f9fafb',
              border: `1px solid ${isObserving ? '#99e6e2' : stuckLevel !== 'none' ? '#fde68a' : '#e5e7eb'}`,
              borderRadius: 6,
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: isObserving ? '#006c67' : stuckLevel !== 'none' ? '#92400e' : '#374151',
              cursor: isStreaming || isObserving ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: isStreaming ? 0.5 : 1,
            }}
          >
            <ScanLine size={14} />
            {isObserving ? 'Reviewing your work…' : 'Review my work'}
          </button>

          {/* Text input row */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask Sage anything..."
            rows={1}
            disabled={isStreaming}
            style={{
              flex: 1,
              resize: 'none',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              padding: '8px 10px',
              fontSize: '0.875rem',
              lineHeight: 1.5,
              fontFamily: 'inherit',
              color: '#111827',
              background: isStreaming ? '#f9fafb' : 'white',
              outline: 'none',
              overflow: 'hidden',
              minHeight: 38,
              maxHeight: 120,
              transition: 'border-color 0.15s',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#006c67'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#d1d5db'; }}
          />
          <button
            onClick={handleSend}
            disabled={isStreaming || !inputValue.trim()}
            title="Send message"
            aria-label="Send message"
            style={{
              width: 36,
              height: 36,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isStreaming || !inputValue.trim() ? '#e5e7eb' : '#006c67',
              border: 'none',
              borderRadius: 8,
              cursor: isStreaming || !inputValue.trim() ? 'not-allowed' : 'pointer',
              color: isStreaming || !inputValue.trim() ? '#9ca3af' : 'white',
              transition: 'background 0.15s',
            }}
          >
            <Send size={15} />
          </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- MessageBubble sub-component ---

interface MessageBubbleProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    isLoading?: boolean;
  };
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
      }}
    >
      <div
        style={{
          maxWidth: '88%',
          padding: '8px 11px',
          borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
          background: isUser ? '#006c67' : '#f3f4f6',
          color: isUser ? 'white' : '#111827',
          fontSize: '0.875rem',
          lineHeight: 1.55,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {message.isLoading && message.content === '' ? (
          <ThinkingDots />
        ) : (
          message.content
        )}
      </div>
    </div>
  );
}

// --- Session Recap Card ---

interface SessionRecapCardProps {
  recap: SessionRecap;
  onDismiss: () => void;
}

function SessionRecapCard({ recap, onDismiss }: SessionRecapCardProps) {
  return (
    <div
      style={{
        margin: '8px 12px',
        padding: '12px',
        background: '#f0fdfb',
        border: '1px solid #99e6e2',
        borderRadius: 8,
        fontSize: '0.8125rem',
        color: '#374151',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <CheckCircle2 size={14} color="#006c67" />
        <span style={{ fontWeight: 600, color: '#006c67' }}>Session recap</span>
        <button
          onClick={onDismiss}
          style={{ marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0, fontSize: '0.75rem' }}
        >
          Dismiss
        </button>
      </div>

      {recap.topicsCovered.length > 0 && (
        <p style={{ margin: '0 0 4px' }}>
          <strong>Covered:</strong> {recap.topicsCovered.join(', ')}
        </p>
      )}

      {recap.timeSpent > 0 && (
        <p style={{ margin: '0 0 4px', color: '#6b7280' }}>
          {recap.timeSpent} min · mastery +{(recap.masteryDelta * 100).toFixed(0)}%
        </p>
      )}

      {recap.strongMoments.length > 0 && (
        <p style={{ margin: '0 0 4px' }}>
          <strong>Well done:</strong> {recap.strongMoments[0]}
        </p>
      )}

      {recap.suggestedNextSteps.length > 0 && (
        <p style={{ margin: '0 0 6px' }}>
          <strong>Next:</strong> {recap.suggestedNextSteps[0]}
        </p>
      )}

      {recap.lessonPlanPrompt && (
        <a
          href={`/account/sage-pro?planPrompt=${encodeURIComponent(recap.lessonPlanPrompt)}`}
          style={{
            display: 'inline-block',
            marginTop: 4,
            fontSize: '0.75rem',
            color: '#006c67',
            fontWeight: 600,
            textDecoration: 'underline',
          }}
        >
          Create follow-up lesson plan →
        </a>
      )}
    </div>
  );
}

// --- Thinking dots animation ---

function ThinkingDots() {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const id = setInterval(() => {
      setDots(d => (d.length >= 3 ? '' : d + '.'));
    }, 400);
    return () => clearInterval(id);
  }, []);

  return (
    <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.875rem' }}>
      Sage is thinking{dots}
    </span>
  );
}
