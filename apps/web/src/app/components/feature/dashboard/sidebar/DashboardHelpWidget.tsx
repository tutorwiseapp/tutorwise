/**
 * Filename: DashboardHelpWidget.tsx
 * Purpose: Dashboard Hub Help Widget with Role-Specific Content
 * Created: 2025-12-17
 * Updated: 2026-01-08 - Added role-specific dynamic content and CaaS-aware guidance
 */

'use client';

import React from 'react';
import Link from 'next/link';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './DashboardHelpWidget.module.css';

interface DashboardHelpWidgetProps {
  role?: 'tutor' | 'client' | 'agent';
  caasScore?: number;
  profileComplete?: boolean;
}

export default function DashboardHelpWidget({
  role = 'tutor',
  caasScore = 0,
  profileComplete: _profileComplete = false,
}: DashboardHelpWidgetProps) {
  // Get role-specific content based on CaaS score and completion status
  const getContent = () => {
    const isLowScore = caasScore < 40;
    const isMediumScore = caasScore >= 40 && caasScore < 70;

    switch (role) {
      case 'tutor':
        if (isLowScore) {
          return {
            title: 'Boost Your Visibility',
            paragraphs: [
              'Your Credibility Score affects how students find you. Complete your profile, upload verification documents, and set your availability to rank higher in search results.',
              'Tutors with scores above 70 receive 3x more booking inquiries than those with incomplete profiles.',
            ],
            link: { href: '/account/professional-info', text: 'Complete Your Profile →' },
          };
        }
        if (isMediumScore) {
          return {
            title: 'Growing Your Teaching Practice',
            paragraphs: [
              'Track your earnings trends and student bookings at a glance. Use the calendar heatmap to identify peak booking times and optimize your availability.',
              'Respond to student inquiries within 24 hours to maintain a high response rate, which directly impacts your search ranking.',
            ],
            link: { href: '/help/best-practices-tutors', text: 'View Best Practices →' },
          };
        }
        return {
          title: 'Maximize Your Success',
          paragraphs: [
            'Your high Credibility Score puts you at the top of search results. Monitor your KPIs to track earnings, bookings, and student retention.',
            'Consider enabling instant booking to capture more students, and keep your availability calendar updated for optimal visibility.',
          ],
          link: { href: '/marketplace', text: 'View Your Public Profile →' },
        };

      case 'client':
        return {
          title: 'Finding the Right Tutor',
          paragraphs: [
            'Browse verified tutors by subject, location, and availability. Use filters to find tutors that match your learning style and schedule.',
            'Read reviews from other students and check tutor credentials before booking your first session.',
          ],
          link: { href: '/marketplace', text: 'Browse Tutors →' },
        };

      case 'agent':
        if (isLowScore) {
          return {
            title: 'Build Your Agency Credibility',
            paragraphs: [
              'Complete your agency profile with verification documents and team details to attract more clients and tutors.',
              'Agencies with verified profiles receive 5x more partnership inquiries than unverified ones.',
            ],
            link: { href: '/organisation/settings', text: 'Complete Agency Profile →' },
          };
        }
        return {
          title: 'Managing Your Agency',
          paragraphs: [
            'Track your tutors performance, manage bookings, and monitor revenue streams from your dashboard.',
            'Use the team management tools to onboard new tutors and assign them to appropriate student matches.',
          ],
          link: { href: '/organisation', text: 'Manage Team →' },
        };

      default:
        return {
          title: 'Getting Started',
          paragraphs: [
            'Your dashboard provides an overview of your activity and performance.',
            'Use the navigation menu to access different areas of your account.',
          ],
          link: null,
        };
    }
  };

  const content = getContent();

  return (
    <HubComplexCard>
      <h3 className={styles.title}>{content.title}</h3>
      <div className={styles.content}>
        {content.paragraphs.map((paragraph, index) => (
          <p key={index} className={styles.text}>
            {paragraph}
          </p>
        ))}
        {content.link && (
          <Link href={content.link.href} className={styles.link}>
            {content.link.text}
          </Link>
        )}
      </div>
    </HubComplexCard>
  );
}
