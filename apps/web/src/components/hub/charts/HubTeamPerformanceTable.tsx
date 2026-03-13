/**
 * Filename: HubTeamPerformanceTable.tsx
 * Purpose: Team performance table for organisation analytics
 * Created: 2025-12-17
 * Pattern: Reusable table component for displaying team member performance metrics
 */

'use client';

import React, { memo } from 'react';
import { Star } from 'lucide-react';
import styles from './HubTeamPerformanceTable.module.css';

export interface TeamMember {
  member_id: string;
  member_name: string;
  member_email: string;
  member_avatar_url: string | null;
  total_revenue: number;
  sessions_count: number;
  active_students_count: number;
  avg_rating: number;
  last_session_at: string | null;
}

interface HubTeamPerformanceTableProps {
  data: TeamMember[];
  formatCurrency: (value: number) => string;
  isLoading?: boolean;
  isOwnerOrAdmin?: boolean; // Whether viewer is owner/admin
  totalMembers?: number; // Total member count (before limiting)
}

const HubTeamPerformanceTable = memo(function HubTeamPerformanceTable({
  data,
  formatCurrency,
  isLoading = false,
  isOwnerOrAdmin = false,
  totalMembers = 0
}: HubTeamPerformanceTableProps) {
  // Dynamic title based on viewer role
  const title = isOwnerOrAdmin ? 'Team Performance' : 'My Performance Summary';

  // Subtitle for owners/admins showing they're viewing top performers
  const subtitle = isOwnerOrAdmin && totalMembers > data.length
    ? `Showing top ${data.length} of ${totalMembers} members`
    : null;

  if (isLoading) {
    return (
      <div className={styles.widget}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h3 className={styles.title}>{title}</h3>
          </div>
        </div>
        <div className={styles.content}>
          <div className={styles.loading}>Loading team data...</div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={styles.widget}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h3 className={styles.title}>{title}</h3>
          </div>
        </div>
        <div className={styles.content}>
          <div className={styles.emptyState}>
            <p>No performance data available yet. Start booking sessions to see your metrics.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h3 className={styles.title}>{title}</h3>
        </div>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Member</th>
              <th>Revenue</th>
              <th>Sessions</th>
              <th>Students</th>
              <th>Avg. Rating</th>
              <th>Last Session</th>
            </tr>
          </thead>
          <tbody>
            {data.map((member) => (
              <tr key={member.member_id}>
                <td>
                  <div className={styles.memberCell}>
                    {member.member_avatar_url ? (
                      <img
                        src={member.member_avatar_url}
                        alt={member.member_name}
                        className={styles.memberAvatar}
                      />
                    ) : (
                      <div className={styles.memberAvatarPlaceholder}>
                        {member.member_name?.charAt(0) || '?'}
                      </div>
                    )}
                    <span className={styles.memberName}>{member.member_name}</span>
                  </div>
                </td>
                <td className={styles.numberCell}>{formatCurrency(member.total_revenue)}</td>
                <td className={styles.numberCell}>{member.sessions_count}</td>
                <td className={styles.numberCell}>{member.active_students_count}</td>
                <td className={styles.numberCell}>
                  <div className={styles.ratingCell}>
                    <Star size={14} className={styles.ratingIcon} />
                    {member.avg_rating.toFixed(1)}
                  </div>
                </td>
                <td className={styles.dateCell}>
                  {member.last_session_at
                    ? new Date(member.last_session_at).toLocaleDateString('en-GB', {
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'No sessions'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default HubTeamPerformanceTable;
