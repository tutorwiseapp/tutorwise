/**
 * Filename: AdminActivityWidget.tsx
 * Purpose: Display recent admin activities from audit logs
 * Created: 2025-12-24
 * Design: Shows live activity feed from admin_audit_logs table
 *
 * Usage:
 * <AdminActivityWidget
 *   title="Recent Activity"
 *   limit={10}
 * />
 */

'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './AdminActivityWidget.module.css';

interface ActivityItem {
  id: string;
  admin_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: any;
  created_at: string;
  admin_name: string;
}

interface AdminActivityWidgetProps {
  title?: string;
  limit?: number;
}

export default function AdminActivityWidget({
  title = 'Recent Activity',
  limit = 10,
}: AdminActivityWidgetProps) {
  const supabase = createClient();

  const { data: activities, isLoading } = useQuery({
    queryKey: ['admin-activities', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select(`
          id,
          admin_id,
          action,
          resource_type,
          resource_id,
          details,
          created_at,
          profiles!admin_audit_logs_admin_id_fkey (
            full_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to fetch admin activities:', error);
        return [];
      }

      // Transform data to include admin name
      return (data || []).map((item: any) => ({
        ...item,
        admin_name: item.profiles?.full_name || 'Unknown Admin',
      })) as ActivityItem[];
    },
    staleTime: 30 * 1000, // 30 seconds - activity should be relatively fresh
    retry: 2,
  });

  const formatAction = (action: string, resourceType: string) => {
    const actionMap: Record<string, string> = {
      create: 'created',
      update: 'updated',
      delete: 'deleted',
      publish: 'published',
      moderate: 'moderated',
      approve: 'approved',
      reject: 'rejected',
      flag: 'flagged',
      grant_admin: 'granted admin access to',
      revoke_admin: 'revoked admin access from',
      change_role: 'changed role of',
    };

    const resourceMap: Record<string, string> = {
      hub: 'SEO Hub',
      spoke: 'SEO Spoke',
      citation: 'Citation',
      user: 'user',
      listing: 'listing',
      booking: 'booking',
      review: 'review',
      setting: 'setting',
    };

    const actionText = actionMap[action] || action;
    const resourceText = resourceMap[resourceType] || resourceType;

    return `${actionText} ${resourceText}`;
  };

  const formatTime = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  };

  return (
    <HubComplexCard className={styles.activityWidget}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
      </div>
      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.loading}>Loading activities...</div>
        ) : activities && activities.length > 0 ? (
          <div className={styles.activityList}>
            {activities.map((activity) => (
              <div key={activity.id} className={styles.activityItem}>
                <div className={styles.activityContent}>
                  <span className={styles.adminName}>{activity.admin_name}</span>
                  <span className={styles.activityText}>
                    {formatAction(activity.action, activity.resource_type)}
                  </span>
                  {activity.resource_id && (
                    <span className={styles.resourceId}>#{activity.resource_id.substring(0, 8)}</span>
                  )}
                </div>
                <div className={styles.activityTime}>{formatTime(activity.created_at)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>No recent activity</div>
        )}
      </div>
    </HubComplexCard>
  );
}
