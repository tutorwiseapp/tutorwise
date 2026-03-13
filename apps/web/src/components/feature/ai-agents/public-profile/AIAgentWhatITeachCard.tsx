/**
 * Filename: AIAgentWhatITeachCard.tsx
 * Purpose: "What I Teach" card — replaces ProfessionalInfoCard for AI tutors
 * Shows subject + skills as tags
 * Created: 2026-03-03
 */

import Card from '@/components/ui/data-display/Card';
import type { AIAgentPublicProfile } from './AIAgentHeroSection';
import styles from './AIAgentWhatITeachCard.module.css';

interface AIAgentWhatITeachCardProps {
  agent: AIAgentPublicProfile;
}

export function AIAgentWhatITeachCard({ agent }: AIAgentWhatITeachCardProps) {
  const hasContent = agent.subject || (agent.skills && agent.skills.length > 0);

  if (!hasContent) return null;

  return (
    <Card className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>What I Teach</h2>
      </div>
      <div className={styles.cardContent}>
        {/* Subject */}
        {agent.subject && (
          <div className={styles.section}>
            <h3 className={styles.sectionLabel}>Subject</h3>
            <div className={styles.tagContainer}>
              <span className={styles.subjectTag}>{agent.subject}</span>
            </div>
          </div>
        )}

        {/* Skills */}
        {agent.skills && agent.skills.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionLabel}>Skills & Topics</h3>
            <div className={styles.tagContainer}>
              {agent.skills.map((skill) => (
                <span key={skill} className={styles.tag}>{skill}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
