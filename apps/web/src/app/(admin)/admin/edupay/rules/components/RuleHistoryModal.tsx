/**
 * Filename: RuleHistoryModal.tsx
 * Purpose: Admin modal for viewing EduPay earning rule change history
 * Created: 2026-02-12
 * Pattern: Follows HubComplexModal pattern with history timeline
 */

'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import HubComplexModal from '@/app/components/hub/modal/HubComplexModal/HubComplexModal';
import Button from '@/app/components/ui/actions/Button';
import { History, User, Calendar, Edit3, Plus, ToggleLeft } from 'lucide-react';
import styles from './RuleHistoryModal.module.css';

interface EduPayRule {
  id: string;
  event_type: string;
  description: string;
  ep_per_unit: number;
  unit_type: string;
  platform_fee_percent: number;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
}

interface RuleHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  rule: EduPayRule | null;
}

interface HistoryEntry {
  id: string;
  admin_id: string;
  action_type: string;
  details: {
    rule_id?: string;
    event_type?: string;
    changes?: Record<string, unknown>;
    reason?: string;
  };
  created_at: string;
  admin_name?: string;
  admin_email?: string;
}

export default function RuleHistoryModal({
  isOpen,
  onClose,
  rule,
}: RuleHistoryModalProps) {
  const supabase = createClient();

  // Fetch history for this rule
  const { data: history, isLoading, error } = useQuery<HistoryEntry[]>({
    queryKey: ['rule-history', rule?.id],
    queryFn: async () => {
      if (!rule) return [];

      // Fetch action logs for this rule
      const { data: logs, error: logsError } = await supabase
        .from('admin_action_logs')
        .select('id, admin_id, action_type, details, created_at')
        .or(`details->rule_id.eq.${rule.id},details->>rule_id.eq.${rule.id}`)
        .in('action_type', ['edupay_rule_create', 'edupay_rule_update', 'edupay_rule_toggle'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (logsError) {
        console.error('Error fetching rule history:', logsError);
        return [];
      }

      // Fetch admin names for each log entry
      const adminIds = [...new Set(logs?.map(l => l.admin_id) || [])];
      const { data: admins } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', adminIds);

      // Map admin info to logs
      const adminMap = new Map(admins?.map(a => [a.id, { name: a.full_name, email: a.email }]) || []);

      return (logs || []).map(log => ({
        ...log,
        admin_name: adminMap.get(log.admin_id)?.name || 'Unknown Admin',
        admin_email: adminMap.get(log.admin_id)?.email || '',
      }));
    },
    enabled: isOpen && !!rule,
    staleTime: 30_000,
  });

  // Format event type for display
  const formatEventType = (eventType: string) => {
    return eventType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  // Format date/time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get action icon and label
  const getActionInfo = (actionType: string) => {
    switch (actionType) {
      case 'edupay_rule_create':
        return { icon: Plus, label: 'Rule Created', color: '#10b981' };
      case 'edupay_rule_update':
        return { icon: Edit3, label: 'Rule Updated', color: '#3b82f6' };
      case 'edupay_rule_toggle':
        return { icon: ToggleLeft, label: 'Status Changed', color: '#f59e0b' };
      default:
        return { icon: History, label: 'Change', color: '#6b7280' };
    }
  };

  // Format change details
  const formatChanges = (details: Record<string, unknown>) => {
    const changes = details.changes as Record<string, unknown> | undefined;
    if (!changes) return null;

    const formatValue = (key: string, value: unknown) => {
      if (key === 'is_active') return value ? 'Active' : 'Inactive';
      if (key === 'platform_fee_percent') return `${value}%`;
      if (key === 'ep_per_unit') return `${value} EP`;
      if (key === 'valid_from' || key === 'valid_until') {
        return value ? new Date(value as string).toLocaleDateString('en-GB') : 'No expiry';
      }
      return String(value);
    };

    return Object.entries(changes).map(([key, value]) => ({
      field: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      value: formatValue(key, value),
    }));
  };

  if (!rule) return null;

  return (
    <HubComplexModal
      isOpen={isOpen}
      onClose={onClose}
      title="Rule History"
      subtitle={formatEventType(rule.event_type)}
      size="lg"
      footer={
        <div className={styles.footer}>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className={styles.content}>
        {/* Rule Info */}
        <div className={styles.ruleInfo}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Event Type:</span>
            <span className={styles.infoValue}>{formatEventType(rule.event_type)}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Created:</span>
            <span className={styles.infoValue}>{formatDateTime(rule.created_at)}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Last Updated:</span>
            <span className={styles.infoValue}>{formatDateTime(rule.updated_at)}</span>
          </div>
        </div>

        {/* History Timeline */}
        <div className={styles.historySection}>
          <h3 className={styles.sectionTitle}>
            <History size={18} />
            Change History
          </h3>

          {isLoading ? (
            <div className={styles.loading}>Loading history...</div>
          ) : error ? (
            <div className={styles.error}>Failed to load history</div>
          ) : !history || history.length === 0 ? (
            <div className={styles.emptyHistory}>
              <History size={32} />
              <p>No history recorded for this rule.</p>
              <span>Changes made after rule creation will appear here.</span>
            </div>
          ) : (
            <div className={styles.timeline}>
              {history.map((entry, index) => {
                const actionInfo = getActionInfo(entry.action_type);
                const ActionIcon = actionInfo.icon;
                const changes = formatChanges(entry.details);

                return (
                  <div key={entry.id} className={styles.timelineItem}>
                    <div className={styles.timelineConnector}>
                      <div
                        className={styles.timelineIcon}
                        style={{ backgroundColor: actionInfo.color }}
                      >
                        <ActionIcon size={14} />
                      </div>
                      {index < history.length - 1 && <div className={styles.timelineLine} />}
                    </div>

                    <div className={styles.timelineContent}>
                      <div className={styles.timelineHeader}>
                        <span className={styles.actionLabel}>{actionInfo.label}</span>
                        <span className={styles.timelineDate}>
                          <Calendar size={12} />
                          {formatDateTime(entry.created_at)}
                        </span>
                      </div>

                      <div className={styles.timelineAdmin}>
                        <User size={12} />
                        <span>{entry.admin_name}</span>
                        {entry.admin_email && (
                          <span className={styles.adminEmail}>({entry.admin_email})</span>
                        )}
                      </div>

                      {changes && changes.length > 0 && (
                        <div className={styles.changesList}>
                          {changes.map((change, i) => (
                            <div key={i} className={styles.changeItem}>
                              <span className={styles.changeField}>{change.field}:</span>
                              <span className={styles.changeValue}>{change.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </HubComplexModal>
  );
}
