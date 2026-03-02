'use client';

import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { User, Clock, ChevronRight, ExternalLink } from 'lucide-react';
import { NODE_TYPE_CONFIG } from './types';
import type { ProcessStepData } from './types';
import { useProcessStudioStore } from './store';
import styles from './ProcessStepNode.module.css';

function ProcessStepNodeComponent({ data, selected }: NodeProps<ProcessStepData>) {
  const config = NODE_TYPE_CONFIG[data.type];
  const Icon = config.icon;
  const isCondition = data.type === 'condition';
  const isSubprocess = data.type === 'subprocess';
  const requestDrillDown = useProcessStudioStore((s) => s.requestDrillDown);

  return (
    <div
      className={`${styles.node} ${styles[config.cssClass]} ${selected ? styles.selected : ''}`}
      role="treeitem"
      aria-label={`${config.label}: ${data.label}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className={styles.handle}
      />

      <div className={styles.header}>
        <span className={styles.icon} aria-hidden="true">
          <Icon size={16} />
        </span>
        <span className={styles.label}>{data.label}</span>
        {data.status && (
          <span
            className={`${styles.statusBadge} ${styles[`status_${data.status}`]}`}
            title={data.status}
            aria-label={`Status: ${data.status}`}
          />
        )}
      </div>

      {data.description && (
        <div className={styles.description}>{data.description}</div>
      )}

      {(isSubprocess || !!data.templateName) && (
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
      )}

      {(data.assignee || data.estimatedDuration || data.externalUrl) && (
        <div className={styles.meta}>
          {data.assignee && (
            <span className={styles.metaItem}>
              <User size={12} aria-hidden="true" /> {data.assignee}
            </span>
          )}
          {data.estimatedDuration && (
            <span className={styles.metaItem}>
              <Clock size={12} aria-hidden="true" /> {data.estimatedDuration}
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
        </div>
      )}

      {isCondition ? (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="yes"
            className={styles.handle}
            style={{ left: '30%' }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="no"
            className={styles.handle}
            style={{ left: '70%' }}
          />
          <div className={styles.conditionLabels}>
            <span className={styles.conditionYes}>Yes</span>
            <span className={styles.conditionNo}>No</span>
          </div>
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          className={styles.handle}
        />
      )}
    </div>
  );
}

export const ProcessStepNode = memo(ProcessStepNodeComponent);
