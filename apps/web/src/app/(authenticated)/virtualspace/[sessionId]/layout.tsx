/**
 * Filename: layout.tsx
 * Purpose: Minimal layout for VirtualSpace session room (v5.9)
 * Created: 2026-02-14
 *
 * This layout provides a clean, full-screen experience for the virtual classroom.
 * Unlike the main app layout, it does NOT render AppSidebar or HubSidebar.
 */

import { ReactNode } from 'react';

export default function VirtualSpaceLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#f9fafb', // Light gray background
      }}
    >
      {children}
    </div>
  );
}
