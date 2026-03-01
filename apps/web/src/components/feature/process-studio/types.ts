import type { Node, Edge } from 'reactflow';
import type { LucideIcon } from 'lucide-react';
import {
  Play,
  Circle,
  GitBranch,
  CheckCircle,
  Bell,
  Square,
} from 'lucide-react';

// --- Node Types ---

export const PROCESS_STEP_TYPES = [
  'trigger',
  'action',
  'condition',
  'approval',
  'notification',
  'end',
] as const;

export type ProcessStepType = (typeof PROCESS_STEP_TYPES)[number];

export interface ProcessStepData {
  label: string;
  type: ProcessStepType;
  description: string;
  objective?: string;
  completionCriteria?: string[];
  expectedOutputs?: string[];
  assignee?: string;
  estimatedDuration?: string;
  status?: 'pending' | 'active' | 'completed' | 'skipped';
  editable: boolean;
}

export type ProcessNode = Node<ProcessStepData>;
export type ProcessEdge = Edge;

// --- Node Type Config ---

export interface NodeTypeConfig {
  icon: LucideIcon;
  label: string;
  cssClass: string;
}

export const NODE_TYPE_CONFIG: Record<ProcessStepType, NodeTypeConfig> = {
  trigger: { icon: Play, label: 'Trigger', cssClass: 'trigger' },
  action: { icon: Circle, label: 'Action', cssClass: 'action' },
  condition: { icon: GitBranch, label: 'Condition', cssClass: 'condition' },
  approval: { icon: CheckCircle, label: 'Approval', cssClass: 'approval' },
  notification: { icon: Bell, label: 'Notification', cssClass: 'notification' },
  end: { icon: Square, label: 'End', cssClass: 'end' },
};

// --- Chat Types ---

export interface WorkflowMutation {
  type:
    | 'add_node'
    | 'remove_node'
    | 'update_node'
    | 'add_edge'
    | 'remove_edge'
    | 'reorder'
    | 'bulk';
  before: { nodes: ProcessNode[]; edges: ProcessEdge[] };
  after: { nodes: ProcessNode[]; edges: ProcessEdge[] };
  description: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  mutation?: WorkflowMutation;
}

// --- Workflow Persistence ---

export interface WorkflowProcess {
  id: string;
  name: string;
  description: string | null;
  category: string;
  nodes: ProcessNode[];
  edges: ProcessEdge[];
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowProcessTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  complexity: 'simple' | 'medium' | 'advanced';
  nodes: ProcessNode[];
  edges: ProcessEdge[];
  preview_steps: string[] | null;
  tags: string[] | null;
  is_system: boolean;
  created_at: string;
}

// --- Undo/Redo ---

export interface WorkflowSnapshot {
  nodes: ProcessNode[];
  edges: ProcessEdge[];
  timestamp: Date;
  description: string;
}

// --- API Response Types ---

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
