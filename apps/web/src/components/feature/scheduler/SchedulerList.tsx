/**
 * Filename: src/components/feature/scheduler/SchedulerList.tsx
 * Purpose: Upcoming items list view for the scheduler
 */

'use client';

import { format, isPast, isToday as checkIsToday } from 'date-fns';
import { FileText, Bot, Users, CheckSquare, Bell, Check, X, RotateCw, Globe, Terminal } from 'lucide-react';
import type { ScheduledItem } from './SchedulerCalendar';
import styles from './SchedulerList.module.css';

const TYPE_LABELS: Record<string, string> = {
  content: 'Content',
  agent_run: 'Agent Run',
  team_run: 'Team Run',
  task: 'Task',
  reminder: 'Reminder',
  cron_job: 'Cron Job',
  sql_func: 'SQL Function',
};

const TYPE_COLORS: Record<string, string> = {
  content: '#0d9488',
  agent_run: '#7c3aed',
  team_run: '#6366f1',
  task: '#f59e0b',
  reminder: '#ef4444',
  cron_job: '#2563eb',
  sql_func: '#d97706',
};

const TYPE_ICONS: Record<string, typeof FileText> = {
  content: FileText,
  agent_run: Bot,
  team_run: Users,
  task: CheckSquare,
  reminder: Bell,
  cron_job: Globe,
  sql_func: Terminal,
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  failed: 'Failed',
};

interface SchedulerListProps {
  items: ScheduledItem[];
  onItemClick: (item: ScheduledItem) => void;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
  filter: 'upcoming' | 'all' | 'completed';
}

export default function SchedulerList({ items, onItemClick, onComplete, onCancel, filter }: SchedulerListProps) {
  const filtered = items.filter((item) => {
    if (filter === 'upcoming') return item.status === 'scheduled' || item.status === 'in_progress';
    if (filter === 'completed') return item.status === 'completed';
    return item.status !== 'cancelled';
  });

  if (filtered.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyTitle}>No items to show</p>
        <p className={styles.emptyDescription}>
          {filter === 'upcoming' ? 'No upcoming scheduled items.' : 'No items match this filter.'}
        </p>
      </div>
    );
  }

  // Group by date
  const groups = new Map<string, ScheduledItem[]>();
  for (const item of filtered) {
    const dateKey = format(new Date(item.scheduled_at), 'yyyy-MM-dd');
    const existing = groups.get(dateKey) || [];
    existing.push(item);
    groups.set(dateKey, existing);
  }

  return (
    <div className={styles.list}>
      {Array.from(groups.entries()).map(([dateKey, groupItems]) => {
        const date = new Date(dateKey);
        const isToday = checkIsToday(date);
        const overdue = isPast(date) && !isToday;

        return (
          <div key={dateKey} className={styles.dateGroup}>
            <div className={`${styles.dateHeader} ${isToday ? styles.today : ''} ${overdue ? styles.overdue : ''}`}>
              <span className={styles.dateName}>
                {isToday ? 'Today' : format(date, 'EEEE')}
              </span>
              <span className={styles.dateFormatted}>{format(date, 'd MMM yyyy')}</span>
            </div>

            {groupItems.map((item) => {
              const Icon = TYPE_ICONS[item.type] || FileText;
              const color = item.color || TYPE_COLORS[item.type] || '#6b7280';
              const time = format(new Date(item.scheduled_at), 'HH:mm');
              const meta = item.metadata as Record<string, string>;

              return (
                <div
                  key={item.id}
                  className={`${styles.item} ${item.status === 'completed' ? styles.completed : ''}`}
                  onClick={() => onItemClick(item)}
                >
                  <div className={styles.itemColor} style={{ backgroundColor: color }} />

                  <div className={styles.itemTime}>{time}</div>

                  <div className={styles.itemContent}>
                    <div className={styles.itemTitle}>{item.title}</div>
                    <div className={styles.itemMeta}>
                      <span className={styles.itemType}>
                        <Icon size={12} />
                        {TYPE_LABELS[item.type]}
                      </span>
                      {meta?.platform && (
                        <span className={styles.itemPlatform}>{meta.platform}</span>
                      )}
                      {meta?.format && (
                        <span className={styles.itemFormat}>{meta.format}</span>
                      )}
                      {item.recurrence && (
                        <span className={styles.itemRecurrence}>
                          <RotateCw size={10} />
                          {item.recurrence}
                        </span>
                      )}
                      <span className={`${styles.itemStatus} ${styles[`status_${item.status}`]}`}>
                        {STATUS_LABELS[item.status]}
                      </span>
                    </div>
                    {item.tags.length > 0 && (
                      <div className={styles.itemTags}>
                        {item.tags.map((tag) => (
                          <span key={tag} className={styles.tag}>{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {item.status === 'scheduled' && (
                    <div className={styles.itemActions}>
                      <button
                        className={styles.completeBtn}
                        onClick={(e) => { e.stopPropagation(); onComplete(item.id); }}
                        title="Mark complete"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        className={styles.cancelBtn}
                        onClick={(e) => { e.stopPropagation(); onCancel(item.id); }}
                        title="Cancel"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
