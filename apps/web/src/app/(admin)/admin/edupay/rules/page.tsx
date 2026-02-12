/*
 * Filename: src/app/(admin)/admin/edupay/rules/page.tsx
 * Purpose: Admin page for managing EduPay earning rules and multipliers
 * Created: 2026-02-12
 * Phase: 2 - Platform Management (Priority 2)
 * Pattern: Follows Admin Dashboard Gold Standard
 */
'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import HubPageLayout from '@/app/components/hub/layout/HubPageLayout';
import HubHeader from '@/app/components/hub/layout/HubHeader';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import { AdminHelpWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import { Settings, Edit2, Check, X, AlertTriangle } from 'lucide-react';
import Button from '@/app/components/ui/actions/Button';
import styles from './page.module.css';

// Force dynamic rendering for admin pages
export const dynamic = 'force-dynamic';

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

export default function AdminEduPayRulesPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<EduPayRule>>({});

  // Fetch rules
  const { data: rules, isLoading, error } = useQuery({
    queryKey: ['admin-edupay-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edupay_rules')
        .select('*')
        .order('event_type', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch rules: ${error.message}`);
      }

      return data as EduPayRule[];
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });

  // Update rule mutation
  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<EduPayRule> }) => {
      const { error } = await supabase
        .from('edupay_rules')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to update rule: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-edupay-rules'] });
      setEditingRule(null);
      setEditValues({});
    },
  });

  // Toggle rule active status
  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('edupay_rules')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to toggle rule: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-edupay-rules'] });
    },
  });

  const handleEdit = (rule: EduPayRule) => {
    setEditingRule(rule.id);
    setEditValues({
      ep_per_unit: rule.ep_per_unit,
      platform_fee_percent: rule.platform_fee_percent,
    });
  };

  const handleSave = (ruleId: string) => {
    updateRuleMutation.mutate({ id: ruleId, updates: editValues });
  };

  const handleCancel = () => {
    setEditingRule(null);
    setEditValues({});
  };

  // Format event type for display
  const formatEventType = (eventType: string) => {
    return eventType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Earning Rules"
          subtitle="Configure EP earning rates and platform fees"
          actions={
            <Button variant="primary" size="sm" disabled>
              <Settings size={16} style={{ marginRight: '0.5rem' }} />
              Add New Rule
            </Button>
          }
        />
      }
      sidebar={
        <HubSidebar>
          <AdminHelpWidget
            title="Rules Help"
            items={[
              { question: 'What are earning rules?', answer: 'Rules define how many EP users earn per unit of activity (e.g., £1 earned, referral converted).' },
              { question: 'Platform fee?', answer: 'The % Tutorwise takes from each conversion. Standard is 10% — users receive 90%.' },
              { question: 'Changing rules?', answer: 'Changes apply to NEW earnings only. Existing EP balances are not affected.' },
            ]}
          />
          <AdminTipWidget
            title="Configuration Tips"
            tips={[
              'Standard rate: 100 EP per £1 GBP',
              'Platform fee should remain at 10%',
              'Deactivate rules instead of deleting',
              'Test changes in staging first',
            ]}
          />
        </HubSidebar>
      }
    >
      {/* Rules Table */}
      <div className={styles.tableContainer}>
        {isLoading ? (
          <div className={styles.loading}>Loading rules...</div>
        ) : error ? (
          <div className={styles.error}>
            <AlertTriangle size={24} />
            <p>Error loading rules: {(error as Error).message}</p>
          </div>
        ) : (
          <table className={styles.rulesTable}>
            <thead>
              <tr>
                <th>Event Type</th>
                <th>Description</th>
                <th>EP per Unit</th>
                <th>Unit</th>
                <th>Platform Fee</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules?.map((rule) => (
                <tr key={rule.id} className={!rule.is_active ? styles.inactiveRow : undefined}>
                  <td className={styles.eventType}>
                    {formatEventType(rule.event_type)}
                  </td>
                  <td className={styles.description}>{rule.description}</td>
                  <td>
                    {editingRule === rule.id ? (
                      <input
                        type="number"
                        value={editValues.ep_per_unit ?? rule.ep_per_unit}
                        onChange={(e) => setEditValues({ ...editValues, ep_per_unit: parseInt(e.target.value) || 0 })}
                        className={styles.editInput}
                        min={0}
                      />
                    ) : (
                      <span className={styles.epValue}>{rule.ep_per_unit} EP</span>
                    )}
                  </td>
                  <td className={styles.unitType}>{rule.unit_type}</td>
                  <td>
                    {editingRule === rule.id ? (
                      <input
                        type="number"
                        value={editValues.platform_fee_percent ?? rule.platform_fee_percent}
                        onChange={(e) => setEditValues({ ...editValues, platform_fee_percent: parseFloat(e.target.value) || 0 })}
                        className={styles.editInput}
                        min={0}
                        max={100}
                        step={0.1}
                      />
                    ) : (
                      <span>{rule.platform_fee_percent}%</span>
                    )}
                  </td>
                  <td>
                    <button
                      className={`${styles.statusToggle} ${rule.is_active ? styles.active : styles.inactive}`}
                      onClick={() => toggleRuleMutation.mutate({ id: rule.id, isActive: !rule.is_active })}
                      disabled={toggleRuleMutation.isPending}
                    >
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td>
                    {editingRule === rule.id ? (
                      <div className={styles.editActions}>
                        <button
                          className={styles.saveButton}
                          onClick={() => handleSave(rule.id)}
                          disabled={updateRuleMutation.isPending}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          className={styles.cancelButton}
                          onClick={handleCancel}
                          disabled={updateRuleMutation.isPending}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        className={styles.editButton}
                        onClick={() => handleEdit(rule)}
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Warning Notice */}
      <div className={styles.warningNotice}>
        <AlertTriangle size={16} />
        <span>
          Changes to earning rules affect all future EP earnings. Existing wallet balances are not affected.
          Contact engineering before making significant rate changes.
        </span>
      </div>
    </HubPageLayout>
  );
}
