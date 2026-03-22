/**
 * Filename: EmbeddedWhiteboard.tsx
 * Purpose: Collaborative whiteboard with Ably real-time sync and subject-specific tutoring tools (v7.0)
 * Created: 2025-11-15
 * Updated: 2026-03-19 - Added session controls (chat, timer, reactions, follow mode),
 *                       additional shapes (Protractor, UnitCircle, Pythagoras, VennDiagram,
 *                       PieChart, BarChart, BohrAtom, Timeline, Embed),
 *                       SessionProvider context for real-time session state.
 * Updated: 2026-03-20 - Moved Sage trigger into canvas as "Ask Sage AI Tutor" CTA button;
 *                       SagePanel starts below the tools strip (top: 126px).
 */

'use client';

import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import type { Editor } from '@tldraw/editor';
import { useEditor, loadSnapshot } from '@tldraw/editor';
import { Brain } from 'lucide-react';
import { Tldraw, defaultShapeUtils, DefaultStylePanel } from 'tldraw';
import { createTLStore, type TLRecord } from '@tldraw/editor';
import { useChannel, ChannelProvider } from 'ably/react';
import 'tldraw/tldraw.css';
import 'katex/dist/katex.min.css';

// Custom shape utils — original set
import { MathEquationShapeUtil } from './whiteboard/shapes/MathEquationShapeUtil';
import { GraphAxesShapeUtil } from './whiteboard/shapes/GraphAxesShapeUtil';
import { NumberLineShapeUtil } from './whiteboard/shapes/NumberLineShapeUtil';
import { FractionBarShapeUtil } from './whiteboard/shapes/FractionBarShapeUtil';
import { CircuitShapeUtil } from './whiteboard/shapes/CircuitShapeUtil';
import { AnnotationShapeUtil } from './whiteboard/shapes/AnnotationShapeUtil';

// Custom shape utils — new additions
import { ProtractorShapeUtil } from './whiteboard/shapes/ProtractorShapeUtil';
import { UnitCircleShapeUtil } from './whiteboard/shapes/UnitCircleShapeUtil';
import { PythagorasShapeUtil } from './whiteboard/shapes/PythagorasShapeUtil';
import { VennDiagramShapeUtil } from './whiteboard/shapes/VennDiagramShapeUtil';
import { PieChartShapeUtil } from './whiteboard/shapes/PieChartShapeUtil';
import { BarChartShapeUtil } from './whiteboard/shapes/BarChartShapeUtil';
import { BohrAtomShapeUtil } from './whiteboard/shapes/BohrAtomShapeUtil';
import { TimelineShapeUtil } from './whiteboard/shapes/TimelineShapeUtil';
import { EmbedShapeUtil } from './whiteboard/shapes/EmbedShapeUtil';
import { LineShapeUtil } from './whiteboard/shapes/LineShapeUtil';
import { FunctionPlotShapeUtil } from './whiteboard/shapes/FunctionPlotShapeUtil';
import { TrigTriangleShapeUtil } from './whiteboard/shapes/TrigTriangleShapeUtil';
import { ProbabilityTreeShapeUtil } from './whiteboard/shapes/ProbabilityTreeShapeUtil';
import { ChemicalEquationShapeUtil } from './whiteboard/shapes/ChemicalEquationShapeUtil';
import { WaveDiagramShapeUtil } from './whiteboard/shapes/WaveDiagramShapeUtil';
import { ForcesDiagramShapeUtil } from './whiteboard/shapes/ForcesDiagramShapeUtil';
import { FlowchartShapeUtil } from './whiteboard/shapes/FlowchartShapeUtil';
import { StoryMountainShapeUtil } from './whiteboard/shapes/StoryMountainShapeUtil';
import { FractionCalculatorShapeUtil } from './whiteboard/shapes/FractionCalculatorShapeUtil';
import { UnitConverterShapeUtil } from './whiteboard/shapes/UnitConverterShapeUtil';
import { RulerShapeUtil } from './whiteboard/shapes/RulerShapeUtil';
import { CompassShapeUtil } from './whiteboard/shapes/CompassShapeUtil';
import { AngleMeasurerShapeUtil } from './whiteboard/shapes/AngleMeasurerShapeUtil';
import { PdfViewerShapeUtil } from './whiteboard/shapes/PdfViewerShapeUtil';

