'use client';

import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { User, Clock } from 'lucide-react';
import { NODE_TYPE_CONFIG } from './types';
import type { ProcessStepData } from './types';
import styles from './ProcessStepNode.module.css';

function ProcessStepNodeComponent({ data, selected }: NodeProps<ProcessStepData>) {
  const config = NODE_TYPE_CONFIG[data.type];
  const Icon = config.icon;
  const isCondition = data.type === 'condition';

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
      </div>

      {data.description && (
        <div className={styles.description}>{data.description}</div>
      )}

      {(data.assignee || data.estimatedDuration) && (
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
