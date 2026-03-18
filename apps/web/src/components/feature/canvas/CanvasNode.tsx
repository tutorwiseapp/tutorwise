'use client';

import { memo } from 'react';
import { Handle, Position, useNodeId } from 'reactflow';
import { useCanvasNodeActions } from './CanvasNodeActionsContext';
import styles from './CanvasNode.module.css';

export interface CanvasNodeProps {
  label: string;
  typeLabel: string;
  icon: React.ComponentType<{ size?: number }>;
  accentColor: string;
  description?: string;
  /** Secondary line below the label (e.g. agent slug, template name) */
  subtitle?: string;
  status?: 'pending' | 'active' | 'online' | 'completed' | 'skipped' | 'running';
  selected?: boolean;
  footer?: React.ReactNode;
  meta?: React.ReactNode;
  hasTargetHandle?: boolean;
  hasSourceHandle?: boolean;
  conditionHandles?: boolean;
  /** Which Conductor tab to navigate to (shows the → button in toolbar/menu) */
  navigateType?: 'agents' | 'teams';
}

function CanvasNodeComponent({
  label,
  typeLabel,
  icon: Icon,
  accentColor,
  description,
  subtitle,
  status,
  selected,
  footer,
  meta,
  hasTargetHandle = true,
  hasSourceHandle = true,
  conditionHandles = false,
  navigateType: _navigateType,
}: CanvasNodeProps) {
  useNodeId();
  useCanvasNodeActions();

  return (
    <>
      <div
        className={`${styles.node} ${selected ? styles.selected : ''}`}
        style={{ '--accent-color': accentColor } as React.CSSProperties}
        role="treeitem"
        aria-label={`${typeLabel}: ${label}`}
      >
        {hasTargetHandle && (
          <Handle type="target" position={Position.Top} className={styles.handle} />
        )}

        <div className={styles.typeBadge} aria-hidden="true">
          <Icon size={11} />
          {typeLabel}
        </div>

        <div className={styles.header}>
          <span className={styles.label}>{label}</span>
          {status && (
            <span
              className={`${styles.statusDot} ${styles[`status_${status}`]}`}
              title={status}
              aria-label={`Status: ${status}`}
            />
          )}
        </div>

        {subtitle && (
          <div className={styles.subtitle}>{subtitle}</div>
        )}

        {description && (
          <div className={styles.description}>{description}</div>
        )}

        {footer && <div className={styles.footer}>{footer}</div>}
        {meta && <div className={styles.meta}>{meta}</div>}

        {conditionHandles ? (
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
        ) : hasSourceHandle ? (
          <Handle type="source" position={Position.Bottom} className={styles.handle} />
        ) : null}
      </div>
    </>
  );
}

export const CanvasNode = memo(CanvasNodeComponent);
