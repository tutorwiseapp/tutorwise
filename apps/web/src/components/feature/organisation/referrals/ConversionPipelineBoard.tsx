/**
 * Filename: ConversionPipelineBoard.tsx
 * Purpose: Kanban-style board for managing referral conversion pipeline
 * Created: 2025-12-31
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Users, Phone, Calendar, FileText, CheckCircle2, XCircle, Briefcase, Plus } from 'lucide-react';
import { LeadConversionWizard } from './LeadConversionWizard';
import styles from './ConversionPipelineBoard.module.css';

interface PipelineStage {
  stage: string;
  count: number;
  total_estimated_value: number;
  referrals: Array<{
    id: string;
    referred_name: string;
    referred_email: string;
    created_at: string;
    estimated_value: number;
    referrer_member: string;
  }>;
}

interface ConversionPipelineBoardProps {
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

export function ConversionPipelineBoard({ organisationId }: ConversionPipelineBoardProps) {
  const supabase = createClient();

  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReferralId, setSelectedReferralId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);

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

  const handleReferralClick = (referralId: string) => {
    setSelectedReferralId(referralId);
    setShowWizard(true);
  };

  const handleCloseWizard = () => {
    setShowWizard(false);
    setSelectedReferralId(null);
    loadPipeline(); // Refresh pipeline after update
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getStageData = (stageKey: string) => {
    return pipeline.find((s) => s.stage === stageKey);
  };

  const getTotalPipelineValue = () => {
    return pipeline.reduce((sum, stage) => sum + (stage.total_estimated_value || 0), 0);
  };

  const getTotalLeads = () => {
    return pipeline.reduce((sum, stage) => sum + (stage.count || 0), 0);
  };

  if (loading) {
    return (
      <div className={styles.card}>
        <div className={styles.loading}>Loading conversion pipeline...</div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.card}>
        {/* Header with Stats */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Conversion Pipeline</h2>
            <p className={styles.subtitle}>Track and manage referral leads through your sales process</p>
          </div>
          <div className={styles.headerStats}>
            <div className={styles.statBadge}>
              <span className={styles.statLabel}>Total Leads</span>
              <span className={styles.statValue}>{getTotalLeads()}</span>
            </div>
            <div className={styles.statBadge}>
              <span className={styles.statLabel}>Pipeline Value</span>
              <span className={styles.statValue}>{formatCurrency(getTotalPipelineValue())}</span>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className={styles.board}>
          {STAGE_CONFIG.map((stageConfig) => {
            const StageIcon = stageConfig.icon;
            const stageData = getStageData(stageConfig.key);
            const count = stageData?.count || 0;
            const value = stageData?.total_estimated_value || 0;
            const referrals = stageData?.referrals || [];

            return (
              <div key={stageConfig.key} className={styles.column}>
                {/* Column Header */}
                <div
                  className={styles.columnHeader}
                  style={{ borderColor: stageConfig.color }}
                >
                  <div className={styles.columnTitle}>
                    <div
                      className={styles.columnIcon}
                      style={{ backgroundColor: `${stageConfig.color}20`, color: stageConfig.color }}
                    >
                      <StageIcon size={18} />
                    </div>
                    <span>{stageConfig.label}</span>
                    <span className={styles.columnCount}>{count}</span>
                  </div>
                  <div className={styles.columnValue}>{formatCurrency(value)}</div>
                </div>

                {/* Column Content */}
                <div className={styles.columnContent}>
                  {referrals.length > 0 ? (
                    <>
                      {referrals.map((referral) => (
                        <div
                          key={referral.id}
                          className={styles.leadCard}
                          onClick={() => handleReferralClick(referral.id)}
                        >
                          <div className={styles.leadName}>{referral.referred_name}</div>
                          <div className={styles.leadEmail}>{referral.referred_email}</div>
                          <div className={styles.leadMeta}>
                            <span className={styles.leadDate}>{formatDate(referral.created_at)}</span>
                            {referral.estimated_value > 0 && (
                              <span className={styles.leadValue}>
                                {formatCurrency(referral.estimated_value)}
                              </span>
                            )}
                          </div>
                          <div className={styles.leadReferrer}>via {referral.referrer_member}</div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className={styles.emptyColumn}>
                      <Plus size={32} />
                      <p>No leads in this stage</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lead Conversion Wizard Modal */}
      {showWizard && selectedReferralId && (
        <LeadConversionWizard
          organisationId={organisationId}
          referralId={selectedReferralId}
          onClose={handleCloseWizard}
        />
      )}
    </>
  );
}
