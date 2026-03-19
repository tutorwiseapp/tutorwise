/**
 * Filename: EmbeddedWhiteboard.tsx
 * Purpose: Collaborative whiteboard with Ably real-time sync and subject-specific tutoring tools (v6.0)
 * Created: 2025-11-15
 * Updated: 2026-03-18 - Added custom shape utils (math equations, graph axes, number line,
 *                       fraction bars, circuit components, annotation) + SubjectToolsPanel
 */

'use client';

import { useEffect, useRef, useMemo } from 'react';
import { Tldraw, defaultShapeUtils } from 'tldraw';
import { createTLStore, type TLRecord } from '@tldraw/editor';
import { useChannel } from 'ably/react';
import 'tldraw/tldraw.css';
import 'katex/dist/katex.min.css';

// Custom shape utils
import { MathEquationShapeUtil } from './whiteboard/shapes/MathEquationShapeUtil';
import { GraphAxesShapeUtil } from './whiteboard/shapes/GraphAxesShapeUtil';
import { NumberLineShapeUtil } from './whiteboard/shapes/NumberLineShapeUtil';
import { FractionBarShapeUtil } from './whiteboard/shapes/FractionBarShapeUtil';
import { CircuitShapeUtil } from './whiteboard/shapes/CircuitShapeUtil';
import { AnnotationShapeUtil } from './whiteboard/shapes/AnnotationShapeUtil';

// Subject tools panel
import { SubjectToolsPanel } from './whiteboard/panels/SubjectToolsPanel';

// All custom shape utils — must be defined outside of component to avoid re-registration
const CUSTOM_SHAPE_UTILS = [
  MathEquationShapeUtil,
  GraphAxesShapeUtil,
  NumberLineShapeUtil,
  FractionBarShapeUtil,
  CircuitShapeUtil,
  AnnotationShapeUtil,
];

// InFrontOfTheCanvas component — renders subject tools panel inside the editor context
function InFrontOfTheCanvas() {
  return <SubjectToolsPanel />;
}

// Components override — must be stable (defined outside component)
const TLDRAW_COMPONENTS = {
  InFrontOfTheCanvas,
};

interface EmbeddedWhiteboardProps {
  /** Ably channel name for real-time sync (e.g., "virtualspace:abc123") */
  channelName: string;
  onSnapshotRequest?: () => Promise<string>;
}

export function EmbeddedWhiteboard({ channelName, onSnapshotRequest }: EmbeddedWhiteboardProps) {
  const storeRef = useRef<ReturnType<typeof createTLStore>>(undefined);

  // Initialize tldraw store with all custom shape utils
  if (!storeRef.current) {
    storeRef.current = createTLStore({
      shapeUtils: [...defaultShapeUtils, ...CUSTOM_SHAPE_UTILS],
    });
  }

  // Ably real-time sync
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

  // Expose snapshot function to parent
  useEffect(() => {
    if (onSnapshotRequest) {
      (window as any).__virtualSpaceExportSnapshot = async () => {
        if (!storeRef.current) return '';
        const snapshot = storeRef.current.getStoreSnapshot();
        return JSON.stringify(snapshot);
      };
    }
  }, [onSnapshotRequest]);

  return (
    <div style={{ position: 'fixed', inset: 0, top: '56px' }}>
      <Tldraw
        store={storeRef.current}
        shapeUtils={CUSTOM_SHAPE_UTILS}
        components={TLDRAW_COMPONENTS}
        autoFocus
      />
    </div>
  );
}
