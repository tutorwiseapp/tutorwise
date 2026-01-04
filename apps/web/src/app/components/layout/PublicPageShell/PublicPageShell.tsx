/**
 * Filename: PublicPageShell.tsx
 * Purpose: Reusable shell for all public-facing pages (profiles, organisations, marketplace)
 * Created: 2026-01-04
 * Based on: public-profile and public-organisation-profile patterns
 *
 * Features:
 * - SEO metadata handling (title, description, structured data, robots)
 * - 2-column responsive layout (2fr main + 1fr sticky sidebar)
 * - Hero section (full-width)
 * - View tracking integration
 * - Mobile bottom CTA support
 * - 5-minute revalidation caching
 * - Slot-based API following Hub component patterns
 *
 * Layout Structure:
 * - Hero Section (1-column, full-width)
 * - Body Section (2-column on desktop: 2fr main + 1fr sidebar)
 * - Related Section (optional, 1-column full-width)
 * - Mobile Bottom CTA (fixed on mobile)
 */

import { ReactNode } from 'react';
import Container from '@/app/components/layout/Container';
import styles from './PublicPageShell.module.css';

export interface PublicPageShellMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  structuredData: object; // JSON-LD structured data
  ogImage?: string;
  isIndexable: boolean; // From checkSEOEligibility()
}

export interface PublicPageShellProps {
  // SEO & Structured Data
  metadata: PublicPageShellMetadata;

  // Layout Slots
  hero: ReactNode; // Hero section (full-width)
  mainContent: ReactNode[]; // Array of sections for main column (2fr)
  sidebar: ReactNode[]; // Array of widgets for sidebar (1fr, sticky)

  // Optional Slots
  relatedSection?: ReactNode; // Optional related/similar items section (full-width)
  mobileBottomCTA?: ReactNode; // Fixed bottom CTA on mobile

  // Analytics & Tracking
  viewTracker?: ReactNode; // View tracking component (hidden)

  // Behavior
  showBottomSpacer?: boolean; // Add bottom spacing (default: true)
}

export default function PublicPageShell({
  metadata,
  hero,
  mainContent,
  sidebar,
  relatedSection,
  mobileBottomCTA,
  viewTracker,
  showBottomSpacer = true,
}: PublicPageShellProps) {
  return (
    <Container>
      {/* JSON-LD Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(metadata.structuredData) }}
      />

      {/* View Tracker (hidden component for analytics) */}
      {viewTracker}

      {/* SECTION 1: Hero Section (Full-width, 1-column) */}
      <section className={styles.heroSection}>{hero}</section>

      {/* SECTION 2: Body (2-column on desktop, stacked on mobile) */}
      <section className={styles.bodySection}>
        {/* Column 1: Main Content (2fr width on desktop) */}
        <div className={styles.mainColumn}>
          {mainContent.map((section, index) => (
            <div key={index}>
              {section}
            </div>
          ))}
        </div>

        {/* Column 2: Sidebar (1fr width, sticky on desktop) */}
        <aside className={styles.sidebarColumn}>
          {sidebar.map((widget, index) => (
            <div key={index}>
              {widget}
            </div>
          ))}
        </aside>
      </section>

      {/* SECTION 3: Related/Similar Items (optional, full-width) */}
      {relatedSection && (
        <section className={styles.relatedSection}>{relatedSection}</section>
      )}

      {/* Bottom Spacer (for mobile CTA clearance) */}
      {showBottomSpacer && <div className={styles.bottomSpacer} />}

      {/* Mobile Bottom CTA (fixed on mobile, hidden on desktop) */}
      {mobileBottomCTA}
    </Container>
  );
}
