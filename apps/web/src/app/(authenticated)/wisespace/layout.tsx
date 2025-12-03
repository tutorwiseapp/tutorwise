/**
 * Filename: layout.tsx
 * Purpose: Minimal layout for WiseSpace session room (v5.8)
 * Created: 2025-11-15
 *
 * This layout provides a clean, full-screen experience for the virtual classroom.
 * Unlike the main app layout, it does NOT render AppSidebar or HubSidebar.
 */

import { ReactNode } from 'react';

export default function WiseSpaceLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: '#f9fafb', // Light gray background
    }}>
      {children}
    </div>
  );
}
