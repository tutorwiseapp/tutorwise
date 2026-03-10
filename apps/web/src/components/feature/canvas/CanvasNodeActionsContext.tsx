'use client';

import { createContext, useContext } from 'react';

export interface NodeActions {
  /** Open properties / edit panel for the node */
  onEdit?: (nodeId: string) => void;
  /** Delete the node */
  onDelete?: (nodeId: string) => void;
  /** Duplicate the node */
  onDuplicate?: (nodeId: string) => void;
  /** Cross-canvas navigation (e.g. jump to Agents or Teams tab) */
  onNavigate?: (nodeId: string, tab: 'agents' | 'teams') => void;
  /** Open inspection drawer (TeamCanvas read-only) */
  onViewDetails?: (nodeId: string) => void;
}

export const CanvasNodeActionsContext = createContext<NodeActions>({});

export function useCanvasNodeActions(): NodeActions {
  return useContext(CanvasNodeActionsContext);
}
