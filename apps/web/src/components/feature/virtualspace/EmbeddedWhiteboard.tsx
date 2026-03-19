/**
 * Filename: EmbeddedWhiteboard.tsx
 * Purpose: Collaborative whiteboard with Ably real-time sync and subject-specific tutoring tools (v7.0)
 * Created: 2025-11-15
 * Updated: 2026-03-19 - Added session controls (chat, timer, reactions, follow mode),
 *                       additional shapes (Protractor, UnitCircle, Pythagoras, VennDiagram,
 *                       PieChart, BarChart, BohrAtom, Timeline, Embed),
 *                       SessionProvider context for real-time session state.
 */

'use client';

import { useEffect, useRef, useMemo } from 'react';
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

// Session context + controls
import { SessionProvider } from './whiteboard/session/SessionContext';
import { SessionControlsPanel } from './whiteboard/session/SessionControlsPanel';
import { ChatPanel } from './whiteboard/session/ChatPanel';
import { TimerWidget } from './whiteboard/session/TimerWidget';
import { ReactionOverlay } from './whiteboard/session/ReactionOverlay';

// Subject tools panel
import { SubjectToolsPanel } from './whiteboard/panels/SubjectToolsPanel';

// Sage canvas writer — stamps shapes requested by Sage onto the tldraw canvas
import { SageCanvasWriter } from './canvas/SageCanvasWriter';
import type { SageCanvasShapeSpec } from './canvas/canvasBlockParser';

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

function InFrontOfTheCanvas({
  displayName,
  pendingShapes,
  onShapesStamped,
  onRegisterSnapshot,
  onErasePattern,
}: {
  displayName: string;
  pendingShapes: SageCanvasShapeSpec[];
  onShapesStamped: () => void;
  onRegisterSnapshot?: (fn: () => Promise<string | null>) => void;
  onErasePattern?: (clusterCount: number) => void;
}) {
  return (
    <>
      <SubjectToolsPanel />
      <ChatPanel displayName={displayName} />
      <TimerWidget />
      <ReactionOverlay />
      <SageCanvasWriter
        pendingShapes={pendingShapes}
        onShapesStamped={onShapesStamped}
        onRegisterSnapshot={onRegisterSnapshot}
        onErasePattern={onErasePattern}
      />
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
}: EmbeddedWhiteboardProps) {
  const storeRef = useRef<ReturnType<typeof createTLStore>>(undefined);
  // Initialize tldraw store with all custom shape utils
  if (!storeRef.current) {
    storeRef.current = createTLStore({
      shapeUtils: [...defaultShapeUtils, ...CUSTOM_SHAPE_UTILS],
    });
  }

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
          ...Object.values(changes.added),
          ...Object.values(changes.updated).map(([, to]) => to),
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

  // Expose snapshot export to VirtualSpaceClient via window bridge
  useEffect(() => {
    (window as any).__virtualSpaceExportSnapshot = async () => {
      if (!storeRef.current) return '';
      return JSON.stringify(storeRef.current.getStoreSnapshot());
    };
  }, []);

  // Session channel name for chat/timer/reactions (distinct from draw channel)
  const sessionChannelName = `session:${channelName}`;

  // Stable component map — only recreates when displayName or pendingShapes/onShapesStamped change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tldrawComponents = useMemo(() => ({
    InFrontOfTheCanvas: () => (
      <InFrontOfTheCanvas
        displayName={displayName}
        pendingShapes={pendingShapes ?? []}
        onShapesStamped={onShapesStamped ?? (() => {})}
        onRegisterSnapshot={onRegisterSnapshot}
        onErasePattern={onErasePattern}
      />
    ),
    StylePanel: CollapsibleStylePanel,
  }), [displayName, pendingShapes, onShapesStamped, onRegisterSnapshot, onErasePattern]);

  return (
    <ChannelProvider channelName={sessionChannelName}>
      <SessionProvider channelName={sessionChannelName} currentUserId={currentUserId}>
        <div style={{ position: 'fixed', top: '56px', right: 0, bottom: 0, left: 0 }}>
          <Tldraw
            store={storeRef.current}
            components={tldrawComponents}
            autoFocus
          />
          <SessionControlsPanel />
        </div>
      </SessionProvider>
    </ChannelProvider>
  );
}