// Session context + controls
import { SessionProvider, useSession } from './whiteboard/session/SessionContext';
import { SessionControlsPanel } from './whiteboard/session/SessionControlsPanel';
import { ChatPanel } from './whiteboard/session/ChatPanel';
import { TimerWidget } from './whiteboard/session/TimerWidget';
import { ReactionOverlay } from './whiteboard/session/ReactionOverlay';

// Subject tools panel
import { SubjectToolsPanel } from './whiteboard/panels/SubjectToolsPanel';

// Sage canvas writer — snapshot + erase tracking. Stamping is done via editorRef + onMount.
import { SageCanvasWriter, stampShapesOnEditor } from './canvas/SageCanvasWriter';
import type { SageCanvasShapeSpec } from './canvas/canvasBlockParser';

// ── Sage profile colours (stable module-level constant) ────────────────────

const SAGE_PROFILE_BG: Record<string, string> = {
  tutor:    '#006c67',
  copilot:  '#7c3aed',
  wingman:  '#d97706',
  observer: '#64748b',
};

// ── All custom shape utils (stable module-level array) ─────────────────────

const CUSTOM_SHAPE_UTILS = [
  // Original
  MathEquationShapeUtil,
  GraphAxesShapeUtil,
  NumberLineShapeUtil,
  FractionBarShapeUtil,
  CircuitShapeUtil,
  AnnotationShapeUtil,
  // New additions
  ProtractorShapeUtil,
  UnitCircleShapeUtil,
  PythagorasShapeUtil,
  VennDiagramShapeUtil,
  PieChartShapeUtil,
  BarChartShapeUtil,
  BohrAtomShapeUtil,
  TimelineShapeUtil,
  EmbedShapeUtil,
  LineShapeUtil,
  // Educational shape utilities (batch 2)
  FunctionPlotShapeUtil,
  TrigTriangleShapeUtil,
  ProbabilityTreeShapeUtil,
  ChemicalEquationShapeUtil,
  WaveDiagramShapeUtil,
  ForcesDiagramShapeUtil,
  FlowchartShapeUtil,
  StoryMountainShapeUtil,
  // Maths tools
  FractionCalculatorShapeUtil,
  UnitConverterShapeUtil,
  RulerShapeUtil,
  CompassShapeUtil,
  AngleMeasurerShapeUtil,
  // Document viewer
  PdfViewerShapeUtil,
];

// ── CollapsibleStylePanel ──────────────────────────────────────────────────
// Module-level component (stable reference — never recreated by useMemo).
// Shows only the first colour row (38px) by default; expands on hover.

