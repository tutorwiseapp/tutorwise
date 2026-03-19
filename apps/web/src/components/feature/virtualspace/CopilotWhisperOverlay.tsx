'use client';

/**
 * CopilotWhisperOverlay
 *
 * Subtle tutor-facing overlay that shows Sage's co-pilot suggestions
 * during a live tutoring session. Only rendered when the current user is
 * the tutor and Sage is in Co-pilot profile.
 *
 * Positioned at the bottom-right, above the canvas controls. Each whisper
 * has Accept (stamps shape with tutor attribution, no Sage branding) and
 * Dismiss actions.
 *
 * Design: minimal — does not distract from teaching. Max 2 whispers visible
 * at once; older ones are auto-dismissed after 60s.
 *
 * @module components/feature/virtualspace/CopilotWhisperOverlay
 */

import { useEffect, useCallback, useState } from 'react';
import { Lightbulb, Check, X, Send } from 'lucide-react';
import type { CopilotWhisper } from './hooks/useCopilotWhispers';
import type { UseCopilotWhispersReturn } from './hooks/useCopilotWhispers';

const URGENCY_COLOR: Record<CopilotWhisper['urgency'], string> = {
  low:    '#64748b',
  medium: '#d97706',
  high:   '#dc2626',
};

const URGENCY_BG: Record<CopilotWhisper['urgency'], string> = {
  low:    '#f8fafc',
  medium: '#fffbeb',
  high:   '#fef2f2',
};

const URGENCY_BORDER: Record<CopilotWhisper['urgency'], string> = {
  low:    '#e2e8f0',
  medium: '#fde68a',
  high:   '#fecaca',
};

const AUTO_DISMISS_MS = 60_000;

interface CopilotWhisperOverlayProps {
  copilot: UseCopilotWhispersReturn;
  /** Called when tutor accepts a whisper — parent stamps the shape on canvas */
  onStampShape: (shape: { type: string; props?: Record<string, unknown> }) => void;
  /** M5 fix: tutor can ask Sage a direct question from the whisper overlay */
  onAskSage?: (text: string) => void;
}

export function CopilotWhisperOverlay({ copilot, onStampShape, onAskSage }: CopilotWhisperOverlayProps) {
  const { whispers, dismissWhisper, acceptWhisper } = copilot;

  // Auto-dismiss stale whispers after 60s
  useEffect(() => {
    if (!whispers.length) return;
    const id = setTimeout(() => {
      // Dismiss the oldest whisper
      if (whispers[0]) dismissWhisper(whispers[0].id);
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [whispers, dismissWhisper]);

  const handleAccept = useCallback(async (whisperId: string) => {
    const result = await acceptWhisper(whisperId);
    if (result?.shape?.shape) {
      onStampShape(result.shape.shape as { type: string; props?: Record<string, unknown> });
    }
  }, [acceptWhisper, onStampShape]);

  // Show at most 2 whispers
  const visible = whispers.slice(0, 2);

  if (!visible.length) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 80,        // above SessionControlsPanel
        right: 12,
        width: 300,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 9997,
        fontFamily: 'inherit',
      }}
      role="region"
      aria-label="Sage co-pilot suggestions"
    >
      {visible.map(whisper => (
        <WhisperCard
          key={whisper.id}
          whisper={whisper}
          onAccept={() => handleAccept(whisper.id)}
          onDismiss={() => dismissWhisper(whisper.id)}
          onAskSage={onAskSage}
        />
      ))}
    </div>
  );
}

// ── WhisperCard ─────────────────────────────────────────────────────────────

interface WhisperCardProps {
  whisper: CopilotWhisper;
  onAccept: () => void;
  onDismiss: () => void;
  onAskSage?: (text: string) => void;
}

function WhisperCard({ whisper, onAccept, onDismiss, onAskSage }: WhisperCardProps) {
  const color  = URGENCY_COLOR[whisper.urgency];
  const bg     = URGENCY_BG[whisper.urgency];
  const border = URGENCY_BORDER[whisper.urgency];

  // M5: "Ask Sage" inline input state
  const [askOpen, setAskOpen] = useState(false);
  const [askText, setAskText] = useState('');

  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 8,
        padding: '10px 12px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Lightbulb size={13} color={color} />
        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Sage suggests
        </span>
        <button
          onClick={onDismiss}
          title="Dismiss"
          style={{ marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2, display: 'flex' }}
        >
          <X size={13} />
        </button>
      </div>

      {/* Message */}
      <p style={{ margin: '0 0 8px', fontSize: '0.8125rem', color: '#374151', lineHeight: 1.45 }}>
        {whisper.message}
      </p>

      {/* Actions */}
      {whisper.action && (
        <button
          onClick={onAccept}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            width: '100%',
            padding: '5px 10px',
            background: color,
            color: 'white',
            border: 'none',
            borderRadius: 5,
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Check size={12} />
          {whisper.action.type === 'stamp'
            ? `Stamp ${whisper.action.shape.type.replace(/-/g, ' ')}`
            : 'Accept'}
        </button>
      )}

      {!whisper.action && (
        <button
          onClick={onDismiss}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 8px',
            background: 'transparent',
            color: '#6b7280',
            border: '1px solid #e5e7eb',
            borderRadius: 5,
            fontSize: '0.75rem',
            cursor: 'pointer',
          }}
        >
          Got it
        </button>
      )}

      {/* M5: Ask Sage privately */}
      {onAskSage && (
        <div style={{ marginTop: 6 }}>
          {!askOpen ? (
            <button
              onClick={() => setAskOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#9ca3af',
                fontSize: '0.6875rem',
                padding: 0,
                textDecoration: 'underline',
              }}
            >
              Ask Sage privately…
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                autoFocus
                value={askText}
                onChange={e => setAskText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && askText.trim()) {
                    onAskSage(askText.trim());
                    setAskText('');
                    setAskOpen(false);
                  }
                  if (e.key === 'Escape') setAskOpen(false);
                }}
                placeholder="Ask Sage…"
                style={{
                  flex: 1,
                  fontSize: '0.75rem',
                  padding: '3px 6px',
                  border: '1px solid #d1d5db',
                  borderRadius: 4,
                  outline: 'none',
                }}
              />
              <button
                onClick={() => {
                  if (askText.trim()) {
                    onAskSage(askText.trim());
                    setAskText('');
                    setAskOpen(false);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '3px 6px',
                  background: color,
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  color: 'white',
                }}
              >
                <Send size={11} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
