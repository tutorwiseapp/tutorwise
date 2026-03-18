'use client';

import { memo } from 'react';
import type { NodeProps } from 'reactflow';
import { User, Clock, ExternalLink, ChevronRight } from 'lucide-react';
import { NODE_TYPE_CONFIG } from './types';
import type { ProcessStepData, ProcessStepType } from './types';
import { useWorkflowStore } from './store';
import { CanvasNode } from '@/components/feature/canvas';
import styles from './ProcessStepNode.module.css';

/** Canonical accent color per process step type */
export const TYPE_COLORS: Record<ProcessStepType, string> = {
  trigger:      '#16a34a',
  action:       '#3b82f6',
  condition:    '#d97706',
  approval:     '#8b5cf6',
  notification: '#0891b2',
  end:          '#6b7280',
  subprocess:   '#0d9488',
  agent:        '#7c3aed',
  team:         '#0891b2',
};

/** Derive a human-readable subtitle from node data */
function resolveSubtitle(data: ProcessStepData): string | undefined {
  const cfg = data.handler_config as Record<string, unknown> | undefined;
  if (data.type === 'agent') {
    const slug = cfg?.agent_slug as string | undefined;
    return slug ? slug.replace(/-/g, ' ') : undefined;
  }
  if (data.type === 'team') {
    const slug = cfg?.team_slug as string | undefined;
    return slug ? slug.replace(/-/g, ' ') : undefined;
  }
  if (data.type === 'subprocess' && data.templateName) {
    return data.templateName;
  }
  return undefined;
}

function ProcessStepNodeComponent({ data, selected }: NodeProps<ProcessStepData>) {
  const config = NODE_TYPE_CONFIG[data.type];
  const requestDrillDown = useWorkflowStore((s) => s.requestDrillDown);
  const isSubprocess = data.type === 'subprocess' || !!data.templateName;

  const subtitle = resolveSubtitle(data);

  const footer = isSubprocess ? (
    <div className={styles.subprocessFooter}>
      {data.stepCount != null && (
        <span className={styles.stepCountBadge}>{data.stepCount} steps</span>
      )}
      <button
        className={styles.drillDownBtn}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          requestDrillDown(data.templateName || data.label);
        }}
        title="Open linked template"
      >
        Open <ChevronRight size={11} />
      </button>
    </div>
  ) : undefined;

  const meta = (data.assignee || data.estimatedDuration || data.externalUrl) ? (
    <>
      {data.assignee && (
        <span className={styles.metaItem}>
          <User size={11} aria-hidden="true" /> {data.assignee}
        </span>
      )}
      {data.estimatedDuration && (
        <span className={styles.metaItem}>
          <Clock size={11} aria-hidden="true" /> {data.estimatedDuration}
        </span>
      )}
      {data.externalUrl && (
        <a
          className={styles.metaLink}
          href={data.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={data.externalUrl}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink size={11} />
        </a>
      )}
    </>
  ) : undefined;

  const navigateType =
    data.type === 'agent' ? 'agents' as const :
    data.type === 'team'  ? 'teams'  as const :
    undefined;

  return (
    <CanvasNode
      label={data.label}
      typeLabel={config.label}
      icon={config.icon}
      accentColor={TYPE_COLORS[data.type]}
      subtitle={subtitle}
      description={data.description}
      status={data.status}
      selected={selected}
      footer={footer}
      meta={meta}
      hasTargetHandle
      hasSourceHandle={data.type !== 'condition'}
      hasSideHandles
      conditionHandles={data.type === 'condition'}
      navigateType={navigateType}
    />
  );
}

export const ProcessStepNode = memo(ProcessStepNodeComponent);
