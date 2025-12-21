/**
 * Filename: apps/web/src/app/components/help-centre/layout/HelpCentreLayoutClient.tsx
 * Purpose: Client-side wrapper for Help Centre layout with sidebar management
 * Created: 2025-12-21
 */

'use client';

import { ReactNode } from 'react';
import HelpCentreLayout from './HelpCentreLayout';
import LeftSidebar from './LeftSidebar';
import QuickActionsWidget from '../widgets/QuickActionsWidget';
import PopularArticlesWidget from '../widgets/PopularArticlesWidget';
import SystemStatusWidget from '../widgets/SystemStatusWidget';

interface HelpCentreLayoutClientProps {
  children: ReactNode;
}

export default function HelpCentreLayoutClient({ children }: HelpCentreLayoutClientProps) {
  return (
    <HelpCentreLayout
      leftSidebar={(onClose) => <LeftSidebar onLinkClick={onClose} />}
      rightSidebar={
        <>
          <QuickActionsWidget />
          <PopularArticlesWidget />
          <SystemStatusWidget />
        </>
      }
    >
      {children}
    </HelpCentreLayout>
  );
}
