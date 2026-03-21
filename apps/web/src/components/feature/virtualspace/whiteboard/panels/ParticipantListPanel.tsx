/**
 * ParticipantListPanel
 * Shows all session participants with their status.
 */

'use client';

import { X, GripVertical, Users, CircleUser } from 'lucide-react';
import { useRef, useState } from 'react';

export interface Participant {
  userId: string;
  displayName: string;
}

interface ParticipantListPanelProps {
  participants: Participant[];
  currentUserId: string;
  tutorId?: string;
  onClose: () => void;
}

export function ParticipantListPanel({ participants, currentUserId, tutorId, onClose }: ParticipantListPanelProps) {
  // Drag-to-reposition
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
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: 240,
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        zIndex: 800,
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
          background: '#f8fafc',
          borderBottom: '1px solid #e5e7eb',
          cursor: 'move',
          userSelect: 'none',
        }}
      >
        <GripVertical size={14} color="#64748b" />
        <Users size={14} color="#64748b" />
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#1e293b' }}>
          Participants ({participants.length})
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', padding: 2 }}
          title="Close"
        >
          <X size={14} />
        </button>
      </div>

      {/* List */}
      <div style={{ padding: '6px 0', maxHeight: 300, overflowY: 'auto' }}>
        {participants.length === 0 ? (
          <div style={{ padding: '12px 14px', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
            No participants
          </div>
        ) : (
          participants.map((p) => {
            const isMe = p.userId === currentUserId;
            const isTutor = p.userId === tutorId;
            return (
              <div
                key={p.userId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 14px',
                  background: isMe ? '#f0fdf4' : 'transparent',
                }}
              >
                <CircleUser size={18} color={isTutor ? '#006c67' : '#64748b'} />
                <span style={{ flex: 1, fontSize: 13, color: '#1e293b', fontWeight: isMe ? 600 : 400 }}>
                  {p.displayName}{isMe ? ' (you)' : ''}
                </span>
                {isTutor && (
                  <span style={{ fontSize: 10, background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: 99, fontWeight: 600 }}>
                    Tutor
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
