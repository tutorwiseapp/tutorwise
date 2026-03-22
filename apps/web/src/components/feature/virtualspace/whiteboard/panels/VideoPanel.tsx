/**
 * VideoPanel — In-app LiveKit video conferencing panel (v2.0)
 *
 * Floating draggable panel providing camera, microphone, screen share,
 * and session recording via LiveKit Egress. Gracefully shows a setup guide
 * if LIVEKIT_* env vars are not configured on the server.
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { GripVertical, Video, X, Minimize2, Maximize2, ExternalLink, Circle, StopCircle } from 'lucide-react';
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track } from 'livekit-client';

// ── Inner layout component (needs to be inside LiveKitRoom) ───────────────

function VideoRoomLayout() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <GridLayout
        tracks={tracks}
        style={{ flex: 1 }}
      >
        <ParticipantTile />
      </GridLayout>
      <ControlBar
        controls={{ microphone: true, camera: true, screenShare: true, chat: false, leave: false }}
        style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc', padding: '4px 8px' }}
      />
    </div>
  );
}

// ── Setup guide shown when LiveKit is not configured ─────────────────────

function SetupGuide({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ padding: 16, flex: 1, overflow: 'auto' }}>
      <p style={{ fontSize: 13, color: '#374151', marginBottom: 12, lineHeight: 1.5 }}>
        In-app video requires a <strong>LiveKit</strong> account. Setup takes 2 minutes:
      </p>
      <ol style={{ fontSize: 12, color: '#4b5563', paddingLeft: 18, lineHeight: 2 }}>
        <li>
          Sign up free at{' '}
          <a href="https://livekit.io" target="_blank" rel="noopener noreferrer"
            style={{ color: '#006c67', textDecoration: 'underline' }}>
            livekit.io
            <ExternalLink size={10} style={{ display: 'inline', marginLeft: 2, verticalAlign: 'middle' }} />
          </a>
        </li>
        <li>Create a project and copy your credentials</li>
        <li>
          Add to <code style={{ background: '#f1f5f9', padding: '1px 4px', borderRadius: 3 }}>.env.local</code>:
        </li>
      </ol>
      <pre style={{
        background: '#1e293b',
        color: '#94a3b8',
        fontSize: 11,
        padding: '10px 12px',
        borderRadius: 6,
        marginTop: 8,
        overflow: 'auto',
      }}>
{`LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud`}
      </pre>
      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 10 }}>
        Free tier: 100 GB/month · No credit card needed
      </p>
      <button
        onClick={onClose}
        style={{
          marginTop: 12,
          width: '100%',
          padding: '8px 0',
          background: '#006c67',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        Got it
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

interface VideoPanelProps {
  sessionId: string;
  onClose: () => void;
  canRecord?: boolean; // tutor/owner only
}

type PanelState = 'loading' | 'unconfigured' | 'ready' | 'error';

export function VideoPanel({ sessionId, onClose, canRecord = false }: VideoPanelProps) {
  const [panelState, setPanelState] = useState<PanelState>('loading');
  const [token, setToken] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [minimized, setMinimized] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState('');

  // Drag-to-reposition
  const panelRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const [pos, setPos] = useState({ x: window.innerWidth - 380, y: 72 });

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

  // Recording controls
  const handleStartRecording = useCallback(async () => {
    setRecordingError('');
    try {
      const res = await fetch(`/api/virtualspace/${sessionId}/recording`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setRecordingError(data.error || 'Failed to start recording');
        return;
      }
      setIsRecording(true);
    } catch {
      setRecordingError('Failed to start recording');
    }
  }, [sessionId]);

  const handleStopRecording = useCallback(async () => {
    try {
      await fetch(`/api/virtualspace/${sessionId}/recording`, { method: 'DELETE' });
      setIsRecording(false);
    } catch {
      setRecordingError('Failed to stop recording');
    }
  }, [sessionId]);

  // Fetch token on mount
  useEffect(() => {
    let cancelled = false;
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    fetch(`/api/virtualspace/${sessionId}/livekit-token`, { method: 'POST' })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.unconfigured) {
          setPanelState('unconfigured');
          return;
        }
        if (!data.token || !livekitUrl) {
          setPanelState('unconfigured');
          return;
        }
        setToken(data.token);
        setRoomName(data.roomName);
        setPanelState('ready');
      })
      .catch(() => {
        if (!cancelled) {
          setErrorMessage('Could not connect to video server');
          setPanelState('error');
        }
      });

    return () => { cancelled = true; };
  }, [sessionId]);

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || '';
  const panelWidth = 340;
  const panelHeight = minimized ? 'auto' : 420;

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: panelWidth,
        height: panelHeight,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        zIndex: 850,
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
        <Video size={14} color="#006c67" />
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#006c67' }}>
          Video Call
          {roomName && (
            <span style={{ fontWeight: 400, color: '#64748b', marginLeft: 4, fontSize: 11 }}>
              · {roomName.slice(0, 24)}…
            </span>
          )}
        </span>
        {/* Recording button — tutor/owner only, only when ready */}
        {canRecord && panelState === 'ready' && (
          <button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isRecording ? '#ef4444' : '#64748b',
              display: 'flex',
              padding: 2,
            }}
            title={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {isRecording ? <StopCircle size={13} /> : <Circle size={13} />}
          </button>
        )}
        <button
          onClick={() => setMinimized((v) => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', padding: 2 }}
          title={minimized ? 'Expand' : 'Minimise'}
        >
          {minimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
        </button>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', padding: 2 }}
          title="Close"
        >
          <X size={14} />
        </button>
      </div>

      {/* Body — hidden when minimized */}
      {!minimized && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {panelState === 'loading' && (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              fontSize: 13,
              gap: 8,
            }}>
              <Video size={16} />
              Connecting…
            </div>
          )}

          {panelState === 'unconfigured' && <SetupGuide onClose={onClose} />}

          {panelState === 'error' && (
            <div style={{ padding: 16, flex: 1 }}>
              <p style={{ fontSize: 13, color: '#ef4444' }}>{errorMessage}</p>
              <button
                onClick={onClose}
                style={{ marginTop: 8, fontSize: 12, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          )}

          {recordingError && (
            <div style={{ padding: '4px 10px', background: '#fef2f2', fontSize: 11, color: '#dc2626' }}>
              {recordingError}
            </div>
          )}
          {isRecording && (
            <div style={{
              padding: '4px 10px',
              background: '#fef2f2',
              fontSize: 11,
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}>
              <Circle size={8} fill="#dc2626" />
              Recording in progress
            </div>
          )}

          {panelState === 'ready' && token && (
            <LiveKitRoom
              video={true}
              audio={true}
              token={token}
              serverUrl={livekitUrl}
              data-lk-theme="default"
              style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
              onDisconnected={() => onClose()}
            >
              <RoomAudioRenderer />
              <VideoRoomLayout />
            </LiveKitRoom>
          )}
        </div>
      )}
    </div>
  );
}
