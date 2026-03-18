/**
 * Filename: apps/web/src/app/(admin)/admin/scheduler/page.tsx
 * Purpose: General-purpose scheduler — calendar, list, jobs management, execution history
 * Created: 2026-03-12
 */

'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { HubPageLayout, HubHeader, HubTabs } from '@/components/hub/layout';
import HubSidebar from '@/components/hub/sidebar/HubSidebar';
import { AdminStatsWidget } from '@/components/admin/widgets';
import ErrorBoundary from '@/components/ui/feedback/ErrorBoundary';
import Button from '@/components/ui/actions/Button';
import UnifiedSelect from '@/components/ui/forms/UnifiedSelect';
import { Plus, Zap, Monitor } from 'lucide-react';
import toast from 'react-hot-toast';
import SchedulerCalendar from '@/components/feature/scheduler/SchedulerCalendar';
import type { ScheduledItem } from '@/components/feature/scheduler/SchedulerCalendar';
import SchedulerList from '@/components/feature/scheduler/SchedulerList';
import SchedulerModal from '@/components/feature/scheduler/SchedulerModal';
import SchedulerJobs from '@/components/feature/scheduler/SchedulerJobs';
import SchedulerHistory from '@/components/feature/scheduler/SchedulerHistory';
import styles from './page.module.css';

type ViewTab = 'calendar' | 'upcoming' | 'all' | 'jobs' | 'history' | 'completed';

const TYPE_FILTERS = [
  { value: '', label: 'All Types' },
  { value: 'content', label: 'Content' },
  { value: 'agent_run', label: 'Agent Run' },
  { value: 'team_run', label: 'Team Run' },
  { value: 'task', label: 'Task' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'cron_job', label: 'Cron Job' },
  { value: 'sql_func', label: 'SQL Function' },
];

