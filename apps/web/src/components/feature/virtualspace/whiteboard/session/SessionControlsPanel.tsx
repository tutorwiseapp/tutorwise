/**
 * SessionControlsPanel
 * Renders in tldraw's TopPanel slot — 6 session control CTAs using Lucide icons
 * to match tldraw's native icon style.
 */

'use client';

import { MessageSquare, Hand, Timer, Smile, Eye, Monitor, Grid3X3, Zap, Lock, Unlock, ClipboardList } from 'lucide-react';
import { useSession } from './SessionContext';
import { useState, useEffect } from 'react';
import { useEditor } from '@tldraw/editor';

const BTN_SIZE = 32;
const ICON_SIZE = 16;

interface ControlButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  badge?: number;
  color?: string;
}

function ControlButton({ icon, label, active, onClick, badge, color }: ControlButtonProps) {
  const [hovered, setHovered] = useState(false);
  const activeColor = color ?? '#2563eb';

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        title={label}
        aria-label={label}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: BTN_SIZE,
          height: BTN_SIZE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 6,
          border: 'none',
          cursor: 'pointer',
          background: active
            ? `${activeColor}18`
            : hovered
            ? 'rgba(0,0,0,0.06)'
            : 'transparent',
          color: active ? activeColor : '#1e293b',
          transition: 'background 0.12s, color 0.12s',
          flexShrink: 0,
        }}
      >
        {icon}
      </button>
      {badge !== undefined && badge > 0 && (
        <span
          style={{
            position: 'absolute',
            top: 3,
            right: 3,
            background: '#ef4444',
            color: 'white',
            borderRadius: 99,
            fontSize: 9,
            fontWeight: 700,
            minWidth: 14,
            height: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 3px',
            pointerEvents: 'none',
            lineHeight: 1,
          }}
        >
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </div>
  );
}

interface SessionControlsPanelProps {
  isTutor?: boolean;
  onHomework?: () => void;
}

export function SessionControlsPanel({ isTutor, onHomework }: SessionControlsPanelProps) {
  const {
    chatOpen,
    setChatOpen,
    chatMessages,
    myHandRaised,
    toggleRaiseHand,
    timerOpen,
    setTimerOpen,
    timerRunning,
    timerSeconds,
    sendReaction,
    followMode,
    toggleFollowMode,
    drawLocked,
    lockDraw,
  } = useSession();

  const editor = useEditor();
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const [gridMode, setGridMode] = useState(false);
  const [isLaser, setIsLaser] = useState(false);

  // Sync laser state when tool changes externally
  useEffect(() => {
    return editor.store.listen(() => {
      const currentTool = editor.getCurrentToolId?.() ?? (editor as any).currentToolId;
      setIsLaser(currentTool === 'laser');
    }, { scope: 'session' });
  }, [editor]);

  const REACTIONS = ['👍', '❤️', '😂', '🎉', '🤔', '👏', '🔥', '💡'];

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        right: 172,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: '3px 6px',
        background: 'hsl(204, 16%, 94%)',
        borderRadius: 9,
        pointerEvents: 'all',
        zIndex: 400,
      }}
    >
      {/* Chat */}
      <ControlButton
        icon={<MessageSquare size={ICON_SIZE} />}
        label="Chat"
        active={chatOpen}
        onClick={() => setChatOpen(!chatOpen)}
        badge={chatMessages.length > 0 && !chatOpen ? chatMessages.length : undefined}
        color="#2563eb"
      />

      {/* Raise Hand */}
      <ControlButton
        icon={<Hand size={ICON_SIZE} />}
        label={myHandRaised ? 'Lower hand' : 'Raise hand'}
        active={myHandRaised}
        onClick={() => toggleRaiseHand('Me')}
        color="#f59e0b"
      />

      {/* Timer */}
      <div style={{ position: 'relative' }}>
        <ControlButton
          icon={
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600 }}>
              <Timer size={ICON_SIZE} />
              {timerRunning && timerSeconds > 0 && (
                <span style={{ color: timerSeconds <= 10 ? '#ef4444' : '#16a34a', minWidth: 32 }}>
                  {formatTime(timerSeconds)}
                </span>
              )}
            </span>
          }
          label="Timer"
          active={timerOpen || timerRunning}
          onClick={() => setTimerOpen(!timerOpen)}
          color="#7c3aed"
        />
      </div>

      {/* Reactions */}
      <div style={{ position: 'relative' }}>
        <ControlButton
          icon={<Smile size={ICON_SIZE} />}
          label="Reactions"
          active={reactionPickerOpen}
          onClick={() => setReactionPickerOpen((v) => !v)}
          color="#ec4899"
        />
        {reactionPickerOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginTop: 6,
              background: 'white',
              borderRadius: 10,
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              border: '1px solid rgba(0,0,0,0.08)',
              display: 'flex',
              gap: 2,
              padding: 6,
              zIndex: 9999,
            }}
          >
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  sendReaction(emoji);
                  setReactionPickerOpen(false);
                }}
                style={{
                  fontSize: 20,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: 6,
                  lineHeight: 1,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Follow Mode */}
      <ControlButton
        icon={<Eye size={ICON_SIZE} />}
        label={followMode ? 'Exit follow mode' : 'Follow mode'}
        active={followMode}
        onClick={toggleFollowMode}
        color="#059669"
      />

      {/* Screen Share */}
      <ControlButton
        icon={<Monitor size={ICON_SIZE} />}
        label="Screen share"
        onClick={() => {
          if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getDisplayMedia) {
            navigator.mediaDevices.getDisplayMedia({ video: true }).catch(() => {});
          }
        }}
        color="#0ea5e9"
      />

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.12)', margin: '0 2px' }} />

      {/* Grid toggle */}
      <ControlButton
        icon={<Grid3X3 size={ICON_SIZE} />}
        label={gridMode ? 'Hide grid' : 'Show grid'}
        active={gridMode}
        onClick={() => {
          const next = !gridMode;
          setGridMode(next);
          (editor as any).updateDocumentSettings?.({ isGridMode: next });
        }}
        color="#64748b"
      />

      {/* Laser pointer */}
      <ControlButton
        icon={<Zap size={ICON_SIZE} />}
        label={isLaser ? 'Exit laser pointer' : 'Laser pointer'}
        active={isLaser}
        onClick={() => {
          if (isLaser) {
            editor.setCurrentTool('select');
            setIsLaser(false);
          } else {
            editor.setCurrentTool('laser');
            setIsLaser(true);
          }
        }}
        color="#ef4444"
      />

      {/* Draw lock — tutor only */}
      {isTutor && (
        <ControlButton
          icon={drawLocked ? <Lock size={ICON_SIZE} /> : <Unlock size={ICON_SIZE} />}
          label={drawLocked ? 'Unlock student drawing' : 'Lock student drawing'}
          active={drawLocked}
          onClick={() => lockDraw(!drawLocked)}
          color="#f59e0b"
        />
      )}

      {/* Set homework — tutor only */}
      {isTutor && onHomework && (
        <ControlButton
          icon={<ClipboardList size={ICON_SIZE} />}
          label="Set homework"
          onClick={onHomework}
          color="#7c3aed"
        />
      )}

    </div>
  );
}
