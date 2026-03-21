/**
 * TutorNotesPanel
 * Private floating notepad for the tutor — never broadcast to other participants.
 * Persisted in localStorage keyed by sessionId.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { StickyNote, X, GripVertical } from 'lucide-react';

interface TutorNotesPanelProps {
  sessionId: string;
  onClose: () => void;
}

const STORAGE_KEY = (id: string) => `tutor-notes-${id}`;

export function TutorNotesPanel({ sessionId, onClose }: TutorNotesPanelProps) {
  const storageKey = STORAGE_KEY(sessionId);
  const [notes, setNotes] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(storageKey) ?? '';
  });

  // Persist on change
  useEffect(() => {
    localStorage.setItem(storageKey, notes);
  }, [storageKey, notes]);

  // Drag-to-reposition
  const panelRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  const [pos, setPos] = useState({ x: 24, y: 80 });

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    const startX = e.clientX - pos.x;
    const startY = e.clientY - pos.y;

    const onMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      setPos({ x: ev.clientX - startX, y: ev.clientY - startY });
    };
    const onUp = () => {
      isResizing.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: 280,
        background: '#fffbeb',
        border: '1px solid #fde68a',
        borderRadius: 10,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        zIndex: 800,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        onMouseDown={handleDragStart}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 10px',
          background: '#fef3c7',
          borderBottom: '1px solid #fde68a',
          cursor: 'move',
          userSelect: 'none',
        }}
      >
        <GripVertical size={14} color="#92400e" />
        <StickyNote size={14} color="#92400e" />
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#92400e' }}>
          Tutor Notes (private)
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400e', display: 'flex', padding: 2 }}
          title="Close"
        >
          <X size={14} />
        </button>
      </div>

      {/* Textarea */}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Private notes visible only to you..."
        style={{
          flex: 1,
          height: 200,
          resize: 'vertical',
          border: 'none',
          background: '#fffbeb',
          padding: '10px 12px',
          fontSize: 13,
          fontFamily: 'system-ui, sans-serif',
          color: '#1c1917',
          lineHeight: 1.5,
          outline: 'none',
        }}
      />
      <div style={{ padding: '4px 12px 6px', fontSize: 10, color: '#a16207' }}>
        Auto-saved · not shared with student
      </div>
    </div>
  );
}
