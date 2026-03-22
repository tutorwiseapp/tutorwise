/**
 * BreakoutRoomPanel — create and manage breakout rooms (v1.0)
 *
 * Tutor-only draggable floating panel. Allows creating sub-sessions
 * branching from the parent session. Each breakout room has its own
 * VirtualSpace session + LiveKit room.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GripVertical, Users, X, Plus, ExternalLink, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface BreakoutRoom {
  id: string;
  title: string;
  label: string;
  status: string;
  created_at: string;
}

interface BreakoutRoomPanelProps {
  sessionId: string;
  onClose: () => void;
}

export function BreakoutRoomPanel({ sessionId, onClose }: BreakoutRoomPanelProps) {
  const [breakouts, setBreakouts] = useState<BreakoutRoom[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [customLabel, setCustomLabel] = useState('');

  // Drag state
  const panelRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const [pos, setPos] = useState({ x: Math.max(0, window.innerWidth / 2 - 200), y: 120 });

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    const startX = e.clientX - pos.x;
    const startY = e.clientY - pos.y;
    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      setPos({ x: ev.clientX - startX, y: ev.clientY - startY });
    };
    const onUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [pos.x, pos.y]);

  // Load existing breakouts
  const loadBreakouts = useCallback(async () => {
    try {
      const res = await fetch(`/api/virtualspace/${sessionId}/breakout`);
      const data = await res.json();
      setBreakouts((data.breakouts || []).filter((b: BreakoutRoom) => b.status === 'active'));
    } catch {
      // non-critical
    }
  }, [sessionId]);

  useEffect(() => {
    loadBreakouts();
    const interval = setInterval(loadBreakouts, 10_000);
    return () => clearInterval(interval);
  }, [loadBreakouts]);

  const handleCreate = useCallback(async () => {
    setIsCreating(true);
    try {
      const res = await fetch(`/api/virtualspace/${sessionId}/breakout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: customLabel.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      toast.success(`Breakout room "${data.breakout.label}" created`);
      setCustomLabel('');
      await loadBreakouts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create breakout room');
    } finally {
      setIsCreating(false);
    }
  }, [sessionId, customLabel, loadBreakouts]);

  const handleClose = useCallback(async (breakoutId: string, label: string) => {
    if (!confirm(`Close breakout room "${label}"?`)) return;
    try {
      await fetch(`/api/virtualspace/${sessionId}/breakout?breakoutId=${breakoutId}`, { method: 'DELETE' });
      setBreakouts((prev) => prev.filter((b) => b.id !== breakoutId));
      toast.success(`Breakout room "${label}" closed`);
    } catch {
      toast.error('Failed to close breakout room');
    }
  }, [sessionId]);

  const handleCopyLink = useCallback(async (breakoutId: string) => {
    const url = `${window.location.origin}/virtualspace/${breakoutId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Breakout room link copied!');
    } catch {
      toast.error('Failed to copy link');
    }
  }, []);

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: 360,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        zIndex: 860,
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
          background: '#f0faf9',
          borderBottom: '1px solid #e2e8f0',
          cursor: 'move',
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        <GripVertical size={14} color="#006c67" />
        <Users size={14} color="#006c67" />
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#006c67' }}>
          Breakout Rooms
          {breakouts.length > 0 && (
            <span style={{ marginLeft: 6, fontSize: 10, color: '#64748b', fontWeight: 400 }}>
              ({breakouts.length} active)
            </span>
          )}
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', padding: 2 }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Create new */}
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="Room name (optional)"
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
            style={{
              flex: 1,
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 12,
              fontFamily: 'system-ui, sans-serif',
              outline: 'none',
              color: '#1e293b',
            }}
          />
          <button
            onClick={handleCreate}
            disabled={isCreating}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 12px',
              background: '#006c67',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: isCreating ? 'not-allowed' : 'pointer',
              fontSize: 12,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            <Plus size={13} />
            {isCreating ? 'Creating…' : 'New Room'}
          </button>
        </div>

        {/* Existing breakout rooms */}
        {breakouts.length === 0 && (
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, textAlign: 'center', padding: '8px 0' }}>
            No breakout rooms yet. Create one to split participants.
          </p>
        )}

        {breakouts.map((br) => (
          <div
            key={br.id}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#22c55e',
                flexShrink: 0,
              }}
            />
            <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#1e293b' }}>
              {br.label}
            </span>
            <button
              onClick={() => handleCopyLink(br.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 3, display: 'flex' }}
              title="Copy invite link"
            >
              <ExternalLink size={13} />
            </button>
            <button
              onClick={() => window.open(`/virtualspace/${br.id}`, '_blank')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#006c67', padding: 3, display: 'flex', fontSize: 11, fontWeight: 600 }}
              title="Open room"
            >
              Join
            </button>
            <button
              onClick={() => handleClose(br.id, br.label)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 3, display: 'flex' }}
              title="Close breakout room"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}

        <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>
          Share the room link or click "Join" to open the room. Each breakout room is a full VirtualSpace session.
        </p>
      </div>
    </div>
  );
}
