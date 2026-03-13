/**
 * Filename: src/components/feature/scheduler/SchedulerModal.tsx
 * Purpose: Create/edit modal for scheduled items — uses hub modal + shared form components
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import HubComplexModal from '@/app/components/hub/modal/HubComplexModal/HubComplexModal';
import { HubForm } from '@/app/components/hub/form/HubForm';
import FormGroup from '@/app/components/ui/forms/FormGroup';
import Input from '@/app/components/ui/forms/Input';
import Textarea from '@/app/components/ui/forms/Textarea';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import DatePicker from '@/app/components/ui/forms/DatePicker';
import TimePicker from '@/app/components/ui/forms/TimePicker';
import Button from '@/app/components/ui/actions/Button';
import { ExternalLink } from 'lucide-react';
import type { ScheduledItem } from './SchedulerCalendar';
import modalStyles from './SchedulerModal.module.css';

interface SchedulerModalProps {
  item?: ScheduledItem | null;
  defaultDate?: Date | null;
  onSave: (data: Record<string, unknown>) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const TYPES = [
  { value: 'content', label: 'Content' },
  { value: 'agent_run', label: 'Agent Run' },
  { value: 'team_run', label: 'Team Run' },
  { value: 'task', label: 'Task' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'cron_job', label: 'Cron Job (HTTP)' },
  { value: 'sql_func', label: 'SQL Function' },
];

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'No recurrence' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'cron', label: 'Cron expression' },
];

const HTTP_METHODS = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
];

const PLATFORM_OPTIONS = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'resources', label: 'Resources Blog' },
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'newsletter', label: 'Newsletter' },
];

const FORMAT_OPTIONS = [
  { value: 'full_post', label: 'Full Post' },
  { value: 'carousel', label: 'Carousel' },
  { value: 'repost', label: 'Repost' },
  { value: 'article', label: 'Long-form Article' },
];

function extractTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

export default function SchedulerModal({ item, defaultDate, onSave, onDelete, onClose }: SchedulerModalProps) {
  const isEdit = !!item;

  // Fetch published articles for the content type dropdown
  const { data: articles = [] } = useQuery<Array<{ slug: string; title: string; status: string }>>({
    queryKey: ['resources-articles-list'],
    queryFn: async () => {
      const res = await fetch('/api/admin/resources/articles');
      if (!res.ok) return [];
      const json = await res.json();
      return json.articles || [];
    },
    staleTime: 120000,
  });

  const articleOptions = useMemo(() => {
    const opts = [{ value: '', label: 'No article linked' }];
    for (const a of articles) {
      opts.push({ value: a.slug, label: `${a.title}${a.status !== 'published' ? ` (${a.status})` : ''}` });
    }
    return opts;
  }, [articles]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<string | number>('content');
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string | number>('09:00');
  const [recurrence, setRecurrence] = useState<string | number>('none');
  const [tags, setTags] = useState('');
  const [color, setColor] = useState('');

  // Content-specific fields
  const [platform, setPlatform] = useState<string | number>('linkedin');
  const [contentFormat, setContentFormat] = useState<string | number>('full_post');
  const [articleSlug, setArticleSlug] = useState('');

  // Agent/Team specific
  const [agentSlug, setAgentSlug] = useState('');
  const [teamSlug, setTeamSlug] = useState('');
  const [taskDescription, setTaskDescription] = useState('');

  // Cron job / SQL function specific
  const [cronExpression, setCronExpression] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [httpMethod, setHttpMethod] = useState<string | number>('GET');
  const [sqlFunction, setSqlFunction] = useState('');

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setDescription(item.description || '');
      setType(item.type);
      const d = new Date(item.scheduled_at);
      setDate(d);
      setTime(extractTime(d));
      setRecurrence(item.recurrence || 'none');
      setTags(item.tags.join(', '));
      setColor(item.color || '');

      const meta = item.metadata as Record<string, string>;
      if (item.type === 'content') {
        setPlatform(meta?.platform || 'linkedin');
        setContentFormat(meta?.format || 'full_post');
        setArticleSlug(meta?.article_slug || '');
      } else if (item.type === 'agent_run') {
        setAgentSlug(meta?.agent_slug || '');
        setTaskDescription(meta?.task || '');
      } else if (item.type === 'team_run') {
        setTeamSlug(meta?.team_slug || '');
        setTaskDescription(meta?.task || '');
      }

      // Cron/SQL fields (from item-level columns, not metadata)
      if (item.cron_expression) setCronExpression(item.cron_expression);
      if (item.endpoint) setEndpoint(item.endpoint);
      if (item.http_method) setHttpMethod(item.http_method);
      if (item.sql_function) setSqlFunction(item.sql_function);
    } else if (defaultDate) {
      setDate(defaultDate);
      setTime(extractTime(defaultDate));
    }
  }, [item, defaultDate]);

  const handleSubmit = () => {
    if (!title || !date) return;

    const scheduled = new Date(date);
    const timeParts = String(time).split(':');
    scheduled.setHours(parseInt(timeParts[0], 10), parseInt(timeParts[1], 10), 0, 0);

    const metadata: Record<string, unknown> = {};
    const typeStr = String(type);

    if (typeStr === 'content') {
      metadata.platform = String(platform);
      metadata.format = String(contentFormat);
      if (articleSlug) metadata.article_slug = articleSlug;
    } else if (typeStr === 'agent_run') {
      if (agentSlug) metadata.agent_slug = agentSlug;
      if (taskDescription) metadata.task = taskDescription;
    } else if (typeStr === 'team_run') {
      if (teamSlug) metadata.team_slug = teamSlug;
      if (taskDescription) metadata.task = taskDescription;
    } else if (typeStr === 'task' || typeStr === 'reminder') {
      if (taskDescription) metadata.message = taskDescription;
    }

    const rec = String(recurrence);

    const payload: Record<string, unknown> = {
      title,
      description: description || null,
      type: typeStr,
      scheduled_at: scheduled.toISOString(),
      recurrence: rec === 'none' ? null : rec,
      metadata,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      color: color || null,
    };

    // Cron/SQL fields
    if (rec === 'cron' && cronExpression) payload.cron_expression = cronExpression;
    if (typeStr === 'cron_job') {
      payload.endpoint = endpoint || null;
      payload.http_method = String(httpMethod);
      if (cronExpression) payload.cron_expression = cronExpression;
    }
    if (typeStr === 'sql_func') {
      payload.sql_function = sqlFunction || null;
      if (cronExpression) payload.cron_expression = cronExpression;
    }

    onSave(payload);
  };

  const typeStr = String(type);

  return (
    <HubComplexModal
      isOpen={true}
      onClose={onClose}
      title={isEdit ? 'Edit Scheduled Item' : 'New Scheduled Item'}
      size="md"
      footer={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isEdit && onDelete ? (
            <Button variant="danger" size="sm" onClick={() => { if (confirm('Delete this item?')) onDelete(item!.id); }}>
              Delete
            </Button>
          ) : null}
          <div style={{ display: 'flex', gap: '0.75rem', marginLeft: 'auto' }}>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSubmit}>
              {isEdit ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      }
    >
      <div style={{ padding: '1.5rem' }}>
      <HubForm.Root className={modalStyles.compactForm}>
        <FormGroup label="Title" htmlFor="scheduler-title">
          <Input
            id="scheduler-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Publish Docker Hub article on LinkedIn"
            required
          />
        </FormGroup>

        <HubForm.Grid columns={2}>
          <FormGroup label="Type" htmlFor="scheduler-type">
            <UnifiedSelect
              options={TYPES}
              value={type}
              onChange={(v) => setType(v)}
              placeholder="Select type"
            />
          </FormGroup>
          <FormGroup label="Date" htmlFor="scheduler-date">
            <DatePicker
              selected={date}
              onSelect={setDate}
              placeholder="Pick a date"
            />
          </FormGroup>
        </HubForm.Grid>

        <HubForm.Grid columns={2}>
          <FormGroup label="Time" htmlFor="scheduler-time">
            <TimePicker
              value={time}
              onChange={(v) => setTime(v)}
              interval={30}
            />
          </FormGroup>
          <FormGroup label="Recurrence" htmlFor="scheduler-recurrence">
            <UnifiedSelect
              options={RECURRENCE_OPTIONS}
              value={recurrence}
              onChange={(v) => setRecurrence(v)}
            />
          </FormGroup>
        </HubForm.Grid>

        {/* Content type fields */}
        {typeStr === 'content' && (
          <>
            <HubForm.Grid columns={2}>
              <FormGroup label="Platform" htmlFor="scheduler-platform">
                <UnifiedSelect
                  options={PLATFORM_OPTIONS}
                  value={platform}
                  onChange={(v) => setPlatform(v)}
                />
              </FormGroup>
              <FormGroup label="Format" htmlFor="scheduler-format">
                <UnifiedSelect
                  options={FORMAT_OPTIONS}
                  value={contentFormat}
                  onChange={(v) => setContentFormat(v)}
                />
              </FormGroup>
            </HubForm.Grid>
            <FormGroup label="Article" htmlFor="scheduler-article">
              <UnifiedSelect
                options={articleOptions}
                value={articleSlug}
                onChange={(v) => setArticleSlug(String(v))}
                placeholder="Link to a resource article"
              />
              {articleSlug && (
                <a
                  href={`/resources/${articleSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#0d9488', marginTop: '0.375rem', textDecoration: 'none' }}
                >
                  <ExternalLink size={12} />
                  View article
                </a>
              )}
            </FormGroup>
          </>
        )}

        {/* Agent run fields */}
        {typeStr === 'agent_run' && (
          <>
            <FormGroup label="Agent Slug" htmlFor="scheduler-agent">
              <Input
                id="scheduler-agent"
                value={agentSlug}
                onChange={(e) => setAgentSlug(e.target.value)}
                placeholder="market-intelligence"
              />
            </FormGroup>
            <FormGroup label="Task Description" htmlFor="scheduler-agent-task">
              <Input
                id="scheduler-agent-task"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Weekly GTM analysis"
              />
            </FormGroup>
          </>
        )}

        {/* Team run fields */}
        {typeStr === 'team_run' && (
          <>
            <FormGroup label="Team Slug" htmlFor="scheduler-team">
              <Input
                id="scheduler-team"
                value={teamSlug}
                onChange={(e) => setTeamSlug(e.target.value)}
                placeholder="gtm-team"
              />
            </FormGroup>
            <FormGroup label="Task Description" htmlFor="scheduler-team-task">
              <Input
                id="scheduler-team-task"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Full-funnel GTM synthesis"
              />
            </FormGroup>
          </>
        )}

        {/* Task/Reminder fields */}
        {(typeStr === 'task' || typeStr === 'reminder') && (
          <FormGroup label={typeStr === 'reminder' ? 'Reminder Message' : 'Task Description'} htmlFor="scheduler-task-desc">
            <Input
              id="scheduler-task-desc"
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder={typeStr === 'reminder' ? 'Check LinkedIn analytics' : 'Create Canva templates'}
            />
          </FormGroup>
        )}

        {/* Cron Job fields */}
        {typeStr === 'cron_job' && (
          <>
            <HubForm.Grid columns={2}>
              <FormGroup label="Endpoint" htmlFor="scheduler-endpoint">
                <Input
                  id="scheduler-endpoint"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="/api/cron/session-reminders"
                />
              </FormGroup>
              <FormGroup label="HTTP Method" htmlFor="scheduler-http-method">
                <UnifiedSelect
                  options={HTTP_METHODS}
                  value={httpMethod}
                  onChange={(v) => setHttpMethod(v)}
                />
              </FormGroup>
            </HubForm.Grid>
            <FormGroup label="Cron Expression" htmlFor="scheduler-cron" footnote="e.g. */5 * * * * (every 5 min)">
              <Input
                id="scheduler-cron"
                value={cronExpression}
                onChange={(e) => setCronExpression(e.target.value)}
                placeholder="0 * * * *"
              />
            </FormGroup>
          </>
        )}

        {/* SQL Function fields */}
        {typeStr === 'sql_func' && (
          <>
            <FormGroup label="SQL Function" htmlFor="scheduler-sql-func">
              <Input
                id="scheduler-sql-func"
                value={sqlFunction}
                onChange={(e) => setSqlFunction(e.target.value)}
                placeholder="cleanup_expired_slot_reservations"
              />
            </FormGroup>
            <FormGroup label="Cron Expression" htmlFor="scheduler-cron-sql" footnote="e.g. */30 * * * * (every 30 min)">
              <Input
                id="scheduler-cron-sql"
                value={cronExpression}
                onChange={(e) => setCronExpression(e.target.value)}
                placeholder="*/30 * * * *"
              />
            </FormGroup>
          </>
        )}

        {/* Cron expression for other types with cron recurrence */}
        {typeStr !== 'cron_job' && typeStr !== 'sql_func' && String(recurrence) === 'cron' && (
          <FormGroup label="Cron Expression" htmlFor="scheduler-cron-generic" footnote="e.g. 0 9 * * 1 (Mon 9am)">
            <Input
              id="scheduler-cron-generic"
              value={cronExpression}
              onChange={(e) => setCronExpression(e.target.value)}
              placeholder="0 9 * * 1"
            />
          </FormGroup>
        )}

        <FormGroup label="Notes" htmlFor="scheduler-notes" footnote="Optional context or instructions">
          <Textarea
            id="scheduler-notes"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Additional context..."
          />
        </FormGroup>

        <HubForm.Grid columns={2}>
          <FormGroup label="Tags" htmlFor="scheduler-tags" footnote="Comma-separated">
            <Input
              id="scheduler-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="linkedin, gtm"
            />
          </FormGroup>
          <FormGroup label="Color" htmlFor="scheduler-color">
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="color"
                value={color || '#0d9488'}
                onChange={(e) => setColor(e.target.value)}
                style={{ width: '2rem', height: '2rem', border: '1px solid #e5e7eb', borderRadius: '0.25rem', cursor: 'pointer', padding: 0, flexShrink: 0 }}
              />
              <Input
                id="scheduler-color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#0d9488"
              />
            </div>
            <p style={{ fontSize: 'var(--font-size-xs, 12px)', color: 'var(--color-text-secondary, #5f6368)', marginTop: 'var(--space-1, 8px)', paddingLeft: '42px', lineHeight: 1.5 }}>Hex code for calendar</p>
          </FormGroup>
        </HubForm.Grid>
      </HubForm.Root>
      </div>
    </HubComplexModal>
  );
}
