'use client';

import { memo } from 'react';
import { Handle, Position, NodeToolbar, useNodeId } from 'reactflow';
import { Pencil, Copy, Trash2, ArrowRight, Info } from 'lucide-react';
import { useCanvasNodeActions } from './CanvasNodeActionsContext';
import styles from './CanvasNode.module.css';

export interface CanvasNodeProps {
  label: string;
  typeLabel: string;
  icon: React.ComponentType<{ size?: number }>;
  accentColor: string;
  description?: string;
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
  status,
  selected,
  footer,
  meta,
  hasTargetHandle = true,
  hasSourceHandle = true,
  conditionHandles = false,
  navigateType,
}: CanvasNodeProps) {
  const nodeId = useNodeId() ?? '';
  const actions = useCanvasNodeActions();

  const hasToolbar = nodeId && (
    actions.onEdit ||
    actions.onDelete ||
    actions.onDuplicate ||
    actions.onViewDetails ||
    (actions.onNavigate && navigateType)
  );

  return (
    <>
      {hasToolbar && (
        <NodeToolbar isVisible={selected} position={Position.Top} offset={6}>
          <div className={styles.toolbar}>
            {actions.onViewDetails && (
              <button
                className={styles.toolbarBtn}
                onClick={() => actions.onViewDetails!(nodeId)}
                title="View details"
              >
                <Info size={13} />
              </button>
            )}
            {actions.onEdit && (
              <button
                className={styles.toolbarBtn}
                onClick={() => actions.onEdit!(nodeId)}
                title="Edit"
              >
                <Pencil size={13} />
              </button>
            )}
            {actions.onDuplicate && (
              <button
                className={styles.toolbarBtn}
                onClick={() => actions.onDuplicate!(nodeId)}
                title="Duplicate"
              >
                <Copy size={13} />
              </button>
            )}
            {actions.onNavigate && navigateType && (
              <>
                <div className={styles.toolbarDivider} />
                <button
                  className={`${styles.toolbarBtn} ${styles.toolbarBtnNavigate}`}
                  onClick={() => actions.onNavigate!(nodeId, navigateType)}
                  title={navigateType === 'agents' ? 'Configure agent' : 'Configure team'}
                >
                  <ArrowRight size={13} />
                </button>
              </>
            )}
            {actions.onDelete && (
              <>
                <div className={styles.toolbarDivider} />
                <button
                  className={`${styles.toolbarBtn} ${styles.toolbarBtnDanger}`}
                  onClick={() => actions.onDelete!(nodeId)}
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </>
            )}
          </div>
        </NodeToolbar>
      )}

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
