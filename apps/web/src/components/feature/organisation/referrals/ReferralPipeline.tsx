/**
 * ReferralPipeline.tsx
 * Referral conversion pipeline using HubKanbanBoard shell
 * Created: 2026-01-02
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { HubKanbanBoard } from '@/app/components/hub/kanban';
import type { KanbanColumn } from '@/app/components/hub/kanban';
import { Users, Phone, Calendar, FileText, CheckCircle2, Briefcase } from 'lucide-react';
import styles from './ReferralPipeline.module.css';

interface PipelineStage {
  stage: string;
  count: number | string;
  total_estimated_value: number | string;
  referrals: Array<{
    id: string;
    referred_name: string;
    referred_email: string;
    created_at: string;
    estimated_value: number | string;
    referrer_member: string;
  }>;
}

interface ReferralPipelineProps {
  organisationId: string;
}

const STAGE_CONFIG = [
  { key: 'referred', label: 'New Leads', icon: Users, color: '#94a3b8' },
  { key: 'contacted', label: 'Contacted', icon: Phone, color: '#3b82f6' },
  { key: 'meeting', label: 'Meeting Set', icon: Calendar, color: '#8b5cf6' },
  { key: 'proposal', label: 'Proposal Sent', icon: FileText, color: '#f59e0b' },
  { key: 'negotiating', label: 'Negotiating', icon: Briefcase, color: '#ec4899' },
  { key: 'converted', label: 'Won', icon: CheckCircle2, color: '#10b981' },
];

export function ReferralPipeline({ organisationId }: ReferralPipelineProps) {
  const supabase = createClient();
  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPipeline();
  }, [organisationId]);

  const loadPipeline = async () => {
    try {
      const { data, error } = await supabase.rpc('get_organisation_conversion_pipeline', {
        p_organisation_id: organisationId,
      });

      if (error) throw error;
      setPipeline(data || []);
    } catch (error) {
      console.error('Error loading pipeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase();
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <p>Loading pipeline...</p>
      </div>
    );
  }

  const columns: KanbanColumn[] = STAGE_CONFIG.map((stageConfig) => {
    const stageData = pipeline.find((s) => s.stage === stageConfig.key);
    const StageIcon = stageConfig.icon;
    const count = Number(stageData?.count || 0);
    const value = Number(stageData?.total_estimated_value || 0);
    const referrals = stageData?.referrals || [];

    return {
      id: stageConfig.key,
      title: `${stageConfig.label} (${count})`,
      color: stageConfig.color, // Pass stage color for top border
      content: (
        <div className={styles.columnContent}>
          {/* Column Header with Icon and Value */}
          <div className={styles.columnHeader}>
            <div
              className={styles.columnIcon}
              style={{
                backgroundColor: `${stageConfig.color}20`,
                color: stageConfig.color,
              }}
            >
              <StageIcon size={18} />
            </div>
            {value > 0 && (
              <div className={styles.columnValue}>{formatCurrency(value)}</div>
            )}
          </div>

          {/* Cards or Empty State */}
          {referrals.length > 0 ? (
            <div className={styles.cards}>
              {referrals.map((referral) => (
                <div key={referral.id} className={styles.card}>
                  <div className={styles.cardName}>
                    {referral.referred_name || 'Unknown'}
                  </div>
                  <div className={styles.cardEmail}>
                    {referral.referred_email || 'No email'}
                  </div>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardDate}>
                      {formatDate(referral.created_at)}
                    </span>
                    <span className={styles.cardValue}>
                      {formatCurrency(Number(referral.estimated_value || 0))}
                    </span>
                  </div>
                  {referral.referrer_member && (
                    <div className={styles.cardReferrer}>
                      via {referral.referrer_member}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <StageIcon size={32} />
              <p>No leads</p>
            </div>
          )}
        </div>
      ),
    };
  });

  return <HubKanbanBoard columns={columns} />;
}
