/**
 * Filename: WiseSpaceClient.tsx
 * Purpose: Client component for WiseSpace session room (v5.8)
 * Created: 2025-11-15
 */

'use client';

import { WiseSpaceHeader } from '@/app/components/wisespace/WiseSpaceHeader';
import { EmbeddedWhiteboard } from '@/app/components/wisespace/EmbeddedWhiteboard';
import { AblyProvider } from 'ably/react';
import * as Ably from 'ably';

interface WiseSpaceClientProps {
  bookingId: string;
  sessionTitle: string;
  currentUserId: string;
  tutorName: string;
  studentName: string;
}

export function WiseSpaceClient({
  bookingId,
  sessionTitle,
  currentUserId,
  tutorName,
  studentName,
}: WiseSpaceClientProps) {
  // Initialize Ably client
  const ablyClient = new Ably.Realtime({
    key: process.env.NEXT_PUBLIC_ABLY_API_KEY,
    clientId: currentUserId,
  });

  const handleSaveSnapshot = async () => {
    // Get snapshot data from whiteboard
    const snapshotData = await (window as any).__wiseSpaceExportSnapshot?.();

    if (!snapshotData) {
      throw new Error('No snapshot data available');
    }

    const response = await fetch(`/api/wisespace/${bookingId}/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshotData }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save snapshot');
    }

    return response.json();
  };

  const handleMarkComplete = async () => {
    const response = await fetch(`/api/wisespace/${bookingId}/complete`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to mark session complete');
    }

    return response.json();
  };

  return (
    <AblyProvider client={ablyClient}>
      <WiseSpaceHeader
        bookingId={bookingId}
        sessionTitle={`${sessionTitle} - ${tutorName} & ${studentName}`}
        onSaveSnapshot={handleSaveSnapshot}
        onMarkComplete={handleMarkComplete}
      />
      <EmbeddedWhiteboard bookingId={bookingId} />
    </AblyProvider>
  );
}
