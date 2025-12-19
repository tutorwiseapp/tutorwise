/**
 * Filename: apps/web/src/app/help-centre/layout.tsx
 * Purpose: Help centre layout wrapper (applies 3-column layout to all help centre pages)
 * Created: 2025-01-19
 */

import { ReactNode } from 'react';
import HelpCentreLayout from '@/app/components/help-centre/layout/HelpCentreLayout';
import LeftSidebar from '@/app/components/help-centre/layout/LeftSidebar';
import QuickActionsWidget from '@/app/components/help-centre/widgets/QuickActionsWidget';
import PopularArticlesWidget from '@/app/components/help-centre/widgets/PopularArticlesWidget';
import SystemStatusWidget from '@/app/components/help-centre/widgets/SystemStatusWidget';

export const metadata = {
  title: 'Help Centre | Tutorwise',
  description:
    'Find answers to your questions about Tutorwise. Browse guides, tutorials, and FAQs for tutors, students, and agents.',
};

interface HelpCentreLayoutWrapperProps {
  children: ReactNode;
}

export default function HelpCentreLayoutWrapper({ children }: HelpCentreLayoutWrapperProps) {
  return (
    <HelpCentreLayout
      leftSidebar={<LeftSidebar />}
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
