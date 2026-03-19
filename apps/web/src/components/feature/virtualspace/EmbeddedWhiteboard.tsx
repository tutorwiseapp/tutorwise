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

// ── InFrontOfTheCanvas ─────────────────────────────────────────────────────
// All floating UI layers rendered on top of the tldraw canvas.
// Must access SessionContext, which lives above <Tldraw>.

function InFrontOfTheCanvas({ displayName }: { displayName: string }) {
  return (
    <>
      <SubjectToolsPanel />
      <ChatPanel displayName={displayName} />
      <TimerWidget />
      <ReactionOverlay />
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
}

// ── Component ──────────────────────────────────────────────────────────────

export function EmbeddedWhiteboard({
  channelName,
  currentUserId,
  displayName = 'You',
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

  // Stable component map — only recreates when displayName changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tldrawComponents = useMemo(() => ({
    InFrontOfTheCanvas: () => <InFrontOfTheCanvas displayName={displayName} />,
    StylePanel: () => (
      <div style={{
        '--tl-color-panel': 'hsl(204, 16%, 94%)',
        '--tl-shadow-1': 'none',
        '--tl-shadow-2': 'none',
        '--tl-shadow-3': 'none',
        '--tl-shadow-4': 'none',
      } as React.CSSProperties}>
        <DefaultStylePanel />
      </div>
    ),
  }), [displayName]);

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
