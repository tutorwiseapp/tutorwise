/**
 * ReferralPipeline.tsx
 * Referral conversion pipeline using HubKanbanBoard shell with drag-and-drop
 * Created: 2026-01-02
 * Updated: 2026-01-02 - Added dnd-kit drag-and-drop functionality
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { HubKanbanBoard } from '@/app/components/hub/kanban';
import type { KanbanColumn } from '@/app/components/hub/kanban';
import { Users, Phone, Calendar, FileText, CheckCircle2, Briefcase } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
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
  { key: 'referred', label: 'New Leads', icon: Users, color: '#94a3b8' },
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

// Droppable Column Component
function DroppableColumn({
  stageKey,
  children,
  isOver,
}: {
  stageKey: string;
  children: React.ReactNode;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({
    id: stageKey,
  });

  return (
    <div
      ref={setNodeRef}
      className={styles.columnContent}
      style={{
        backgroundColor: isOver ? 'rgba(0, 108, 103, 0.05)' : undefined,
        transition: 'background-color 0.2s',
      }}
    >
      {children}
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Configure sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts (prevents accidental drags)
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms delay for touch devices (prevents scroll conflicts)
        tolerance: 5,
      },
    })
  );

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

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over?.id as string | null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);
    setOverId(null);

    if (!over) return;

    const referralId = active.id as string;
    const newStage = over.id as string;

    // Get current stage
    const currentStage = pipeline.find((stage) =>
      stage.referrals.some((r) => r.id === referralId)
    );

    if (!currentStage || currentStage.stage === newStage) {
      return; // No change needed
    }

    // Optimistic update
    const updatedPipeline = pipeline.map((stage) => {
      if (stage.stage === currentStage.stage) {
        // Remove from current stage
        return {
          ...stage,
          referrals: stage.referrals.filter((r) => r.id !== referralId),
        };
      } else if (stage.stage === newStage) {
        // Add to new stage
        const referral = currentStage.referrals.find((r) => r.id === referralId);
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

      const { error } = await supabase.rpc('update_referral_conversion_stage', {
        p_referral_id: referralId,
        p_new_stage: newStage,
        p_performed_by: currentUser.user.id,
        p_notes: `Moved from ${currentStage.stage} to ${newStage}`,
        p_metadata: {},
      });

      if (error) throw error;

      toast.success(`Lead moved to ${STAGE_CONFIG.find((s) => s.key === newStage)?.label}`);

      // Reload pipeline to get updated data
      await loadPipeline();
    } catch (error: any) {
      console.error('Error updating referral stage:', error);
      toast.error('Failed to update lead stage');

      // Rollback optimistic update
      setPipeline(pipeline);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
  };

  // Apply date filter and search to pipeline data
  const filteredPipeline = applyFilters(pipeline, dateFilter, searchQuery);

  // Get the active dragging referral for the overlay
  const activeReferral = activeId
    ? filteredPipeline
        .flatMap((stage) => stage.referrals)
        .find((referral) => referral.id === activeId)
    : null;

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
    const isOver = overId === stageConfig.key;

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
      color: stageConfig.color, // Pass stage color for top border
      content: (
        <DroppableColumn stageKey={stageConfig.key} isOver={isOver}>
          {/* Cards or Empty State */}
          {referrals.length > 0 ? (
            <div className={styles.cards}>
              {referrals.map((referral) => (
                <DraggableCard key={referral.id} referral={referral} onCardClick={onCardClick} />
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <StageIcon size={32} />
              <p>No leads</p>
            </div>
          )}
        </DroppableColumn>
      ),
    };
  });

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <HubKanbanBoard columns={columns} />
      <DragOverlay>
        {activeReferral ? (
          <div className={styles.card} style={{ opacity: 0.8, cursor: 'grabbing' }}>
            <div className={styles.cardName}>{activeReferral.referred_name || 'Unknown'}</div>
            <div className={styles.cardEmail}>{activeReferral.referred_email || 'No email'}</div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
