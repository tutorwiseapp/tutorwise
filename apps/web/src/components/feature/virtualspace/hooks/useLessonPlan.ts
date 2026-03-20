'use client';

/**
 * useLessonPlan
 *
 * Manages lesson plan loading and execution within a VirtualSpace session.
 * Tutor-only: fetches the tutor's plan library and supports loading a plan
 * into the current session (creating a sage_lesson_plan_executions record).
 *
 * @module components/feature/virtualspace/hooks/useLessonPlan
 */

import { useState, useCallback, useEffect } from 'react';

export interface LessonPhase {
  id: string;
  name: string;
  type: 'intro' | 'worked-example' | 'guided-practice' | 'independent-practice'
      | 'check' | 'consolidation' | 'extension' | 'recap';
  duration: number;
  instruction: string;
  canvasAssets?: Array<{ type: string; data: Record<string, unknown>; label?: string }>;
  successCriteria: string;
  adaptations?: {
    ifCorrect: string;
    ifStruggling: string;
    scaffold?: Array<{ type: string; data: Record<string, unknown>; label?: string }>;
  };
}

export interface LessonPlan {
  id: string;
  title: string;
  subject: string;
  level: string;
  topic: string;
  examBoard?: string;
  targetDuration: number;
  difficulty: string;
  isTemplate: boolean;
  status: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  phases?: LessonPhase[];
}

interface UseLessonPlanOptions {
  sessionId: string;
  sageSessionId: string | null;
  isActive: boolean;
}

export interface UseLessonPlanReturn {
  plans: LessonPlan[];
  isLoading: boolean;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  loadPlan: (planId: string) => Promise<void>;
  executionId: string | null;
  activePhaseIndex: number;
  /** Phases of the currently loaded plan — null when no plan is active */
  activePhases: LessonPhase[] | null;
  advancePhase: () => Promise<void>;
}

export function useLessonPlan({
  sessionId,
  sageSessionId,
  isActive,
}: UseLessonPlanOptions): UseLessonPlanReturn {
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [planId, setPlanId] = useState<string | null>(null);       // C3/L2 fix: store planId
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [activePhaseIndex, setActivePhaseIndex] = useState(0);
  const [activePhases, setActivePhases] = useState<LessonPhase[] | null>(null);

  // Fetch plans when drawer opens
  const fetchPlans = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/sage/lesson-plans');
      if (!res.ok) return;
      const { plans: fetched } = (await res.json()) as { plans: LessonPlan[] };
      setPlans(fetched ?? []);
    } catch {
      // non-fatal
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openDrawer = useCallback(() => {
    setIsDrawerOpen(true);
    fetchPlans();
  }, [fetchPlans]);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const loadPlan = useCallback(async (planId: string) => {
    if (!sageSessionId) return;
    try {
      const res = await fetch(`/api/sage/lesson-plans/${planId}/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ virtualspaceSessionId: sessionId, sageSessionId }),
      });
      if (!res.ok) return;
      const { executionId: newExecId, phases } = (await res.json()) as { executionId: string; phases?: LessonPhase[] };
      setPlanId(planId);          // C3/L2 fix: persist plan ID for advancePhase URL
      setExecutionId(newExecId);
      setActivePhaseIndex(0);
      setActivePhases(phases ?? null);
      setIsDrawerOpen(false);
    } catch {
      // non-fatal
    }
  }, [sessionId, sageSessionId]);

  const advancePhase = useCallback(async () => {
    if (!executionId || !planId) return;   // C3 fix: require planId for correct URL
    const nextIndex = activePhaseIndex + 1;
    setActivePhaseIndex(nextIndex);
    await fetch(`/api/sage/lesson-plans/${planId}/executions/${executionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_phase_index: nextIndex }),
    }).catch(() => {});
  }, [executionId, planId, activePhaseIndex]);

  // Reset when Sage deactivates
  useEffect(() => {
    if (!isActive) {
      setPlanId(null);
      setExecutionId(null);
      setActivePhaseIndex(0);
      setActivePhases(null);
      setIsDrawerOpen(false);
    }
  }, [isActive]);

  return {
    plans,
    isLoading,
    isDrawerOpen,
    openDrawer,
    closeDrawer,
    loadPlan,
    executionId,
    activePhaseIndex,
    activePhases,
    advancePhase,
  };
}