export default function SchedulerPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ViewTab>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<ScheduledItem | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | null>(null);
  const [historyFilterItemId, setHistoryFilterItemId] = useState<string | null>(null);

  // Fetch items for current month range (with buffer for calendar overflow)
  const monthStart = startOfMonth(subMonths(currentMonth, 1));
  const monthEnd = endOfMonth(addMonths(currentMonth, 1));

  const { data: items = [], isLoading } = useQuery<ScheduledItem[]>({
    queryKey: ['scheduler-items', monthStart.toISOString(), monthEnd.toISOString(), typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: monthStart.toISOString(),
        to: monthEnd.toISOString(),
      });
      if (typeFilter) params.set('type', typeFilter);

      const res = await fetch(`/api/admin/scheduler?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      return json.data;
    },
    staleTime: 30000,
    refetchOnMount: 'always',
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch('/api/admin/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduler-items'] });
      setShowModal(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create item');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/admin/scheduler/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduler-items'] });
      setShowModal(false);
      setEditItem(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update item');
    },
  });

  // Complete mutation
  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/scheduler/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', completed_at: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error('Failed to complete');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduler-items'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to complete item');
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/scheduler/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to cancel');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduler-items'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel item');
    },
  });

  // Seed GTM content cycle
  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/scheduler/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: 'linkedin-content-cycle',
          start_date: new Date().toISOString(),
          articles: [
            { slug: 'agent-marketplace-docker-hub-moment', title: 'Agent Marketplace is the Docker Hub Moment', color: '#0d9488' },
            { slug: 'registry-not-framework', title: 'Why Your AI Agent Framework Needs a Registry', color: '#7c3aed' },
            { slug: 'hitl-is-architecture', title: 'HITL is Not a Feature. It\'s an Architecture', color: '#d97706' },
          ],
        }),
      });
      if (!res.ok) throw new Error('Failed to seed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduler-items'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to seed GTM cycle');
    },
  });

  const handleItemClick = useCallback((item: ScheduledItem) => {
    setEditItem(item);
    setDefaultDate(null);
    setShowModal(true);
  }, []);

  const handleDayClick = useCallback((date: Date) => {
    setEditItem(null);
    setDefaultDate(date);
    setShowModal(true);
  }, []);

  const handleSave = useCallback((data: Record<string, unknown>) => {
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  }, [editItem, updateMutation, createMutation]);

  const handleNewItem = useCallback(() => {
    setEditItem(null);
    setDefaultDate(new Date());
    setShowModal(true);
  }, []);

  const handleViewHistory = useCallback((itemId: string) => {
    setHistoryFilterItemId(itemId);
    setActiveTab('history');
  }, []);

  // Stats
  const scheduled = items.filter((i) => i.status === 'scheduled').length;
  const inProgress = items.filter((i) => i.status === 'in_progress').length;
  const completed = items.filter((i) => i.status === 'completed').length;
  const contentCount = items.filter((i) => i.type === 'content' && i.status !== 'cancelled').length;
  const agentCount = items.filter((i) => (i.type === 'agent_run' || i.type === 'team_run') && i.status !== 'cancelled').length;

  return (
    <ErrorBoundary>
      <div className={styles.mobileBlock}>
        <Monitor size={48} color="#9ca3af" />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', margin: 0 }}>Desktop required</h2>
        <p style={{ fontSize: '0.9375rem', color: '#6b7280', maxWidth: '320px', textAlign: 'center', margin: 0 }}>
          The Scheduler is designed for desktop. Please switch to a larger screen.
        </p>
      </div>

      <HubPageLayout
        header={
          <HubHeader
            title="Scheduler"
            subtitle="Plan and track content publishing, agent runs, and tasks"
            actions={
              <div className={styles.headerActions}>
                <UnifiedSelect
                  options={TYPE_FILTERS}
                  value={typeFilter}
                  onChange={(v) => setTypeFilter(String(v))}
                  placeholder="All Types"
                  size="sm"
                />
                <Button variant="secondary" size="sm" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
                  <Zap size={14} />
                  {seedMutation.isPending ? 'Seeding...' : 'Seed GTM Cycle'}
                </Button>
                <Button variant="primary" size="sm" onClick={handleNewItem}>
                  <Plus size={14} />
                  New Item
                </Button>
              </div>
            }
          />
        }
        tabs={
          <HubTabs
            tabs={[
              { id: 'calendar', label: 'Calendar', active: activeTab === 'calendar' },
              { id: 'upcoming', label: 'Upcoming', count: scheduled + inProgress, active: activeTab === 'upcoming' },
              { id: 'all', label: 'All Items', count: items.filter((i) => i.status !== 'cancelled').length, active: activeTab === 'all' },
              { id: 'jobs', label: 'Jobs', active: activeTab === 'jobs' },
              { id: 'history', label: 'History', active: activeTab === 'history' },
              { id: 'completed', label: 'Completed', count: completed, active: activeTab === 'completed' },
            ]}
            onTabChange={(tabId) => {
              setActiveTab(tabId as ViewTab);
              if (tabId !== 'history') setHistoryFilterItemId(null);
            }}
          />
        }
        sidebar={
          <HubSidebar>
            <AdminStatsWidget
              title="Schedule Overview"
              stats={[
                { label: 'Scheduled', value: scheduled },
                { label: 'In Progress', value: inProgress },
                { label: 'Completed', value: completed },
                { label: 'Content Posts', value: contentCount },
                { label: 'Agent/Team Runs', value: agentCount },
              ]}
            />
          </HubSidebar>
        }
      >
        {/* Calendar View */}
        {activeTab === 'calendar' && (
          <div className={styles.calendarSection}>
            {isLoading ? (
              <div className={styles.loading}>Loading calendar...</div>
            ) : (
              <SchedulerCalendar
                items={items}
                currentMonth={currentMonth}
                onPrevMonth={() => setCurrentMonth((m) => subMonths(m, 1))}
                onNextMonth={() => setCurrentMonth((m) => addMonths(m, 1))}
                onItemClick={handleItemClick}
                onDayClick={handleDayClick}
              />
            )}
          </div>
        )}

        {/* List Views */}
        {(activeTab === 'upcoming' || activeTab === 'all' || activeTab === 'completed') && (
          <div className={styles.listSection}>
            {isLoading ? (
              <div className={styles.loading}>Loading items...</div>
            ) : (
              <SchedulerList
                items={items}
                onItemClick={handleItemClick}
                onComplete={(id) => completeMutation.mutate(id)}
                onCancel={(id) => cancelMutation.mutate(id)}
                filter={activeTab === 'upcoming' ? 'upcoming' : activeTab === 'completed' ? 'completed' : 'all'}
              />
            )}
          </div>
        )}

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <SchedulerJobs onViewHistory={handleViewHistory} />
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <SchedulerHistory
            filterItemId={historyFilterItemId}
            onClearFilter={() => setHistoryFilterItemId(null)}
          />
        )}

        {/* Modal */}
        {showModal && (
          <SchedulerModal
            item={editItem}
            defaultDate={defaultDate}
            onSave={handleSave}
            onDelete={(id) => { cancelMutation.mutate(id); setShowModal(false); setEditItem(null); }}
            onClose={() => { setShowModal(false); setEditItem(null); }}
          />
        )}
      </HubPageLayout>
    </ErrorBoundary>
  );
}
