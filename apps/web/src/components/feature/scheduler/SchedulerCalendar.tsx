/**
 * Filename: src/components/feature/scheduler/SchedulerCalendar.tsx
 * Purpose: Month calendar grid showing scheduled items as colour-coded dots/blocks
 */

'use client';

import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { FileText, Bot, Users, CheckSquare, Bell, ExternalLink, Globe, Terminal } from 'lucide-react';
import styles from './SchedulerCalendar.module.css';

export interface ScheduledItem {
  id: string;
  title: string;
  description: string | null;
  type: 'content' | 'agent_run' | 'team_run' | 'task' | 'reminder' | 'cron_job' | 'sql_func';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
  scheduled_at: string;
  completed_at: string | null;
  due_date: string | null;
  recurrence: string | null;
  recurrence_end: string | null;
  metadata: Record<string, unknown>;
  tags: string[];
  color: string | null;
  created_at: string;
  updated_at: string;
  cron_expression: string | null;
  endpoint: string | null;
  sql_function: string | null;
  http_method: 'GET' | 'POST' | null;
  lock_version: number;
  locked_by: string | null;
  locked_at: string | null;
  started_at: string | null;
  attempt_count: number;
  max_retries: number;
  last_error: string | null;
  created_by: string | null;
}

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

interface SchedulerCalendarProps {
  items: ScheduledItem[];
  currentMonth: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onItemClick: (item: ScheduledItem) => void;
  onDayClick: (date: Date) => void;
}

export default function SchedulerCalendar({ items, currentMonth, onPrevMonth, onNextMonth, onItemClick, onDayClick }: SchedulerCalendarProps) {
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, ScheduledItem[]>();
    for (const item of items) {
      if (item.status === 'cancelled') continue;
      const dateKey = format(new Date(item.scheduled_at), 'yyyy-MM-dd');
      const existing = map.get(dateKey) || [];
      existing.push(item);
      map.set(dateKey, existing);
    }
    return map;
  }, [items]);

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className={styles.calendar}>
      {/* Month header */}
      <div className={styles.monthHeader}>
        <button className={styles.navButton} onClick={onPrevMonth}>
          ‹
        </button>
        <h2 className={styles.monthTitle}>{format(currentMonth, 'MMMM yyyy')}</h2>
        <button className={styles.navButton} onClick={onNextMonth}>
          ›
        </button>
      </div>

      {/* Weekday headers */}
      <div className={styles.weekDays}>
        {weekDays.map((day) => (
          <div key={day} className={styles.weekDay}>{day}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className={styles.dayGrid}>
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayItems = itemsByDay.get(dateKey) || [];
          const inMonth = isSameMonth(day, currentMonth);

          return (
            <div
              key={dateKey}
              className={`${styles.dayCell} ${!inMonth ? styles.outsideMonth : ''} ${isToday(day) ? styles.today : ''}`}
              onClick={() => onDayClick(day)}
            >
              <div className={styles.dayNumber}>{format(day, 'd')}</div>
              <div className={styles.dayItems}>
                {dayItems.slice(0, 3).map((item) => {
                  const Icon = TYPE_ICONS[item.type] || FileText;
                  const bgColor = item.color || TYPE_COLORS[item.type] || '#6b7280';
                  const articleSlug = (item.metadata as Record<string, string>)?.article_slug;
                  return (
                    <button
                      key={item.id}
                      className={`${styles.dayItem} ${item.status === 'completed' ? styles.completed : ''}`}
                      style={{ borderLeftColor: bgColor }}
                      onClick={(e) => { e.stopPropagation(); onItemClick(item); }}
                      title={item.title}
                    >
                      <Icon size={10} />
                      <span className={styles.dayItemTitle}>{item.title}</span>
                      {articleSlug && (
                        <a
                          href={`/resources/${articleSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className={styles.articleLink}
                          title="Open article"
                        >
                          <ExternalLink size={9} />
                        </a>
                      )}
                    </button>
                  );
                })}
                {dayItems.length > 3 && (
                  <div className={styles.moreItems}>+{dayItems.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
