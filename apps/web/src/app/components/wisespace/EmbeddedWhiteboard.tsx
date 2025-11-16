/**
 * Filename: EmbeddedWhiteboard.tsx
 * Purpose: Collaborative whiteboard with Ably real-time sync for WiseSpace (v5.8)
 * Created: 2025-11-15
 */

'use client';

import { useEffect, useRef } from 'react';
import { Tldraw, TLRecord, createTLStore, defaultShapeUtils } from 'tldraw';
import { useChannel } from 'ably/react';
import 'tldraw/tldraw.css';

interface EmbeddedWhiteboardProps {
  bookingId: string;
  onSnapshotRequest?: () => Promise<string>; // Returns SVG/JSON data
}

export function EmbeddedWhiteboard({ bookingId, onSnapshotRequest }: EmbeddedWhiteboardProps) {
  const storeRef = useRef<ReturnType<typeof createTLStore>>();
  const channelName = `wisespace:${bookingId}`;

  // Initialize tldraw store
  if (!storeRef.current) {
    storeRef.current = createTLStore({
      shapeUtils: defaultShapeUtils,
    });
  }

  // Ably real-time sync
  const { channel } = useChannel(channelName, (message) => {
    // Receive draw events from other participants
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

    // Debounced broadcast to avoid flooding Ably
    const handleChange = (changes: { added: Record<string, TLRecord>; updated: Record<string, [from: TLRecord, to: TLRecord]>; removed: Record<string, TLRecord> }) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const records = [
          ...Object.values(changes.added),
          ...Object.values(changes.updated).map(([, to]) => to),
        ];

        if (records.length > 0) {
          channel.publish('draw', { records });
        }
      }, 100); // 100ms debounce
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
      const originalRequest = onSnapshotRequest;
      (window as any).__wiseSpaceExportSnapshot = async () => {
        if (!storeRef.current) return '';

        // Export as JSON snapshot
        const snapshot = storeRef.current.getSnapshot();
        return JSON.stringify(snapshot);
      };
    }
  }, [onSnapshotRequest]);

  return (
    <div style={{ position: 'fixed', inset: 0, top: '60px' }}>
      <Tldraw
        store={storeRef.current}
        autoFocus
      />
    </div>
  );
}
