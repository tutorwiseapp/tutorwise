'use client';

import { useState } from 'react';
import {
  Play, Circle, GitBranch, CheckCircle, Bell, Square, Layers,
  Brain, Users,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import type { ProcessStepType } from './types';
import styles from './NodePalette.module.css';

interface PaletteItem {
  type: ProcessStepType;
  label: string;
  description: string;
  icon: React.ElementType;
  cssClass: string;
}

const PALETTE_GROUPS: { group: string; items: PaletteItem[] }[] = [
  {
    group: 'Triggers',
    items: [
      { type: 'trigger', label: 'Trigger', description: 'Starts the workflow', icon: Play, cssClass: 'trigger' },
    ],
  },
  {
    group: 'Actions',
    items: [
      { type: 'action', label: 'Action', description: 'Perform an operation', icon: Circle, cssClass: 'action' },
    ],
  },
  {
    group: 'Decisions',
    items: [
      { type: 'condition', label: 'Condition', description: 'Branch Yes / No', icon: GitBranch, cssClass: 'condition' },
    ],
  },
  {
    group: 'Human',
    items: [
      { type: 'approval', label: 'Approval', description: 'Requires human decision', icon: CheckCircle, cssClass: 'approval' },
      { type: 'notification', label: 'Notification', description: 'Alert a user or admin', icon: Bell, cssClass: 'notification' },
    ],
  },
  {
    group: 'Flow',
    items: [
      { type: 'subprocess', label: 'Subprocess', description: 'Nested workflow', icon: Layers, cssClass: 'subprocess' },
    ],
  },
  {
    group: 'Agents',
    items: [
      { type: 'agent', label: 'Specialist Agent', description: 'Run a CAS specialist agent', icon: Brain, cssClass: 'agent' },
    ],
  },
  {
    group: 'Teams',
    items: [
      { type: 'team', label: 'Agent Team', description: 'Run a multi-agent team', icon: Users, cssClass: 'team' },
    ],
  },
  {
    group: 'End',
    items: [
      { type: 'end', label: 'End', description: 'Completes the workflow', icon: Square, cssClass: 'end' },
    ],
  },
];

interface NodePaletteProps {
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

export function NodePalette({ collapsed = false, onCollapse }: NodePaletteProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);

  const toggle = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    onCollapse?.(next);
  };

  const handleDragStart = (event: React.DragEvent, type: ProcessStepType) => {
    event.dataTransfer.setData('application/process-step-type', type);
    event.dataTransfer.effectAllowed = 'move';
  };

  if (isCollapsed) {
    return (
      <div className={styles.collapsed}>
        <button className={styles.collapseBtn} onClick={toggle} title="Expand node palette">
          <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className={styles.palette}>
      <div className={styles.paletteHeader}>
        <span className={styles.paletteTitle}>Nodes</span>
        <button className={styles.collapseBtn} onClick={toggle} title="Collapse palette">
          <ChevronLeft size={16} />
        </button>
      </div>

      <div className={styles.paletteBody}>
        {PALETTE_GROUPS.map(({ group, items }) => (
          <div key={group} className={styles.group}>
            <div className={styles.groupLabel}>{group}</div>
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.type}
                  className={`${styles.paletteItem} ${styles[item.cssClass]}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.type)}
                  title={item.description}
                >
                  <Icon size={14} className={styles.itemIcon} />
                  <span className={styles.itemLabel}>{item.label}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className={styles.paletteFooter}>
        Drag onto canvas
      </div>
    </div>
  );
}
