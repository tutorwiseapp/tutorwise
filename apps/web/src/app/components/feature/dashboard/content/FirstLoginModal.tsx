/**
 * Filename: FirstLoginModal.tsx
 * Purpose: Welcome modal shown on first dashboard visit after onboarding
 * Created: 2025-12-15
 * Updated: 2026-01-03 - Migrated to HubComplexModal for better UX
 * Track B Phase 1.2: Priority 2 - Sets expectations from day 1
 *
 * Design Goals:
 * - Welcome user and congratulate onboarding completion
 * - Explain CaaS score and its importance
 * - Show what completed profile looks like
 * - Clear CTA to start profile setup
 * - Success Metric: 70%+ click "Start Setup" vs "Skip"
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import HubComplexModal from '@/app/components/hub/modal/HubComplexModal/HubComplexModal';
import Button from '@/app/components/ui/actions/Button';
import styles from './FirstLoginModal.module.css';

interface FirstLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  role: 'tutor' | 'client' | 'agent';
  currentScore: number;
}

export default function FirstLoginModal({
  isOpen,
  onClose,
  userName = 'there',
  role,
  currentScore,
}: FirstLoginModalProps) {
  const router = useRouter();

  const handleStartSetup = () => {
    // Track analytics: User clicked "Start Setup"
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'first_login_modal_start_setup', {
        role: role,
        current_score: currentScore,
      });
    }

    onClose();
    router.push('/account/professional-info');
  };

  const handleSkip = () => {
    // Track analytics: User clicked "Skip"
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'first_login_modal_skip', {
        role: role,
        current_score: currentScore,
      });
    }

    onClose();
  };

  // Role-specific content
  const getRoleContent = () => {
    switch (role) {
      case 'tutor':
        return {
          title: `Welcome to Your Teaching Studio, ${userName}!`,
          subtitle: 'Great start! Now let\'s make you stand out',
          benefits: [
            {
              title: 'Be Found First',
              description: 'Tutors with complete profiles appear higher in search results',
            },
            {
              title: 'Get More Bookings',
              description: 'Complete profiles receive 3x more inquiries from students',
            },
            {
              title: 'Build Trust Faster',
              description: 'Your CaaS score shows students you\'re credible and committed',
            },
          ],
          scoreInfo: 'Your current credibility score is',
          completionSteps: [
            'Add your teaching credentials and qualifications',
            'Upload a 30-second intro video',
            'Set your availability and session preferences',
            'Upload your DBS certificate (verified tutors get priority)',
          ],
        };

      case 'client':
        return {
          title: `Welcome to Your Learning Hub, ${userName}!`,
          subtitle: 'You\'ve completed onboarding! Let\'s find the perfect tutor',
          benefits: [
            {
              title: 'Better Matches',
              description: 'Complete profile helps us recommend the right tutors for you',
            },
            {
              title: 'Faster Responses',
              description: 'Tutors prioritize students with detailed learning goals',
            },
            {
              title: 'Track Progress',
              description: 'Full profile unlocks session tracking and progress reports',
            },
          ],
          scoreInfo: 'Your profile completeness is',
          completionSteps: [
            'Describe your learning goals and objectives',
            'Specify preferred learning style and schedule',
            'Add subjects and skill levels you want to improve',
            'Set your budget and session preferences',
          ],
        };

      case 'agent':
        return {
          title: `Welcome to Your Agency Hub, ${userName}!`,
          subtitle: 'Onboarding complete! Let\'s set up your agency for success',
          benefits: [
            {
              title: 'Agency Credibility',
              description: 'Complete agency profile attracts top tutors and students',
            },
            {
              title: 'Manage Your Team',
              description: 'Invite tutors, track performance, and manage bookings',
            },
            {
              title: 'Scale Your Business',
              description: 'Professional profile helps you grow your tutoring network',
            },
          ],
          scoreInfo: 'Your agency credibility score is',
          completionSteps: [
            'Complete your agency profile and credentials',
            'Invite tutors to join your agency',
            'Set commission structure and payment terms',
            'Create your first service listings',
          ],
        };

      default:
        return {
          title: `Welcome, ${userName}!`,
          subtitle: 'Let\'s complete your profile',
          benefits: [],
          scoreInfo: 'Your profile score is',
          completionSteps: [],
        };
    }
  };

  const content = getRoleContent();

  // Get score status
  const getScoreStatus = () => {
    if (currentScore >= 80) return { color: '#10b981', label: 'Excellent' };
    if (currentScore >= 60) return { color: '#3b82f6', label: 'Good' };
    if (currentScore >= 40) return { color: '#f59e0b', label: 'Fair' };
    return { color: '#ef4444', label: 'Needs Work' };
  };

  const scoreStatus = getScoreStatus();

  return (
    <HubComplexModal
      isOpen={isOpen}
      onClose={handleSkip}
      title={content.title}
      subtitle={content.subtitle}
      size="lg"
      closeOnOverlayClick={false}
      footer={
        <div className={styles.footer}>
          <button onClick={handleSkip} className={styles.skipButton}>
            I&apos;ll do this later
          </button>
          <Button
            variant="primary"
            size="lg"
            onClick={handleStartSetup}
          >
            Start Profile Setup
          </Button>
        </div>
      }
    >
      <div className={styles.content}>
        {/* Score Display */}
        <div className={styles.scoreSection}>
          <p className={styles.scoreLabel}>{content.scoreInfo}</p>
          <div className={styles.scoreDisplay}>
            <div
              className={styles.scoreCircle}
              style={{ borderColor: scoreStatus.color }}
            >
              <span className={styles.scoreNumber} style={{ color: scoreStatus.color }}>
                {currentScore}
              </span>
              <span className={styles.scoreOutOf}>/100</span>
            </div>
            <div className={styles.scoreInfo}>
              <span
                className={styles.scoreStatus}
                style={{ backgroundColor: scoreStatus.color }}
              >
                {scoreStatus.label}
              </span>
              <p className={styles.scoreMessage}>
                {currentScore < 60
                  ? 'Let\'s improve this together!'
                  : 'Nice start! A few more steps to stand out'}
              </p>
            </div>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className={styles.benefitsSection}>
          <h3 className={styles.sectionTitle}>Why Complete Your Profile?</h3>
          <div className={styles.benefitsGrid}>
            {content.benefits.map((benefit, index) => (
              <div key={index} className={styles.benefitCard}>
                <h4 className={styles.benefitTitle}>{benefit.title}</h4>
                <p className={styles.benefitDescription}>{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Completion Steps */}
        {content.completionSteps.length > 0 && (
          <div className={styles.stepsSection}>
            <h3 className={styles.sectionTitle}>Quick Setup (5 mins)</h3>
            <ul className={styles.stepsList}>
              {content.completionSteps.map((step, index) => (
                <li key={index} className={styles.stepItem}>
                  <span className={styles.stepNumber}>{index + 1}</span>
                  <span className={styles.stepText}>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer Note */}
        <div className={styles.footerNote}>
          <p>
            <strong>Tip:</strong> Completing your profile takes just 5 minutes and significantly
            boosts your {role === 'client' ? 'matches' : 'visibility'}
          </p>
        </div>
      </div>
    </HubComplexModal>
  );
}
