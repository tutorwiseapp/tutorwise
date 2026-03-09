import type { Node, Edge } from 'reactflow';
import type { LucideIcon } from 'lucide-react';
import {
  Play,
  Circle,
  GitBranch,
  CheckCircle,
  Bell,
  Square,
  Layers,
  Brain,
  Users,
} from 'lucide-react';

// --- Node Types ---

export const PROCESS_STEP_TYPES = [
  'trigger',
  'action',
  'condition',
  'approval',
  'notification',
  'end',
  'subprocess',
  'agent',
  'team',
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
  externalUrl?: string;
  // Subprocess-specific fields
  stepCount?: number;
  templateId?: string;
  templateName?: string;
  // Agent/Team-specific fields
  agentSlug?: string;
  teamSlug?: string;
  teamPattern?: 'supervisor' | 'pipeline' | 'swarm';
  outputField?: string;
  promptTemplate?: string;
  // Execution metadata — ignored at design time, used by PlatformWorkflowRuntime
  handler?: string;                                           // e.g. "stripe.connect_payout"
  handler_config?: Record<string, unknown>;                   // e.g. { threshold: 70, template: "tutor_approved" }
  completion_mode?: 'sync' | 'webhook' | 'hitl' | 'ai_session';
  assigned_role?: string;                                     // "admin" | "tutor" | "client" | "automated"
  retry_limit?: number;                                       // defaults to 3
  timeout_minutes?: number;                                   // max time before auto-fail
}

export type ProcessNode = Node<ProcessStepData>;

export interface ProcessEdgeData {
  label?: string;        // Optional branch label (e.g. "Yes", "No", "If approved")
  animated?: boolean;
}

export type ProcessEdge = Edge<ProcessEdgeData>;

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
  subprocess: { icon: Layers, label: 'Subprocess', cssClass: 'subprocess' },
  agent: { icon: Brain, label: 'Specialist Agent', cssClass: 'agent' },
  team: { icon: Users, label: 'Agent Team', cssClass: 'team' },
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
  draft_nodes?: ProcessNode[] | null;
  draft_edges?: ProcessEdge[] | null;
  execution_mode?: 'design' | 'shadow' | 'live';
  current_version?: number;
  published_at?: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowProcessVersion {
  id: string;
  process_id: string;
  version_number: number;
  nodes: ProcessNode[];
  edges: ProcessEdge[];
  published_by: string | null;
  published_at: string;
  notes: string | null;
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
