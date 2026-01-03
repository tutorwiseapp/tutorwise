/**
 * ReferralPipeline.tsx
 * Referral conversion pipeline using HubKanbanBoard with drag-and-drop
 * Created: 2026-01-02
 * Updated: 2026-01-02 - Refactored to use HubKanbanBoard's built-in drag-and-drop
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import HubKanbanBoard from '@/app/components/hub/kanban/HubKanbanBoard';
import type { KanbanColumn } from '@/app/components/hub/kanban/HubKanbanBoard';
import { Users, Phone, Calendar, FileText, CheckCircle2, Briefcase } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import toast from 'react-hot-toast';
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
  dateFilter?: 'active' | '30days' | '90days' | 'all';
  searchQuery?: string;
  onCardClick?: (referralId: string) => void;
}

const STAGE_CONFIG = [
  { key: 'referred', label: 'New Referrals', icon: Users, color: '#94a3b8' },
  { key: 'contacted', label: 'Contacted', icon: Phone, color: '#3b82f6' },
  { key: 'meeting', label: 'Meeting Set', icon: Calendar, color: '#8b5cf6' },
  { key: 'proposal', label: 'Proposal Sent', icon: FileText, color: '#f59e0b' },
  { key: 'negotiating', label: 'Negotiating', icon: Briefcase, color: '#ec4899' },
  { key: 'converted', label: 'Won', icon: CheckCircle2, color: '#10b981' },
];

// Draggable Card Component
function DraggableCard({
  referral,
  onCardClick,
}: {
  referral: any;
  onCardClick?: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: referral.id,
    data: { referral },
  });

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

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={styles.card}
      onClick={(e) => {
        // Only trigger click if not dragging
        if (!isDragging && onCardClick) {
          onCardClick(referral.id);
        }
      }}
    >
      <div className={styles.cardName}>{referral.referred_name || 'Unknown'}</div>
      <div className={styles.cardEmail}>{referral.referred_email || 'No email'}</div>
      <div className={styles.cardMeta}>
        <span className={styles.cardDate}>{formatDate(referral.created_at)}</span>
        <span className={styles.cardValue}>
          {formatCurrency(Number(referral.estimated_value || 0))}
        </span>
      </div>
      {referral.referrer_member && (
        <div className={styles.cardReferrer}>via {referral.referrer_member}</div>
      )}
    </div>
  );
}

export function ReferralPipeline({
  organisationId,
  dateFilter = 'active',
  searchQuery = '',
  onCardClick,
}: ReferralPipelineProps) {
  const supabase = createClient();
  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    loadPipeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organisationId]);

  // Apply date filter and search to referrals
  const applyFilters = (
    referrals: PipelineStage[],
    filter: string,
    search: string
  ): PipelineStage[] => {
    const now = new Date();
    const searchLower = search.toLowerCase().trim();

    return referrals.map((stage) => {
      const filteredReferrals = (stage.referrals || []).filter((referral) => {
        // Search filter
        if (searchLower) {
          const name = (referral.referred_name || '').toLowerCase();
          const email = (referral.referred_email || '').toLowerCase();
          const referrer = (referral.referrer_member || '').toLowerCase();

          if (
            !name.includes(searchLower) &&
            !email.includes(searchLower) &&
            !referrer.includes(searchLower)
          ) {
            return false;
          }
        }

        // Date filter - Active Only: Hide converted > 30 days
        if (filter === 'active') {
          if (stage.stage === 'converted') {
            const createdDate = new Date(referral.created_at);
            const daysSince = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
            return daysSince <= 30; // Only show wins from last 30 days
          }
          return true; // Show all other stages
        }

        // Time-based filters
        if (filter === '30days' || filter === '90days') {
          const days = filter === '30days' ? 30 : 90;
          const referralDate = new Date(referral.created_at);
          const daysSince = (now.getTime() - referralDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysSince <= days;
        }

        // All Time: No filtering
        return true;
      });

      return {
        ...stage,
        referrals: filteredReferrals,
        count: filteredReferrals.length,
        total_estimated_value: filteredReferrals.reduce(
          (sum, r) => sum + Number(r.estimated_value || 0),
          0
        ),
      };
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Handle card move (drag-and-drop)
  const handleCardMove = async (cardId: string, fromColumnId: string, toColumnId: string) => {
    // Get current stage
    const currentStage = pipeline.find((stage) =>
      stage.referrals.some((r) => r.id === cardId)
    );

    if (!currentStage || currentStage.stage === toColumnId) {
      return; // No change needed
    }

    // Optimistic update
    const updatedPipeline = pipeline.map((stage) => {
      if (stage.stage === currentStage.stage) {
        // Remove from current stage
        return {
          ...stage,
          referrals: stage.referrals.filter((r) => r.id !== cardId),
        };
      } else if (stage.stage === toColumnId) {
        // Add to new stage
        const referral = currentStage.referrals.find((r) => r.id === cardId);
        return {
          ...stage,
          referrals: referral ? [...stage.referrals, referral] : stage.referrals,
        };
      }
      return stage;
    });

    setPipeline(updatedPipeline);

    // Update backend
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) throw new Error('Not authenticated');

      console.log('Calling RPC with:', {
        p_referral_id: cardId,
        p_new_stage: toColumnId,
        p_performed_by: currentUser.user.id,
        p_notes: `Moved from ${currentStage.stage} to ${toColumnId}`,
      });

      const { data, error } = await supabase.rpc('update_referral_conversion_stage', {
        p_referral_id: cardId,
        p_new_stage: toColumnId,
        p_performed_by: currentUser.user.id,
        p_notes: `Moved from ${currentStage.stage} to ${toColumnId}`,
        p_metadata: {},
      });

      console.log('RPC Response:', { data, error });

      if (error) throw error;

      toast.success(`Referral moved to ${STAGE_CONFIG.find((s) => s.key === toColumnId)?.label}`);

      // Reload pipeline to get updated data
      await loadPipeline();
    } catch (error: any) {
      console.error('Detailed error updating referral stage:', {
        error,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
      });
      toast.error(`Failed to update referral stage: ${error?.message || 'Unknown error'}`);

      // Rollback optimistic update
      setPipeline(pipeline);
    }
  };

  // Apply date filter and search to pipeline data
  const filteredPipeline = applyFilters(pipeline, dateFilter, searchQuery);

  if (loading) {
    return (
      <div className={styles.loading}>
        <p>Loading pipeline...</p>
      </div>
    );
  }

  const columns: KanbanColumn[] = STAGE_CONFIG.map((stageConfig) => {
    const stageData = filteredPipeline.find((s) => s.stage === stageConfig.key);
    const StageIcon = stageConfig.icon;
    const count = Number(stageData?.count || 0);
    const value = Number(stageData?.total_estimated_value || 0);
    const referrals = stageData?.referrals || [];

    return {
      id: stageConfig.key,
      title: (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <span>{stageConfig.label} ({count})</span>
          {value > 0 && (
            <span style={{ color: '#10b981', fontWeight: 600 }}>{formatCurrency(value)}</span>
          )}
        </div>
      ),
      color: stageConfig.color,
      content: (
        <div className={styles.columnContent}>
          {referrals.length > 0 ? (
            <div className={styles.cards}>
              {referrals.map((referral) => (
                <DraggableCard key={referral.id} referral={referral} onCardClick={onCardClick} />
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <StageIcon size={32} />
              <p>No referrals</p>
            </div>
          )}
        </div>
      ),
    };
  });

  // Render drag overlay
  const renderDragOverlay = (cardId: string) => {
    const referral = filteredPipeline
      .flatMap((stage) => stage.referrals)
      .find((r) => r.id === cardId);

    if (!referral) return null;

    return (
      <div className={styles.card} style={{ opacity: 0.8, cursor: 'grabbing' }}>
        <div className={styles.cardName}>{referral.referred_name || 'Unknown'}</div>
        <div className={styles.cardEmail}>{referral.referred_email || 'No email'}</div>
      </div>
    );
  };

  return (
    <HubKanbanBoard
      columns={columns}
      enableDragDrop={true}
      onCardMove={handleCardMove}
      renderDragOverlay={renderDragOverlay}
    />
  );
}
