/**
 * Filename: AIAgentHowItWorksCard.tsx
 * Purpose: 3-step "How it works" explainer for AI tutor public profile
 * Created: 2026-03-03
 *
 * Replaces ServicesCard on the AI tutor page.
 * Shows: Start a Session → AI Tutors You → Pay & Review
 */

import Card from '@/components/ui/data-display/Card';
import { CreditCard, BrainCircuit, Star } from 'lucide-react';
import styles from './AIAgentHowItWorksCard.module.css';

const STEPS = [
  {
    icon: CreditCard,
    title: 'Start a Session',
    description: 'Pay securely per session. No subscription — start any time, cancel any time.',
    step: 1,
  },
  {
    icon: BrainCircuit,
    title: 'AI Tutors You',
    description: 'Get personalised explanations, practice questions, and instant feedback powered by Tutorwise AI.',
    step: 2,
  },
  {
    icon: Star,
    title: 'Review & Rate',
    description: 'Share your experience after each session to help other students find the right AI tutor.',
    step: 3,
  },
];

export function AIAgentHowItWorksCard() {
  return (
    <Card className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>How It Works</h2>
      </div>
      <div className={styles.cardContent}>
        {STEPS.map(({ icon: Icon, title, description, step }) => (
          <div key={step} className={styles.step}>
            <div className={styles.stepLeft}>
              <div className={styles.stepBadge}>{step}</div>
              {step < STEPS.length && <div className={styles.stepConnector} />}
            </div>
            <div className={styles.stepBody}>
              <div className={styles.stepIconWrapper}>
                <Icon size={18} />
              </div>
              <div className={styles.stepText}>
                <h3 className={styles.stepTitle}>{title}</h3>
                <p className={styles.stepDescription}>{description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
