/**
 * Filename: HelpCard.tsx
 * Purpose: Role-specific help card showing next steps after onboarding
 * Created: 2025-12-07
 * Updated: 2025-12-07 - Migrated to HubComplexCard design pattern
 */

'use client';

import React from 'react';
import Link from 'next/link';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './HelpCard.module.css';

interface HelpStep {
  title: string;
  description: string;
  action: string;
  href: string;
  completed?: boolean;
}

interface HelpCardProps {
  role: 'client' | 'tutor' | 'agent';
  profileCompleteness?: number; // 0-100
  hasListings?: boolean;
  hasBookings?: boolean;
}

export default function HelpCard({
  role,
  profileCompleteness = 0,
  hasListings = false,
  hasBookings = false
}: HelpCardProps) {

  // Role-specific help steps
  const getHelpSteps = (): HelpStep[] => {
    switch (role) {
      case 'client':
        return [
          {
            title: 'Complete Your Profile',
            description: 'Add your learning goals and preferences to help tutors understand your needs',
            action: 'Edit Profile',
            href: '/account/personal-info',
            completed: profileCompleteness >= 80
          },
          {
            title: 'Browse Tutors',
            description: 'Explore our marketplace to find the perfect tutor for your learning journey',
            action: 'Find Tutors',
            href: '/marketplace',
            completed: false
          },
          {
            title: 'Book Your First Session',
            description: 'Schedule a session with a tutor that matches your requirements',
            action: 'View Bookings',
            href: '/bookings',
            completed: hasBookings
          },
          {
            title: 'Set Up Payment Method',
            description: 'Add a payment method for seamless booking experience',
            action: 'Payment Settings',
            href: '/settings/payments',
            completed: false
          }
        ];

      case 'tutor':
        return [
          {
            title: 'Complete Your Profile',
            description: 'Showcase your expertise, qualifications, and teaching style',
            action: 'Edit Profile',
            href: '/account/personal-info',
            completed: profileCompleteness >= 80
          },
          {
            title: 'Create Your First Listing',
            description: 'Set up your subjects, availability, and pricing to start accepting bookings',
            action: 'Create Listing',
            href: '/create-listing',
            completed: hasListings
          },
          {
            title: 'Set Your Availability',
            description: 'Let students know when you\'re available for sessions',
            action: 'Manage Availability',
            href: '/account/availability',
            completed: false
          },
          {
            title: 'Verify Your Qualifications',
            description: 'Upload certificates to increase trust and bookings',
            action: 'Add Credentials',
            href: '/account/credentials',
            completed: false
          },
          {
            title: 'Set Up Payouts',
            description: 'Configure your bank account to receive payments',
            action: 'Payout Settings',
            href: '/settings/payouts',
            completed: false
          }
        ];

      case 'agent':
        return [
          {
            title: 'Complete Your Agency Profile',
            description: 'Showcase your agency\'s mission, expertise, and unique value proposition',
            action: 'Edit Profile',
            href: '/account/personal-info',
            completed: profileCompleteness >= 80
          },
          {
            title: 'Add Your Tutors',
            description: 'Invite tutors to join your agency and create their listings',
            action: 'Manage Tutors',
            href: '/organisation',
            completed: hasListings
          },
          {
            title: 'Create Service Listings',
            description: 'Set up listings for your tutors with competitive pricing',
            action: 'Create Listing',
            href: '/create-listing',
            completed: hasListings
          },
          {
            title: 'Set Commission Structure',
            description: 'Configure commission rates for your tutors',
            action: 'Settings',
            href: '/settings/organisation',
            completed: false
          },
          {
            title: 'Set Up Payouts',
            description: 'Configure your bank account to receive commission payments',
            action: 'Payout Settings',
            href: '/settings/payouts',
            completed: false
          }
        ];

      default:
        return [];
    }
  };

  const steps = getHelpSteps();
  const nextStep = steps.find(step => !step.completed);
  const completedCount = steps.filter(step => step.completed).length;

  return (
    <HubComplexCard>
      <h3 className={styles.title}>Getting Started</h3>

      <div className={styles.content}>
        {/* Progress indicator */}
        <div className={styles.progress}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${(completedCount / steps.length) * 100}%` }}
            />
          </div>
          <span className={styles.progressText}>
            {completedCount} of {steps.length} steps completed
          </span>
        </div>

        {/* Next step highlight */}
        {nextStep && (
          <div className={styles.nextStep}>
            <h4 className={styles.nextStepTitle}>Next Step</h4>
            <p className={styles.stepTitle}>{nextStep.title}</p>
            <p className={styles.stepDescription}>{nextStep.description}</p>
            <Link href={nextStep.href} className={styles.actionButton}>
              {nextStep.action}
            </Link>
          </div>
        )}

        {/* All steps completed */}
        {!nextStep && (
          <div className={styles.completed}>
            <p className={styles.completedText}>
              🎉 Great job! You&apos;ve completed all getting started steps.
            </p>
            <Link href="/help" className={styles.actionButton}>
              Explore Help Center
            </Link>
          </div>
        )}

        {/* All steps list */}
        <details className={styles.allSteps}>
          <summary className={styles.allStepsSummary}>View all steps</summary>
          <ul className={styles.stepsList}>
            {steps.map((step, index) => (
              <li key={index} className={step.completed ? styles.stepCompleted : styles.stepPending}>
                <span className={styles.stepCheckbox}>
                  {step.completed ? '✓' : index + 1}
                </span>
                <div className={styles.stepContent}>
                  <span className={styles.stepName}>{step.title}</span>
                  {!step.completed && (
                    <Link href={step.href} className={styles.stepLink}>
                      {step.action}
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </details>

        {/* Support link */}
        <div className={styles.footer}>
          <p className={styles.footerText}>Need help?</p>
          <Link href="/support" className={styles.supportLink}>
            Contact Support
          </Link>
        </div>
      </div>
    </HubComplexCard>
  );
}
