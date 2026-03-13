/**
 * Filename: AIAgentStatsCard.tsx
 * Purpose: Profile stats card for AI tutor public profile sidebar
 * Created: 2026-03-03
 *
 * Replaces RoleStatsCard. Shows AI-specific stats:
 * - Launched (created_at)
 * - Total Sessions
 * - Students Helped (unique clients)
 * - Average Rating
 * - Total Reviews
 * - Profile Views
 */

import Card from '@/components/ui/data-display/Card';
import type { AIAgentPublicProfile } from './AIAgentHeroSection';
import styles from './AIAgentStatsCard.module.css';

interface AIAgentStatsCardProps {
  agent: AIAgentPublicProfile;
  studentsHelped: number;
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.statItem}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  );
}

export function AIAgentStatsCard({ agent, studentsHelped }: AIAgentStatsCardProps) {
  const launchedDate = new Date(agent.created_at).toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
  });

  return (
    <Card className={styles.statsCard}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>AI Tutor Stats</h3>
      </div>
      <div className={styles.statsGrid}>
        <StatItem label="Launched" value={launchedDate} />
        <StatItem label="Total Sessions" value={agent.total_sessions ?? 0} />
        <StatItem label="Students Helped" value={studentsHelped} />
        <StatItem
          label="Average Rating"
          value={agent.avg_rating ? `${agent.avg_rating.toFixed(1)}/5` : '—'}
        />
        <StatItem label="Total Reviews" value={agent.total_reviews ?? 0} />
        <StatItem label="Profile Views" value={agent.view_count ?? 0} />
      </div>
    </Card>
  );
}