function CollapsibleStylePanel() {
  useEffect(() => {
    if (document.getElementById('vs-panel-collapsible')) return;
    const style = document.createElement('style');
    style.id = 'vs-panel-collapsible';
    style.textContent = `
      .tlui-style-panel__wrapper {
        max-height: 40px !important;
        overflow: hidden !important;
        border-radius: 8px !important;
        transition: max-height 0.2s ease 300ms !important;
      }
      .tlui-style-panel__wrapper:hover {
        max-height: 400px !important;
        transition: max-height 0.2s ease 0ms !important;
      }
      .tlui-navigation-panel {
        transform: translateX(270px) !important;
        bottom: 8px !important;
        border-radius: 8px !important;
        overflow: hidden !important;
      }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById('vs-panel-collapsible')?.remove(); };
  }, []);

  return (
    <div style={{
      '--tl-color-panel': 'hsl(204, 16%, 94%)',
      '--tl-shadow-1': 'none',
      '--tl-shadow-2': 'none',
      '--tl-shadow-3': 'none',
      '--tl-shadow-4': 'none',
    } as React.CSSProperties}>
      <DefaultStylePanel />
    </div>
  );
}

// ── InFrontOfTheCanvas ─────────────────────────────────────────────────────
// All floating UI layers rendered on top of the tldraw canvas.
// Must access SessionContext, which lives above <Tldraw>.

// Stable cursor colour palette keyed by userId hash
const CURSOR_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#8b5cf6','#ec4899','#14b8a6'];
function cursorColor(userId: string) {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return CURSOR_COLORS[h % CURSOR_COLORS.length];
}

function InFrontOfTheCanvas({
  displayName,
  isTutor,
  onRegisterSnapshot,
  onErasePattern,
  onAskSage,
  isSageActive,
  isSageActivating,
  sageProfile,
  onHomework,
}: {
  displayName: string;
  isTutor?: boolean;
  onRegisterSnapshot?: (fn: () => Promise<string | null>) => void;
  onErasePattern?: (clusterCount: number) => void;
  onAskSage?: () => void;
  isSageActive?: boolean;
  isSageActivating?: boolean;
  sageProfile?: string;
  onHomework?: () => void;
}) {
  const editor = useEditor();
  const { drawLocked, remoteCursors, publishCursor } = useSession();
  const activeBg = isSageActive && sageProfile
    ? (SAGE_PROFILE_BG[sageProfile] ?? '#006c67')
    : '#006c67';

  // Enforce draw lock for non-tutors
  useEffect(() => {
    if (!isTutor) {
      editor.updateInstanceState({ isReadonly: drawLocked });
    }
  }, [editor, drawLocked, isTutor]);

  // Broadcast cursor position (throttled inside publishCursor)
  useEffect(() => {
    const container = editor.getContainer();
    if (!container) return;
    const handleMove = (e: PointerEvent) => {
      const point = editor.screenToPage({ x: e.clientX, y: e.clientY });
      publishCursor(point.x, point.y, displayName);
    };
    container.addEventListener('pointermove', handleMove, { passive: true });
    return () => container.removeEventListener('pointermove', handleMove);
  }, [editor, publishCursor, displayName]);

  // Re-render remote cursors when camera changes
  const [, setCameraVersion] = useState(0);
  useEffect(() => {
    return editor.store.listen(() => setCameraVersion((v) => v + 1), { scope: 'session' });
  }, [editor]);

  return (
    <>
      <SessionControlsPanel isTutor={isTutor} onHomework={onHomework} />
      <SubjectToolsPanel isTutor={isTutor} />
      <ChatPanel displayName={displayName} />
      <TimerWidget />
      <ReactionOverlay />
      <SageCanvasWriter
        onRegisterSnapshot={onRegisterSnapshot}
        onErasePattern={onErasePattern}
      />

      {/* Remote cursor overlays */}
      {remoteCursors.map((cursor) => {
        const screen = editor.pageToScreen({ x: cursor.x, y: cursor.y });
        const color = cursorColor(cursor.userId);
        return (
          <div
            key={cursor.userId}
            style={{
              position: 'absolute',
              left: screen.x,
              top: screen.y,
              pointerEvents: 'none',
              zIndex: 900,
              transform: 'translate(-2px, -2px)',
            }}
          >
            {/* Cursor arrow */}
            <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
              <path d="M0 0 L0 16 L4 12 L7 19 L9 18 L6 11 L12 11 Z" fill={color} stroke="white" strokeWidth="1" />
            </svg>
            <div style={{
              marginTop: 2,
              background: color,
              color: 'white',
              fontSize: 10,
              fontWeight: 600,
              fontFamily: 'system-ui, sans-serif',
              padding: '1px 5px',
              borderRadius: 4,
              whiteSpace: 'nowrap',
              maxWidth: 120,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {cursor.displayName}
            </div>
          </div>
        );
      })}

      {/* Ask Sage AI Tutor — matches subject tools panel style */}
      {onAskSage && (
        <button
          onClick={onAskSage}
          disabled={isSageActivating}
          aria-label={isSageActive ? 'Close Sage panel' : 'Ask Sage AI Tutor'}
          style={{
            position: 'absolute',
            top: 16,
            right: isTutor ? 704 : 636,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '0 10px',
            height: 38,
            background: isSageActive ? activeBg : 'hsl(204, 16%, 94%)',
            color: isSageActive ? 'white' : activeBg,
            border: 'none',
            borderRadius: 9,
            cursor: isSageActivating ? 'wait' : 'pointer',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'system-ui, sans-serif',
            opacity: isSageActivating ? 0.75 : 1,
            transition: 'background 0.15s, color 0.15s, opacity 0.15s',
            zIndex: 500,
            whiteSpace: 'nowrap',
            pointerEvents: 'all',
          }}
        >
          <Brain size={14} />
          {isSageActivating ? 'Starting...' : 'Ask Sage AI Tutor'}
        </button>
      )}
    </>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────

interface EmbeddedWhiteboardProps {
  /** Ably channel name for real-time sync (e.g., "virtualspace:abc123") */
  channelName: string;
  /** Supabase user ID of the current user */
  currentUserId: string;
  /** Display name shown in chat and raise-hand */
  displayName?: string;
  /** Shapes queued by the AI assistant to be stamped onto the canvas */
  pendingShapes?: SageCanvasShapeSpec[];
  /** Called after pendingShapes have been stamped, so the parent can clear the queue */
  onShapesStamped?: () => void;
  /** Called once on mount with a snapshot capture function (canvas → base64 PNG) */
  onRegisterSnapshot?: (fn: () => Promise<string | null>) => void;
  /** Called when a repeated-erase pattern is detected in the student's work */
  onErasePattern?: (clusterCount: number) => void;
  /** Called when the Ask Sage CTA is tapped (toggles Sage on/off) */
  onAskSage?: () => void;
  /** Whether Sage is currently active */
  isSageActive?: boolean;
  /** Whether Sage is in the process of activating */
  isSageActivating?: boolean;
  /** Active Sage profile — controls button colour */
  sageProfile?: string;
  /** Whether the current user is the tutor (unlocks draw-lock + homework controls) */
  isTutor?: boolean;
  /** Called when the tutor clicks "Set homework" */
  onHomework?: () => void;
  /** URL of the previous snapshot to restore canvas state on rejoin */
  initialSnapshotUrl?: string;
  /** Called after a successful auto-save so parent can show "Last saved" time */
  onAutoSaved?: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────

export function EmbeddedWhiteboard({
  channelName,
  currentUserId,
  displayName = 'You',
  pendingShapes,
  onShapesStamped,
  onRegisterSnapshot,
  onErasePattern,
  onAskSage,
  isSageActive,
  isSageActivating,
  sageProfile,
  isTutor,
  onHomework,
  initialSnapshotUrl,
  onAutoSaved,
}: EmbeddedWhiteboardProps) {
  const storeRef = useRef<ReturnType<typeof createTLStore>>(undefined);
  // Stable editor ref — populated via onMount so stamping doesn't go through tldraw slots
  const editorRef = useRef<Editor | null>(null);
  const handleEditorMount = useCallback((editor: Editor) => {
    editorRef.current = editor;

    // Restore previous canvas state on rejoin (non-blocking, fails silently)
    if (initialSnapshotUrl) {
      fetch(initialSnapshotUrl)
        .then((r) => r.json())
        .then((data) => {
          // Only restore if canvas is currently empty (no shapes yet from Ably sync)
          const hasShapes = (editor.store.allRecords() as any[]).some((r) => r.typeName === 'shape');
          if (!hasShapes) {
            loadSnapshot(editor.store, data);
          }
        })
        .catch(() => {}); // snapshot load failure is non-critical
    }

    return () => { editorRef.current = null; };
  }, [initialSnapshotUrl]);
  // Initialize tldraw store with all custom shape utils
  if (!storeRef.current) {
    storeRef.current = createTLStore({
      shapeUtils: [...defaultShapeUtils, ...CUSTOM_SHAPE_UTILS],
    });
  }

  // Stamp pending shapes via editor ref — runs outside tldraw slot lifecycle
  // so tldrawComponents stays stable and InFrontOfTheCanvas never remounts for stamping.
  useEffect(() => {
    if (!pendingShapes?.length || !editorRef.current) return;
    stampShapesOnEditor(editorRef.current, pendingShapes);
    onShapesStamped?.();
  }, [pendingShapes, onShapesStamped]);

  // Ably real-time sync — draw channel (separate from session channel)
  const { channel } = useChannel(channelName, (message) => {
    if (message.name === 'draw' && storeRef.current) {
      const { records } = message.data as { records: TLRecord[] };
      storeRef.current.mergeRemoteChanges(() => {
        storeRef.current!.put(records);
      });
    }
  });

  // Listen to local changes and broadcast to Ably
  useEffect(() => {
    if (!storeRef.current) return;

    const store = storeRef.current;
    let timeoutId: NodeJS.Timeout;

    const handleChange = (changes: {
      added: Record<string, TLRecord>;
      updated: Record<string, [from: TLRecord, to: TLRecord]>;
      removed: Record<string, TLRecord>;
    }) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const records = [
          ...Object.values(changes.added ?? {}),
          ...Object.values(changes.updated ?? {}).map(([, to]) => to),
        ];
        if (records.length > 0) {
          channel.publish('draw', { records });
        }
      }, 100);
    };

    const unsubscribe = store.listen(handleChange as any, { scope: 'document', source: 'user' });

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [channel]);

  // Expose snapshot export to VirtualSpaceClient via window bridge (uses editor for richer state)
  useEffect(() => {
    (window as any).__virtualSpaceExportSnapshot = async () => {
      if (!editorRef.current) return '';
      return JSON.stringify(editorRef.current.store.getStoreSnapshot());
    };
    (window as any).__virtualSpaceAutoSaveCallback = onAutoSaved;
  }, [onAutoSaved]);

  // Session channel name for chat/timer/reactions (distinct from draw channel)
  const sessionChannelName = `session:${channelName}`;

  // Stable component map — pendingShapes/onShapesStamped removed from deps.
  // Stamping is now done via editorRef+useEffect above, not through tldraw slots.
  const tldrawComponents = useMemo(() => ({
    InFrontOfTheCanvas: () => (
      <InFrontOfTheCanvas
        displayName={displayName}
        isTutor={isTutor}
        onRegisterSnapshot={onRegisterSnapshot}
        onErasePattern={onErasePattern}
        onAskSage={onAskSage}
        isSageActive={isSageActive}
        isSageActivating={isSageActivating}
        sageProfile={sageProfile}
        onHomework={onHomework}
      />
    ),
    StylePanel: CollapsibleStylePanel,
  }), [displayName, isTutor, onRegisterSnapshot, onErasePattern, onAskSage, isSageActive, isSageActivating, sageProfile, onHomework]);

  return (
    <ChannelProvider channelName={sessionChannelName}>
      <SessionProvider channelName={sessionChannelName} currentUserId={currentUserId}>
        <div style={{ position: 'fixed', top: '56px', right: 0, bottom: 0, left: 0 }}>
          <Tldraw
            store={storeRef.current}
            shapeUtils={CUSTOM_SHAPE_UTILS}
            components={tldrawComponents}
            onMount={handleEditorMount}
            autoFocus
          />
        </div>
      </SessionProvider>
    </ChannelProvider>
  );
}
