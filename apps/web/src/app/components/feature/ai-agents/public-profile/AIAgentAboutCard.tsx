/**
 * Filename: AIAgentAboutCard.tsx
 * Purpose: About card for AI tutor public profile — copied from AboutCard, customised for AI
 * Created: 2026-03-03
 */

import Card from '@/app/components/ui/data-display/Card';
import { Zap } from 'lucide-react';
import type { AIAgentPublicProfile } from './AIAgentHeroSection';
import styles from './AIAgentAboutCard.module.css';

interface AIAgentAboutCardProps {
  agent: AIAgentPublicProfile;
}

export function AIAgentAboutCard({ agent }: AIAgentAboutCardProps) {
  const firstName = agent.display_name.split(' ')[0];

  if (!agent.description) {
    return (
      <Card className={styles.aboutCard}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>About</h2>
          <div className={styles.poweredBadge}><Zap size={13} />Powered by Tutorwise AI</div>
        </div>
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>{firstName} hasn&apos;t added a description yet.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={styles.aboutCard}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>About</h2>
        <div className={styles.poweredBadge}><Zap size={13} />Powered by Tutorwise AI</div>
      </div>
      <div className={styles.bioContent}>
        <p className={styles.bioText}>{agent.description}</p>
      </div>
    </Card>
  );
}
